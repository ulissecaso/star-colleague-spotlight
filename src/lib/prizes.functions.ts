import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Accesso negato: serve ruolo admin");
}

async function getOrCreateCurrentPeriod() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date();
  const anno = now.getFullYear();
  const mese = now.getMonth() + 1;
  const { data: existing } = await supabaseAdmin
    .from("voting_periods")
    .select("*")
    .eq("anno", anno)
    .eq("mese", mese)
    .maybeSingle();
  if (existing) return existing;
  const { data: inserted } = await supabaseAdmin
    .from("voting_periods")
    .insert({ anno, mese, status: "open" })
    .select()
    .single();
  return inserted!;
}

async function signUrl(path: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage
    .from("prize-images")
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days
  return data?.signedUrl ?? null;
}

// === Public: get current prize (used by login page) ===
export const getCurrentPrize = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const period = await getOrCreateCurrentPeriod();
  const { data } = await supabaseAdmin
    .from("monthly_prizes")
    .select("*")
    .eq("period_id", period.id)
    .maybeSingle();
  if (!data) return { prize: null };
  const url = await signUrl(data.image_path);
  return {
    prize: {
      titolo: data.titolo,
      descrizione: data.descrizione,
      image_url: url,
      anno: period.anno,
      mese: period.mese,
    },
  };
});

// === Admin: set prize (uploads image bytes + saves metadata) ===
export const setCurrentPrize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    fileBase64: string;
    fileName: string;
    contentType: string;
    titolo?: string;
    descrizione?: string;
  }) =>
    z
      .object({
        fileBase64: z.string().min(10),
        fileName: z.string().min(1).max(200),
        contentType: z.string().min(1).max(100),
        titolo: z.string().max(200).optional(),
        descrizione: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const period = await getOrCreateCurrentPeriod();

    const ext = data.fileName.split(".").pop() || "jpg";
    const path = `${period.anno}-${String(period.mese).padStart(2, "0")}/${crypto.randomUUID()}.${ext}`;
    const bytes = Buffer.from(data.fileBase64, "base64");

    const { error: upErr } = await supabaseAdmin.storage
      .from("prize-images")
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (upErr) throw new Error("Errore caricamento immagine: " + upErr.message);

    // Remove previous image if exists
    const { data: existing } = await supabaseAdmin
      .from("monthly_prizes")
      .select("image_path")
      .eq("period_id", period.id)
      .maybeSingle();
    if (existing?.image_path && existing.image_path !== path) {
      await supabaseAdmin.storage.from("prize-images").remove([existing.image_path]);
    }

    await supabaseAdmin
      .from("monthly_prizes")
      .upsert(
        {
          period_id: period.id,
          image_path: path,
          titolo: data.titolo ?? null,
          descrizione: data.descrizione ?? null,
        },
        { onConflict: "period_id" },
      );

    return { ok: true };
  });

// === Admin: delete current prize ===
export const deleteCurrentPrize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const period = await getOrCreateCurrentPeriod();
    const { data: existing } = await supabaseAdmin
      .from("monthly_prizes")
      .select("image_path")
      .eq("period_id", period.id)
      .maybeSingle();
    if (existing?.image_path) {
      await supabaseAdmin.storage.from("prize-images").remove([existing.image_path]);
    }
    await supabaseAdmin.from("monthly_prizes").delete().eq("period_id", period.id);
    return { ok: true };
  });
