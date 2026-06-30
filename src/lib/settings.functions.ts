import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Accesso negato: serve ruolo admin");
}

export const listOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { tipo: string }) => z.object({ tipo: z.enum(["reparto", "negozio"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("app_options")
      .select("*")
      .eq("tipo", data.tipo)
      .order("valore");
    return { options: rows ?? [] };
  });

export const addOption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { tipo: string; valore: string }) =>
    z.object({ tipo: z.enum(["reparto", "negozio"]), valore: z.string().min(1).max(100) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_options").insert({ tipo: data.tipo, valore: data.valore.trim() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_options").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
