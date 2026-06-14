import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Accesso negato: serve ruolo admin");
}

export const adminBootstrap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) === 0) {
      await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
      return { granted: true };
    }
    const { data: mine } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { granted: !!mine };
  });

export const listEmployees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("employees").select("*").order("cognome");
    return { employees: data ?? [] };
  });

export const upsertEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string;
    nome: string;
    cognome: string;
    telefono?: string;
    codice_accesso: string;
    mansione: string;
    negozio: string;
    reparto?: string;
    data_assunzione?: string;
    foto_url?: string;
    attivo: boolean;
    escluso_premi: boolean;
    motivo_esclusione?: string;
  }) =>
    z
      .object({
        id: z.string().uuid().optional(),
        nome: z.string().min(1).max(80),
        cognome: z.string().min(1).max(80),
        telefono: z.string().max(40).optional(),
        codice_accesso: z.string().min(3).max(40),
        mansione: z.string().min(1).max(80),
        negozio: z.string().min(1).max(80),
        reparto: z.string().max(80).optional(),
        data_assunzione: z.string().optional(),
        foto_url: z.string().url().optional().or(z.literal("")),
        attivo: z.boolean(),
        escluso_premi: z.boolean(),
        motivo_esclusione: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      ...data,
      codice_accesso: data.codice_accesso.trim().toUpperCase(),
      foto_url: data.foto_url || null,
      data_assunzione: data.data_assunzione || null,
      reparto: data.reparto || null,
      motivo_esclusione: data.motivo_esclusione || null,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("employees").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("employees").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("employees").delete().eq("id", data.id);
    return { ok: true };
  });

export const importEmployeesCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { rows: Array<Record<string, string>> }) =>
    z.object({ rows: z.array(z.record(z.string(), z.string())).min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const norm = (s?: string) => (s ?? "").trim();
    let ok = 0, fail = 0;
    const errors: string[] = [];
    for (const r of data.rows) {
      try {
        const codice = norm(r.codice_accesso || r.codice || r.Codice).toUpperCase();
        if (!codice) throw new Error("codice mancante");
        const payload = {
          nome: norm(r.nome || r.Nome),
          cognome: norm(r.cognome || r.Cognome),
          telefono: norm(r.telefono || r.Telefono) || null,
          codice_accesso: codice,
          mansione: norm(r.mansione || r.Mansione) || "Non specificata",
          negozio: norm(r.negozio || r.Negozio) || "Non specificato",
          reparto: norm(r.reparto || r.Reparto) || null,
          data_assunzione: norm(r.data_assunzione || r.dataAssunzione) || null,
          foto_url: norm(r.foto_url || r.foto) || null,
          attivo: true,
          escluso_premi: false,
        };
        if (!payload.nome || !payload.cognome) throw new Error("nome/cognome mancanti");
        const { error } = await supabaseAdmin.from("employees").upsert(payload, { onConflict: "codice_accesso" });
        if (error) throw new Error(error.message);
        ok++;
      } catch (e) {
        fail++;
        errors.push(`Riga ${ok + fail}: ${(e as Error).message}`);
      }
    }
    return { ok, fail, errors: errors.slice(0, 20) };
  });

export const listPeriods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("voting_periods").select("*").order("anno", { ascending: false }).order("mese", { ascending: false });
    return { periods: data ?? [] };
  });

export const togglePeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "open" | "closed" }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["open", "closed"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("voting_periods").update({ status: data.status }).eq("id", data.id);
    return { ok: true };
  });

export const addDisciplinary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { employee_id: string; descrizione: string; penalita: number }) =>
    z.object({ employee_id: z.string().uuid(), descrizione: z.string().min(1).max(500), penalita: z.number().int().min(1).max(10) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("disciplinary_actions").insert(data);
    return { ok: true };
  });
