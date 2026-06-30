import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const COMPANY_CRITERI = [
  { key: "azienda", label: "Azienda", desc: "Quanto sei soddisfatto di lavorare qui" },
  { key: "orgoglio", label: "Orgoglio", desc: "Ti senti orgoglioso di far parte dell'azienda" },
  { key: "organizzazione", label: "Organizzazione", desc: "Il lavoro è organizzato in modo chiaro ed efficace" },
  { key: "strumenti", label: "Strumenti di lavoro", desc: "Hai strumenti e risorse adeguati per lavorare bene" },
  { key: "carico_lavoro", label: "Carico di lavoro", desc: "Il carico di lavoro è equilibrato e sostenibile" },
  { key: "collaborazione_reparti", label: "Collaborazione tra reparti", desc: "Vendita, logistica, amministrazione e reparti collaborano bene" },
  { key: "comunicazione", label: "Comunicazione", desc: "Le informazioni arrivano in modo chiaro e nei tempi giusti" },
  { key: "ascolto", label: "Ascolto", desc: "Ti senti ascoltato quando proponi idee o segnali problemi" },
  { key: "clima", label: "Clima lavorativo", desc: "L'ambiente di lavoro è positivo e rispettoso" },
  { key: "fiducia_futuro", label: "Fiducia nel futuro", desc: "Hai fiducia nella direzione e nella crescita dell'azienda" },
] as const;

const CRITERI_KEYS = COMPANY_CRITERI.map((c) => c.key);

async function requireEmployee(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: emp } = await supabaseAdmin
    .from("employees")
    .select("*")
    .eq("session_token", token)
    .eq("attivo", true)
    .maybeSingle();
  if (!emp) throw new Error("Sessione scaduta");
  return emp;
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

// === Status: ha già votato l'azienda questo mese? ===
export const getCompanyVoteStatus = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireEmployee(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const period = await getOrCreateCurrentPeriod();
    const { data: existing } = await supabaseAdmin
      .from("company_votes")
      .select("id")
      .eq("voter_id", me.id)
      .eq("period_id", period.id)
      .limit(1);
    return {
      period: { id: period.id, anno: period.anno, mese: period.mese, status: period.status },
      alreadyVoted: (existing ?? []).length > 0,
    };
  });

// === Invio voto azienda ===
export const submitCompanyVote = createServerFn({ method: "POST" })
  .validator((d: {
    token: string;
    scores: Record<string, number>;
    commento?: string;
    deviceId?: string;
  }) =>
    z.object({
      token: z.string(),
      scores: z.record(z.string(), z.number().int().min(1).max(5)),
      commento: z.string().max(1000).optional(),
      deviceId: z.string().max(128).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const me = await requireEmployee(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const period = await getOrCreateCurrentPeriod();
    if (period.status === "closed") throw new Error("Periodo di voto chiuso");

    for (const k of CRITERI_KEYS) {
      if (typeof data.scores[k] !== "number") {
        throw new Error("Compila tutte le valutazioni");
      }
    }

    const rows = CRITERI_KEYS.map((k, idx) => ({
      period_id: period.id,
      voter_id: me.id,
      criterio: k,
      punteggio: data.scores[k],
      commento: idx === 0 ? (data.commento ?? null) : null,
      device_fingerprint: data.deviceId ?? null,
    }));

    const { error } = await supabaseAdmin.from("company_votes").insert(rows);
    if (error) {
      if (error.code === "23505") throw new Error("Hai già valutato l'azienda questo mese");
      throw new Error("Errore nel salvare la valutazione");
    }
    return { ok: true };
  });

// === Risultati aziendali (admin) ===
export const getCompanyResults = createServerFn({ method: "POST" })
  .validator((d: { periodId?: string }) =>
    z.object({ periodId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const period = data.periodId
      ? (await supabaseAdmin.from("voting_periods").select("*").eq("id", data.periodId).maybeSingle()).data
      : await getOrCreateCurrentPeriod();
    if (!period) throw new Error("Periodo non trovato");

    const { data: votes } = await supabaseAdmin
      .from("company_votes")
      .select("criterio, punteggio, commento, voter_id")
      .eq("period_id", period.id);

    const { data: employees } = await supabaseAdmin
      .from("employees")
      .select("id")
      .eq("attivo", true);

    const totalEmployees = employees?.length ?? 0;
    const voterSet = new Set((votes ?? []).map((v) => v.voter_id));
    const participants = voterSet.size;

    const agg = new Map<string, { sum: number; count: number }>();
    for (const v of votes ?? []) {
      const a = agg.get(v.criterio) ?? { sum: 0, count: 0 };
      a.sum += v.punteggio;
      a.count++;
      agg.set(v.criterio, a);
    }

    const perCriterio = COMPANY_CRITERI.map((c) => {
      const a = agg.get(c.key);
      const media = a && a.count > 0 ? a.sum / a.count : 0;
      return {
        key: c.key,
        label: c.label,
        media: Math.round(media * 100) / 100,
        score: Math.round((media / 5) * 100 * 10) / 10,
        count: a?.count ?? 0,
      };
    });

    const overallAvg =
      perCriterio.length > 0 && perCriterio.some((p) => p.count > 0)
        ? perCriterio.reduce((s, p) => s + p.media, 0) / perCriterio.filter((p) => p.count > 0).length
        : 0;

    const commenti = (votes ?? [])
      .filter((v) => v.commento && v.commento.trim().length > 0)
      .map((v) => v.commento as string);

    return {
      period,
      totalEmployees,
      participants,
      participationPct:
        totalEmployees > 0 ? Math.round((participants / totalEmployees) * 100) : 0,
      overallScore: Math.round((overallAvg / 5) * 100 * 10) / 10,
      perCriterio,
      commenti,
    };
  });
