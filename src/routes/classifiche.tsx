import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Trophy, Medal } from "lucide-react";
import { getLeaderboards } from "@/lib/voting.functions";
import { getSession } from "@/lib/employee-session";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { BottomNav } from "@/components/BottomNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/classifiche")({
  head: () => ({ meta: [{ title: "Classifiche" }] }),
  component: ClassifichePage,
});

function ClassifichePage() {
  const navigate = useNavigate();
  const fetchLb = useServerFn(getLeaderboards);
  const session = typeof window !== "undefined" ? getSession() : null;

  useEffect(() => {
    if (typeof window !== "undefined" && !getSession()) navigate({ to: "/" });
  }, [navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboards"],
    queryFn: () => fetchLb({ data: { token: session!.session_token } }),
    enabled: !!session,
  });

  return (
    <main className="min-h-dvh bg-background pb-24">
      <header className="bg-gradient-hero text-primary-foreground px-5 pt-8 pb-8 rounded-b-3xl shadow-card">
        <Trophy className="size-7 mb-2 text-gold" />
        <h1 className="text-3xl font-bold">Classifiche</h1>
        <p className="text-sm text-primary-foreground/80 mt-1">Team Score di questo mese.</p>
      </header>

      <div className="max-w-md mx-auto px-5 mt-6">
        {isLoading && <p className="text-center text-muted-foreground py-10">Caricamento…</p>}
        {data && (
          <Tabs defaultValue="overall">
            <TabsList className="w-full grid grid-cols-3 mb-5">
              <TabsTrigger value="overall">Top 10</TabsTrigger>
              <TabsTrigger value="store">Per negozio</TabsTrigger>
              <TabsTrigger value="role">Per mansione</TabsTrigger>
            </TabsList>
            <TabsContent value="overall">
              <RankList items={data.overall} />
            </TabsContent>
            <TabsContent value="store" className="space-y-5">
              {data.byStore.map((g) => (
                <div key={g.store}>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{g.store}</h3>
                  <RankList items={g.list} />
                </div>
              ))}
            </TabsContent>
            <TabsContent value="role" className="space-y-5">
              {data.byRole.map((g) => (
                <div key={g.role}>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{g.role}</h3>
                  <RankList items={g.list} />
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <BottomNav />
    </main>
  );
}

function RankList({ items }: { items: any[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">Nessun voto ancora.</p>;
  return (
    <ul className="space-y-2">
      {items.map((r, i) => (
        <li
          key={r.employee.id}
          className={`flex items-center gap-3 rounded-2xl p-3 shadow-soft ${
            i === 0 ? "bg-gradient-gold text-gold-foreground shadow-gold" : "bg-card"
          }`}
        >
          <div className="w-7 text-center font-bold text-lg">
            {i === 0 ? <Medal className="size-6 inline" /> : `${i + 1}°`}
          </div>
          <EmployeeAvatar nome={r.employee.nome} cognome={r.employee.cognome} foto_url={r.employee.foto_url} size={42} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{r.employee.nome} {r.employee.cognome}</p>
            <p className={`text-xs truncate ${i === 0 ? "text-gold-foreground/80" : "text-muted-foreground"}`}>
              {r.employee.mansione} · {r.employee.negozio}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg leading-none">{r.teamScore}</p>
            <p className={`text-[10px] uppercase tracking-wider ${i === 0 ? "text-gold-foreground/80" : "text-muted-foreground"}`}>
              Team Score
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
