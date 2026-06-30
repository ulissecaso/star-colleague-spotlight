import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Accesso negato: serve ruolo admin");
}

export type EmployeeParticipation = {
  id: string;
  nome: string;
  cognome: string;
  mansione: string;
  negozio: string;
  voted: number;
  total: number;
  pct: number;
};

export type ParticipationBreakdown = {
  notStarted: EmployeeParticipation[];   // 0 voti
  underThreshold: EmployeeParticipation[]; // > 0 ma < 51%
  overThreshold: EmployeeParticipation[];  // >= 51% ma < 100%
  complete: EmployeeParticipation[];       // 100%
};

export const getParticipationBreakdown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ParticipationBreakdown> => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Periodo attivo
    const { data: period } = await supabaseAdmin
      .from("voting_periods")
      .select("id")
      .eq("status", "open")
      .maybeSingle();

    if (!period) {
      return { notStarted: [], underThreshold: [], overThreshold: [], complete: [] };
    }

    // Dipendenti attivi
    const { data: employees } = await supabaseAdmin
      .from("employees")
      .select("id, nome, cognome, mansione, negozio")
      .eq("attivo", true)
      .order("cognome");

    const allEmployees = employees ?? [];
    const totalColleagues = allEmployees.length - 1; // esclude se stesso

    if (totalColleagues <= 0) {
      return { notStarted: [], underThreshold: [], overThreshold: [], complete: [] };
    }

    // Voti espressi nel periodo: conta votee distinti per voter
    const { data: voteRows } = await supabaseAdmin
      .from("votes")
      .select("voter_id, votee_id")
      .eq("period_id", period.id);

    // Mappa voter_id -> Set di votee_id (distinti)
    const votedMap: Record<string, Set<string>> = {};
    for (const v of voteRows ?? []) {
      if (!votedMap[v.voter_id]) votedMap[v.voter_id] = new Set();
      votedMap[v.voter_id].add(v.votee_id);
    }

    const notStarted: EmployeeParticipation[] = [];
    const underThreshold: EmployeeParticipation[] = [];
    const overThreshold: EmployeeParticipation[] = [];
    const complete: EmployeeParticipation[] = [];

    for (const emp of allEmployees) {
      const voted = votedMap[emp.id]?.size ?? 0;
      const pct = Math.round((voted / totalColleagues) * 100);
      const entry: EmployeeParticipation = {
        id: emp.id,
        nome: emp.nome ?? "",
        cognome: emp.cognome ?? "",
        mansione: emp.mansione ?? "",
        negozio: emp.negozio ?? "",
        voted,
        total: totalColleagues,
        pct,
      };

      if (voted === 0) {
        notStarted.push(entry);
      } else if (voted >= totalColleagues) {
        complete.push(entry);
      } else if (pct >= 51) {
        overThreshold.push(entry);
      } else {
        underThreshold.push(entry);
      }
    }

    return { notStarted, underThreshold, overThreshold, complete };
  });
