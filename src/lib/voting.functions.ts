// ===== AGGIUNTA IN FONDO A src/lib/voting.functions.ts =====

export const resetPeriodVotes = createServerFn({ method: "POST" })
  .inputValidator((d: { periodId: string }) =>
    z.object({ periodId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Cancella in ordine per rispettare i vincoli FK
    await supabaseAdmin.from("vote_audit").delete().eq("period_id", data.periodId);
    await supabaseAdmin.from("vote_comments").delete().eq("period_id", data.periodId);
    await supabaseAdmin.from("vote_skips").delete().eq("period_id", data.periodId);
    await supabaseAdmin.from("company_votes").delete().eq("period_id", data.periodId);
    const { error } = await supabaseAdmin.from("votes").delete().eq("period_id", data.periodId);
    if (error) throw new Error("Errore nella cancellazione: " + error.message);
    return { ok: true };
  });
