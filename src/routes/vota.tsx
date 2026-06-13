import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Check, ChevronRight, X, Star, Building2 } from "lucide-react";
import { getColleagues, toggleSkip } from "@/lib/voting.functions";
import { getSession } from "@/lib/employee-session";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { BottomNav } from "@/components/BottomNav";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/vota")({
  head: () => ({ meta: [{ title: "Vota i tuoi colleghi" }] }),
  component: VotaPage,
});

const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

function VotaPage() {
  const navigate = useNavigate();
  const fetchColleagues = useServerFn(getColleagues);
  const skipFn = useServerFn(toggleSkip);
  const qc = useQueryClient();
  const session = typeof window !== "undefined" ? getSession() : null;

  useEffect(() => {
    if (typeof window !== "undefined" && !getSession()) navigate({ to: "/" });
  }, [navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["colleagues", session?.id],
    queryFn: () => fetchColleagues({ data: { token: session!.session_token } }),
    enabled: !!session,
  });

  const grouped = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, typeof data.colleagues>();
    for (const c of data.colleagues) {
      if (!map.has(c.mansione)) map.set(c.mansione, []);
      map.get(c.mansione)!.push(c);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  const voted = data?.colleagues.filter((c) => c.voted).length ?? 0;
  const total = data?.colleagues.length ?? 0;
  const minRequired = Math.ceil(total / 2);
  const mancanti = Math.max(0, minRequired - voted);
  const pct = total > 0 ? (voted / total) * 100 : 0;
  const reachedMin = voted >= minRequired;

  async function onToggleSkip(id: string, skip: boolean) {
    try {
      await skipFn({ data: { token: session!.session_token, votedId: id, skip } });
      qc.invalidateQueries({ queryKey: ["colleagues", session?.id] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <main className="min-h-dvh bg-background pb-24">
      <header className="bg-gradient-hero text-primary-foreground px-5 pt-8 pb-10 rounded-b-3xl shadow-card">
        <p className="text-xs uppercase tracking-widest text-primary-foreground/70">
          {session?.nome} • {data?.period && `${MESI[data.period.mese - 1]} ${data.period.anno}`}
        </p>
        <h1 className="text-3xl font-bold mt-2">Vota i colleghi</h1>
        <p className="text-sm text-primary-foreground/80 mt-1">
          Vota solo chi conosci bene. Minimo: <strong>{minRequired}</strong> su {total} (50%).
        </p>
        <div className="mt-6 bg-primary-foreground/15 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex justify-between text-sm mb-2">
            <span>{reachedMin ? "Soglia minima raggiunta ✓" : "Avanzamento voti"}</span>
            <span className="font-semibold">{voted}/{total}</span>
          </div>
          <Progress value={pct} className="h-2 bg-primary-foreground/20" />
          <p className="text-xs text-primary-foreground/80 mt-2">
            {reachedMin
              ? "Ottimo! Puoi continuare o terminare qui."
              : mancanti === 1
                ? "Vota almeno 1 altro collega per completare."
                : `Vota almeno altri ${mancanti} colleghi per completare.`}
          </p>
        </div>
      </header>

      <div className="px-5 mt-6 space-y-7 max-w-md mx-auto">
        {isLoading && <p className="text-muted-foreground text-center py-10">Caricamento…</p>}
        {grouped.map(([mansione, list]) => (
          <section key={mansione}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
              {mansione}
            </h2>
            <ul className="space-y-2">
              {list.map((c) => {
                const dim = c.skipped || c.voted;
                return (
                  <li
                    key={c.id}
                    className={`flex items-center gap-3 bg-card rounded-2xl p-3 shadow-soft transition-all ${
                      dim ? "opacity-60" : ""
                    }`}
                  >
                    <EmployeeAvatar nome={c.nome} cognome={c.cognome} foto_url={c.foto_url} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {c.nome} {c.cognome}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{c.negozio}</p>
                    </div>

                    {c.voted ? (
                      <span className="flex items-center gap-1 text-success text-xs font-medium px-2.5 py-1 rounded-full bg-success/10">
                        <Check className="size-3.5" /> Votato
                      </span>
                    ) : c.skipped ? (
                      <button
                        type="button"
                        onClick={() => onToggleSkip(c.id, false)}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/70"
                      >
                        Annulla
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleSkip(c.id, true)}
                          aria-label="Non votare"
                          className="size-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/70 active:scale-95 transition flex items-center justify-center"
                        >
                          <X className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate({ to: "/vota/$id", params: { id: c.id } })}
                          aria-label="Vota"
                          className="h-9 px-3 rounded-full bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition flex items-center gap-1 text-sm font-medium"
                        >
                          <Star className="size-4" /> Vota
                          <ChevronRight className="size-4 -mr-1" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {!isLoading && grouped.length === 0 && (
          <p className="text-center text-muted-foreground py-10">Nessun collega da votare al momento.</p>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
