import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Check, ChevronRight } from "lucide-react";
import { getColleagues } from "@/lib/voting.functions";
import { getSession } from "@/lib/employee-session";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { BottomNav } from "@/components/BottomNav";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/vota")({
  head: () => ({ meta: [{ title: "Vota i tuoi colleghi" }] }),
  component: VotaPage,
});

const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

function VotaPage() {
  const navigate = useNavigate();
  const fetchColleagues = useServerFn(getColleagues);
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

  const completed = data?.colleagues.filter((c) => c.voted).length ?? 0;
  const total = data?.colleagues.length ?? 0;
  const minRequired = Math.ceil(total / 2);
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const minPct = total > 0 ? (minRequired / total) * 100 : 0;
  const reachedMin = completed >= minRequired;

  return (
    <main className="min-h-dvh bg-background pb-24">
      <header className="bg-gradient-hero text-primary-foreground px-5 pt-8 pb-10 rounded-b-3xl shadow-card">
        <p className="text-xs uppercase tracking-widest text-primary-foreground/70">
          {session?.nome} • {data?.period && `${MESI[data.period.mese - 1]} ${data.period.anno}`}
        </p>
        <h1 className="text-3xl font-bold mt-2">Vota i colleghi</h1>
        <p className="text-sm text-primary-foreground/80 mt-1">
          Vota solo i colleghi che conosci bene. Minimo richiesto: <strong>{minRequired}</strong> su {total} (50%).
        </p>
        <div className="mt-6 bg-primary-foreground/15 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex justify-between text-sm mb-2">
            <span>{reachedMin ? "Soglia minima raggiunta ✓" : "Avanzamento"}</span>
            <span className="font-semibold">{completed}/{total}</span>
          </div>
          <div className="relative">
            <Progress value={pct} className="h-2 bg-primary-foreground/20" />
            {total > 0 && !reachedMin && (
              <div
                className="absolute top-0 h-2 w-0.5 bg-gold"
                style={{ left: `${minPct}%` }}
                title="Soglia 50%"
              />
            )}
          </div>
          <p className="text-xs text-primary-foreground/70 mt-2">
            {reachedMin
              ? "Puoi continuare a votare altri colleghi o terminare qui."
              : `Mancano ${minRequired - completed} voti per raggiungere il minimo.`}
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
              {list.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/vota/$id"
                    params={{ id: c.id }}
                    disabled={c.voted}
                    className={`flex items-center gap-4 bg-card rounded-2xl p-3 shadow-soft transition-all ${
                      c.voted ? "opacity-60" : "hover:shadow-card active:scale-[0.98]"
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
                    ) : (
                      <ChevronRight className="text-muted-foreground size-5" />
                    )}
                  </Link>
                </li>
              ))}
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
