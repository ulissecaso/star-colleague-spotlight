import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CRITERI = [
  "collaborazione",
  "professionalita",
  "affidabilita",
  "disponibilita",
  "atteggiamento_positivo",
  "comunicazione",
  "problem_solving",
  "spirito_aziendale",
] as const;

// === Employee login with access code ===
export const employeeLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { codice: string; deviceId: string }) =>
    z.object({ codice: z.string().min(1).max(64), deviceId: z.string().min(1).max(128) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const codice = data.codice.trim().toUpperCase();

    const { data: emp, error } = await supabaseAdmin
      .from("employees")
      .select("*")
      .eq("codice_accesso", codice)
      .maybeSingle();

    if (error) throw new Error("Errore di sistema");
    if (!emp) throw new Error("Codice non valido");
    if (!emp.attivo) throw new Error("Account non attivo. Contatta l'amministratore.");

    const token = crypto.randomUUID() + "-" + crypto.randomUUID();
    const update: {
      session_token: string;
      device_id: string;
      primo_accesso_at?: string;
    } = {
      session_token: token,
      device_id: emp.device_id ?? data.deviceId,
    };
    if (!emp.primo_accesso_at) update.primo_accesso_at = new Date().toISOString();

    await supabaseAdmin.from("employees").update(update).eq("id", emp.id);

    return {
      session: {
        id: emp.id,
        nome: emp.nome,
        cognome: emp.cognome,
        mansione: emp.mansione,
        negozio: emp.negozio,
        session_token: token,
      },
    };
  });

// === Validate session ===
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

// === List colleagues to vote ===
export const getColleagues = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireEmployee(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const period = await getOrCreateCurrentPeriod();

    const { data: colleagues } = await supabaseAdmin
      .from("employees")
      .select("id, nome, cognome, mansione, negozio, foto_url")
      .eq("attivo", true)
      .neq("id", me.id)
      .order("mansione")
      .order("cognome");

    const { data: myVotes } = await supabaseAdmin
      .from("votes")
      .select("voted_id")
      .eq("voter_id", me.id)
      .eq("period_id", period.id);

    const votedSet = new Set((myVotes ?? []).map((v) => v.voted_id));
    return {
      period: { id: period.id, anno: period.anno, mese: period.mese },
      colleagues: (colleagues ?? []).map((c) => ({ ...c, voted: votedSet.has(c.id) })),
    };
  });

// === Get colleague detail ===
export const getColleague = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string }) =>
    z.object({ token: z.string(), id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const me = await requireEmployee(data.token);
    if (me.id === data.id) throw new Error("Non puoi votare te stesso");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await supabaseAdmin
      .from("employees")
      .select("id, nome, cognome, mansione, negozio, foto_url, attivo")
      .eq("id", data.id)
      .maybeSingle();
    if (!c || !c.attivo) throw new Error("Collega non trovato");
    const period = await getOrCreateCurrentPeriod();
    const { data: existing } = await supabaseAdmin
      .from("votes")
      .select("voted_id")
      .eq("voter_id", me.id)
      .eq("voted_id", data.id)
      .eq("period_id", period.id)
      .limit(1);
    return { colleague: c, alreadyVoted: (existing ?? []).length > 0 };
  });

// === Submit vote ===
export const submitVote = createServerFn({ method: "POST" })
  .inputValidator((d: {
    token: string;
    votedId: string;
    scores: Record<string, number>;
    puntoForza?: string;
    suggerimento?: string;
    deviceId?: string;
  }) =>
    z
      .object({
        token: z.string(),
        votedId: z.string().uuid(),
        scores: z.record(z.string(), z.number().int().min(1).max(5)),
        puntoForza: z.string().max(500).optional(),
        suggerimento: z.string().max(500).optional(),
        deviceId: z.string().max(128).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const me = await requireEmployee(data.token);
    if (me.id === data.votedId) throw new Error("Non puoi votare te stesso");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const period = await getOrCreateCurrentPeriod();
    if (period.status === "closed") throw new Error("Periodo di voto chiuso");

    // Verify all criteria present
    for (const c of CRITERI) {
      if (typeof data.scores[c] !== "number") {
        throw new Error("Compila tutti i criteri");
      }
    }

    const rows = CRITERI.map((criterio) => ({
      period_id: period.id,
      voter_id: me.id,
      voted_id: data.votedId,
      criterio,
      punteggio: data.scores[criterio],
      device_fingerprint: data.deviceId ?? null,
    }));

    const { error } = await supabaseAdmin.from("votes").insert(rows);
    if (error) {
      if (error.code === "23505") throw new Error("Hai già votato questo collega questo mese");
      throw new Error("Errore nel salvare il voto");
    }

    if (data.puntoForza || data.suggerimento) {
      await supabaseAdmin.from("vote_comments").upsert({
        period_id: period.id,
        voter_id: me.id,
        voted_id: data.votedId,
        punto_forza: data.puntoForza ?? null,
        suggerimento: data.suggerimento ?? null,
      });
    }

    await supabaseAdmin.from("vote_audit").insert({
      period_id: period.id,
      voter_id: me.id,
      voted_id: data.votedId,
      event: "vote_submitted",
      meta: { device: data.deviceId ?? null },
    });

    return { ok: true };
  });

// === Leaderboards ===
export const getLeaderboards = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; periodId?: string }) =>
    z.object({ token: z.string(), periodId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireEmployee(data.token);
    return computeLeaderboards(data.periodId);
  });

export const getAdminLeaderboards = createServerFn({ method: "POST" })
  .inputValidator((d: { periodId?: string }) =>
    z.object({ periodId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data }) => computeLeaderboards(data.periodId));

async function computeLeaderboards(periodId?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const period = periodId
    ? (await supabaseAdmin.from("voting_periods").select("*").eq("id", periodId).maybeSingle()).data
    : await getOrCreateCurrentPeriod();
  if (!period) throw new Error("Periodo non trovato");

  const { data: votes } = await supabaseAdmin
    .from("votes")
    .select("voted_id, punteggio")
    .eq("period_id", period.id);

  const { data: employees } = await supabaseAdmin
    .from("employees")
    .select("id, nome, cognome, mansione, negozio, foto_url, escluso_premi, attivo")
    .eq("attivo", true);

  const stats = new Map<string, { sum: number; count: number }>();
  for (const v of votes ?? []) {
    const s = stats.get(v.voted_id) ?? { sum: 0, count: 0 };
    s.sum += v.punteggio;
    s.count += 1;
    stats.set(v.voted_id, s);
  }

  const rows = (employees ?? []).map((e) => {
    const s = stats.get(e.id);
    const media = s && s.count > 0 ? s.sum / s.count : 0;
    // TEAM SCORE: media 1-5 → 0-100
    const teamScore = Math.round((media / 5) * 100 * 10) / 10;
    return {
      employee: e,
      media: Math.round(media * 100) / 100,
      teamScore,
      votesReceived: s?.count ?? 0,
    };
  });

  rows.sort((a, b) => b.teamScore - a.teamScore || b.votesReceived - a.votesReceived);

  const byStore = new Map<string, typeof rows>();
  const byRole = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!byStore.has(r.employee.negozio)) byStore.set(r.employee.negozio, []);
    byStore.get(r.employee.negozio)!.push(r);
    if (!byRole.has(r.employee.mansione)) byRole.set(r.employee.mansione, []);
    byRole.get(r.employee.mansione)!.push(r);
  }

  return {
    period,
    overall: rows.slice(0, 10),
    byStore: Array.from(byStore.entries()).map(([store, list]) => ({ store, list: list.slice(0, 5) })),
    byRole: Array.from(byRole.entries()).map(([role, list]) => ({ role, list: list.slice(0, 5) })),
    all: rows,
  };
}

// === Admin dashboard ===
export const getDashboard = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const period = await getOrCreateCurrentPeriod();

  const { data: employees } = await supabaseAdmin
    .from("employees")
    .select("id, mansione, negozio")
    .eq("attivo", true);

  const total = employees?.length ?? 0;
  // Soglia minima: ogni votante deve valutare almeno il 50% dei colleghi (arrotondato per eccesso)
  const totalColleagues = Math.max(0, total - 1);
  const minRequiredPerVoter = Math.ceil(totalColleagues / 2);

  const { data: voters } = await supabaseAdmin
    .from("votes")
    .select("voter_id, voted_id")
    .eq("period_id", period.id);

  // voters who have voted at least once
  const votedPairs = new Set((voters ?? []).map((v) => `${v.voter_id}:${v.voted_id}`));
  const completionByVoter = new Map<string, number>();
  for (const p of votedPairs) {
    const voter = p.split(":")[0];
    completionByVoter.set(voter, (completionByVoter.get(voter) ?? 0) + 1);
  }

  let fullyDone = 0;
  for (const v of completionByVoter.values()) {
    if (v >= expectedVotesPerVoter) fullyDone++;
  }

  const completion = total > 0 ? Math.round((fullyDone / total) * 100) : 0;

  // Average per store
  const { data: allVotes } = await supabaseAdmin
    .from("votes")
    .select("voted_id, punteggio")
    .eq("period_id", period.id);

  const empMap = new Map((employees ?? []).map((e) => [e.id, e]));
  const storeAgg = new Map<string, { sum: number; count: number }>();
  const roleAgg = new Map<string, { sum: number; count: number }>();
  for (const v of allVotes ?? []) {
    const e = empMap.get(v.voted_id);
    if (!e) continue;
    const s = storeAgg.get(e.negozio) ?? { sum: 0, count: 0 };
    s.sum += v.punteggio;
    s.count++;
    storeAgg.set(e.negozio, s);
    const r = roleAgg.get(e.mansione) ?? { sum: 0, count: 0 };
    r.sum += v.punteggio;
    r.count++;
    roleAgg.set(e.mansione, r);
  }

  const overall =
    allVotes && allVotes.length > 0
      ? allVotes.reduce((s, v) => s + v.punteggio, 0) / allVotes.length
      : 0;

  return {
    period,
    totalEmployees: total,
    completion,
    fullyDone,
    overallTeamScore: Math.round((overall / 5) * 100 * 10) / 10,
    byStore: Array.from(storeAgg.entries()).map(([k, v]) => ({
      label: k,
      teamScore: Math.round((v.sum / v.count / 5) * 100 * 10) / 10,
      votes: v.count,
    })),
    byRole: Array.from(roleAgg.entries()).map(([k, v]) => ({
      label: k,
      teamScore: Math.round((v.sum / v.count / 5) * 100 * 10) / 10,
      votes: v.count,
    })),
  };
});

// === Calculate winners ===
export const calculateWinners = createServerFn({ method: "POST" })
  .inputValidator((d: { periodId: string }) =>
    z.object({ periodId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: period } = await supabaseAdmin
      .from("voting_periods")
      .select("*")
      .eq("id", data.periodId)
      .single();

    const lb = await computeLeaderboards(data.periodId);

    // Filter: not excluded, completed all votes
    const { data: employees } = await supabaseAdmin.from("employees").select("id, escluso_premi").eq("attivo", true);
    const excludedSet = new Set((employees ?? []).filter((e) => e.escluso_premi).map((e) => e.id));

    const eligible = lb.all.filter((r) => !excludedSet.has(r.employee.id) && r.votesReceived > 0);
    const winner = eligible[0];

    if (winner) {
      await supabaseAdmin.from("monthly_winners").upsert({
        period_id: data.periodId,
        employee_id: winner.employee.id,
        team_score: winner.teamScore,
        categoria: "aziendale",
        scope_value: null,
      });
    }

    // Per-store winners
    const stores = new Set(eligible.map((e) => e.employee.negozio));
    for (const store of stores) {
      const top = eligible.find((e) => e.employee.negozio === store);
      if (top) {
        await supabaseAdmin.from("monthly_winners").upsert({
          period_id: data.periodId,
          employee_id: top.employee.id,
          team_score: top.teamScore,
          categoria: "negozio",
          scope_value: store,
        });
      }
    }

    // Per-role winners
    const roles = new Set(eligible.map((e) => e.employee.mansione));
    for (const role of roles) {
      const top = eligible.find((e) => e.employee.mansione === role);
      if (top) {
        await supabaseAdmin.from("monthly_winners").upsert({
          period_id: data.periodId,
          employee_id: top.employee.id,
          team_score: top.teamScore,
          categoria: "mansione",
          scope_value: role,
        });
      }
    }

    return { ok: true, winner: winner?.employee, period };
  });

export const getWinners = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: winners } = await supabaseAdmin
    .from("monthly_winners")
    .select("*, employees(nome, cognome, mansione, negozio, foto_url), voting_periods(anno, mese)")
    .order("created_at", { ascending: false })
    .limit(50);
  return { winners: winners ?? [] };
});
