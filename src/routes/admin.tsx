import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trophy, Upload, LogOut, Plus, Trash2, Lock, Unlock, Sparkles, Download } from "lucide-react";
import {
  adminBootstrap, listEmployees, upsertEmployee, deleteEmployee, importEmployeesCsv,
  listPeriods, togglePeriod,
} from "@/lib/employees.functions";
import { getAdminLeaderboards, getDashboard, calculateWinners, getWinners, getEmployeeComments, resetPeriodVotes } from "@/lib/voting.functions";
import { getParticipationBreakdown } from "@/lib/participation.functions";
import { getCurrentPrize, setCurrentPrize, deleteCurrentPrize } from "@/lib/prizes.functions";
import { getCompanyResults, resetCompanyVotes } from "@/lib/company.functions";
import { Gift, Settings } from "lucide-react";
import { listOptions, addOption, deleteOption } from "@/lib/settings.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Amministrazione" }] }),
  component: AdminPage,
});

const MESI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const bootstrap = useServerFn(adminBootstrap);

  useEffect(() => {
    let active = true;

    async function checkSession(nextSession: Session | null) {
      if (!active) return;
      setSession(nextSession);
      if (!nextSession) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await bootstrap();
        if (active) setIsAdmin(res.granted);
      } catch {
        if (active) setIsAdmin(false);
      } finally {
        if (active) setLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data }) => checkSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setTimeout(() => void checkSession(s), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [bootstrap]);

  if (loading) return <main className="p-10 text-center text-muted-foreground">Caricamento…</main>;
  if (!session) return <AdminLogin />;
  if (!isAdmin) return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <Lock className="size-12 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Accesso negato</h1>
        <p className="text-sm text-muted-foreground mt-2">Il tuo account non ha permessi di amministratore.</p>
        <Button variant="outline" className="mt-5" onClick={() => supabase.auth.signOut()}>Esci</Button>
      </div>
    </main>
  );

  return <AdminDashboard />;
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/admin" } });
        if (error) throw error;
        toast.success("Account creato. Effettua login.");
        setMode("signin");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-gradient-hero flex items-center justify-center p-5">
      <div className="w-full max-w-sm bg-card rounded-3xl shadow-card p-7">
        <Trophy className="size-9 text-gold mb-3" />
        <h1 className="text-2xl font-bold mb-1">Area Amministratore</h1>
        <p className="text-sm text-muted-foreground mb-5">{mode === "signin" ? "Accedi al pannello di gestione." : "Crea il primo account admin."}</p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "…" : mode === "signin" ? "Accedi" : "Registrati"}
          </Button>
        </form>
        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-xs text-muted-foreground hover:underline mt-4 block w-full text-center">
          {mode === "signin" ? "Primo accesso? Crea account admin" : "Hai già un account? Accedi"}
        </button>
        <p className="text-[10px] text-muted-foreground mt-4 text-center">Il primo account registrato riceve automaticamente il ruolo admin.</p>
      </div>
    </main>
  );
}

function AdminDashboard() {
  return (
    <main className="min-h-dvh bg-background">
      <header className="bg-gradient-hero text-primary-foreground px-5 py-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary-foreground/70">Amministrazione</p>
          <h1 className="text-2xl font-bold">Pannello di controllo</h1>
        </div>
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => supabase.auth.signOut()}>
          <LogOut />
        </Button>
      </header>
      <div className="max-w-5xl mx-auto p-5">
        <Tabs defaultValue="dashboard">
          <TabsList className="w-full overflow-x-auto justify-start mb-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="dipendenti">Dipendenti</TabsTrigger>
            <TabsTrigger value="periodi">Periodi</TabsTrigger>
            <TabsTrigger value="premio-mese">Premio del mese</TabsTrigger>
            <TabsTrigger value="premi">Vincitori</TabsTrigger>
            <TabsTrigger value="azienda">Valutazione azienda</TabsTrigger>
            <TabsTrigger value="commenti">Commenti dipendenti</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="impostazioni">Impostazioni</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard"><DashboardTab /></TabsContent>
          <TabsContent value="dipendenti"><EmployeesTab /></TabsContent>
          <TabsContent value="periodi"><PeriodsTab /></TabsContent>
          <TabsContent value="premio-mese"><MonthlyPrizeTab /></TabsContent>
          <TabsContent value="premi"><WinnersTab /></TabsContent>
          <TabsContent value="azienda"><CompanyTab /></TabsContent>
          <TabsContent value="commenti"><EmployeeCommentsTab /></TabsContent>
          <TabsContent value="account"><AccountTab /></TabsContent>
          <TabsContent value="impostazioni"><SettingsTab /></TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function DashboardTab() {
  const fn = useServerFn(getDashboard);
  const breakdownFn = useServerFn(getParticipationBreakdown);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });
  const { data: breakdown } = useQuery({ queryKey: ["participation"], queryFn: () => breakdownFn() });
  if (!data) return <p className="text-muted-foreground">Caricamento…</p>;

  const underCount = (breakdown?.notStarted.length ?? 0) + (breakdown?.underThreshold.length ?? 0);
  const overCount = breakdown?.overThreshold.length ?? 0;
  const doneCount = breakdown?.complete.length ?? 0;

  return (
    <div className="space-y-5">
      {/* Statistiche generali */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Dipendenti attivi" value={data.totalEmployees} />
        <Stat label="Completamento" value={`${data.completion}%`} />
        <Stat label="Hanno completato" value={data.fullyDone} />
        <Stat label="Team Score medio" value={data.overallTeamScore} gold />
      </div>

      {/* Partecipazione voti colleghi */}
      {breakdown && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card title={`❌ Sotto soglia <51% — ${underCount}`}>
            {underCount === 0
              ? <p className="text-sm text-muted-foreground">Nessuno</p>
              : <ul className="space-y-1 max-h-72 overflow-y-auto">
                  {[...breakdown.notStarted, ...breakdown.underThreshold]
                    .sort((a, b) => a.pct - b.pct)
                    .map(e => (
                      <li key={e.id} className="flex justify-between items-center text-sm py-0.5">
                        <span>{e.cognome} {e.nome}</span>
                        <span className="text-muted-foreground text-xs">{e.voted}/{e.total} ({e.pct}%)</span>
                      </li>
                    ))}
                </ul>
            }
          </Card>
          <Card title={`⚠️ Sopra soglia 51–99% — ${overCount}`}>
            {overCount === 0
              ? <p className="text-sm text-muted-foreground">Nessuno</p>
              : <ul className="space-y-1 max-h-72 overflow-y-auto">
                  {breakdown.overThreshold
                    .sort((a, b) => b.pct - a.pct)
                    .map(e => (
                      <li key={e.id} className="flex justify-between items-center text-sm py-0.5">
                        <span>{e.cognome} {e.nome}</span>
                        <span className="text-muted-foreground text-xs">{e.voted}/{e.total} ({e.pct}%)</span>
                      </li>
                    ))}
                </ul>
            }
          </Card>
          <Card title={`✅ Completato 100% — ${doneCount}`}>
            {doneCount === 0
              ? <p className="text-sm text-muted-foreground">Nessuno</p>
              : <ul className="space-y-1 max-h-72 overflow-y-auto">
                  {breakdown.complete.map(e => (
                    <li key={e.id} className="flex justify-between items-center text-sm py-0.5">
                      <span>{e.cognome} {e.nome}</span>
                      <span className="text-muted-foreground text-xs">{e.voted}/{e.total}</span>
                    </li>
                  ))}
                </ul>
            }
          </Card>
        </div>
      )}

      {/* Confronto negozi e mansioni */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Confronto Negozi">
          {data.byStore.length === 0 ? <p className="text-sm text-muted-foreground">Nessun dato ancora.</p> :
            <ul className="space-y-2">
              {data.byStore.sort((a,b) => b.teamScore - a.teamScore).map(r => (
                <li key={r.label} className="flex justify-between items-center text-sm">
                  <span>{r.label}</span>
                  <span className="font-semibold">{r.teamScore}</span>
                </li>
              ))}
            </ul>
          }
        </Card>
        <Card title="Confronto Mansioni">
          {data.byRole.length === 0 ? <p className="text-sm text-muted-foreground">Nessun dato ancora.</p> :
            <ul className="space-y-2">
              {data.byRole.sort((a,b) => b.teamScore - a.teamScore).map(r => (
                <li key={r.label} className="flex justify-between items-center text-sm">
                  <span>{r.label}</span>
                  <span className="font-semibold">{r.teamScore}</span>
                </li>
              ))}
            </ul>
          }
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, gold }: { label: string; value: any; gold?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 shadow-soft ${gold ? "bg-gradient-gold text-gold-foreground" : "bg-card"}`}>
      <p className={`text-xs uppercase tracking-wider ${gold ? "text-gold-foreground/80" : "text-muted-foreground"}`}>{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-soft">
      <h3 className="font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function EmployeesTab() {
  const list = useServerFn(listEmployees);
  const upsert = useServerFn(upsertEmployee);
  const del = useServerFn(deleteEmployee);
  const importCsv = useServerFn(importEmployeesCsv);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["employees"], queryFn: () => list() });
  const [editing, setEditing] = useState<any | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mut = useMutation({
    mutationFn: async (v: any) => upsert({ data: v }),
    onSuccess: () => { toast.success("Salvato"); qc.invalidateQueries({ queryKey: ["employees"] }); setEditing(null); },
    onError: (e) => toast.error((e as Error).message),
  });

  function handleExportExcel() {
    const employees = data?.employees ?? [];
    const headers = ["Nome", "Cognome", "Codice", "Mansione", "Reparto", "Negozio", "Stato", "Escluso premi"];
    const rows = employees.map((e: any) => [
      e.nome,
      e.cognome,
      e.codice_accesso,
      e.mansione ?? "",
      e.reparto ?? "",
      e.negozio ?? "",
      e.attivo ? "Attivo" : "Inattivo",
      e.escluso_premi ? "Sì" : "No",
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map((cell: string) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");
    // BOM UTF-8 so Excel recognises the encoding
    const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dipendenti_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(/[,;]/).map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(line => {
      const cells = line.split(/[,;]/);
      const r: Record<string, string> = {};
      headers.forEach((h, i) => { r[h] = (cells[i] ?? "").trim().replace(/^"|"$/g, ""); });
      return r;
    });
    try {
      const res = await importCsv({ data: { rows } });
      toast.success(`Importati ${res.ok} dipendenti. ${res.fail > 0 ? `${res.fail} errori.` : ""}`);
      if (res.errors.length) console.warn(res.errors);
      qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (err) { toast.error((err as Error).message); }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setEditing({ attivo: true, escluso_premi: false })}><Plus /> Nuovo dipendente</Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload /> Importa CSV</Button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsv} />
        <Button variant="outline" onClick={handleExportExcel}><Download /> Esporta Excel</Button>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent("nome;cognome;codice_accesso;mansione;reparto;negozio;foto_url\nIlaria;Bianchi;IB001;Impiegata;Ufficio Master;Sede Centrale;")}`}
          download="template_dipendenti.csv"
          className="text-xs text-muted-foreground self-center underline"
        >Scarica template</a>
      </div>

      <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr><th className="text-left p-3">Nome</th><th className="text-left p-3">Codice</th><th className="text-left p-3">Mansione</th><th className="text-left p-3">Reparto</th><th className="text-left p-3">Negozio</th><th className="p-3">Stato</th><th></th></tr>
          </thead>
          <tbody>
            {data?.employees.map((e: any) => (
              <tr key={e.id} className="border-t border-border">
                <td className="p-3">{e.nome} {e.cognome}</td>
                <td className="p-3 font-mono text-xs">{e.codice_accesso}</td>
                <td className="p-3">{e.mansione}</td>
                <td className="p-3">{e.reparto || <span className="text-muted-foreground">—</span>}</td>
                <td className="p-3">{e.negozio}</td>
                <td className="p-3 text-center">
                  {!e.attivo && <span className="text-xs text-destructive">Inattivo</span>}
                  {e.escluso_premi && <span className="text-xs text-amber-600 ml-1">Escluso</span>}
                  {e.attivo && !e.escluso_premi && <span className="text-xs text-success">Attivo</span>}
                </td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(e)}>Modifica</Button>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    if (!confirm("Eliminare definitivamente?")) return;
                    await del({ data: { id: e.id } });
                    qc.invalidateQueries({ queryKey: ["employees"] });
                  }}><Trash2 className="text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {(!data || data.employees.length === 0) && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nessun dipendente. Importa un CSV o crea il primo.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Modifica dipendente" : "Nuovo dipendente"}</DialogTitle></DialogHeader>
          {editing && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                mut.mutate({
                  id: editing.id,
                  nome: editing.nome ?? "",
                  cognome: editing.cognome ?? "",
                  codice_accesso: editing.codice_accesso ?? "",
                  mansione: editing.mansione ?? "",
                  negozio: editing.negozio ?? "",
                  reparto: editing.reparto ?? "",
                  foto_url: editing.foto_url ?? "",
                  attivo: !!editing.attivo,
                  escluso_premi: !!editing.escluso_premi,
                  motivo_esclusione: editing.motivo_esclusione ?? "",
                });
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome</Label><Input required value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></div>
                <div><Label>Cognome</Label><Input required value={editing.cognome ?? ""} onChange={(e) => setEditing({ ...editing, cognome: e.target.value })} /></div>
                <div><Label>Codice accesso</Label><Input required value={editing.codice_accesso ?? ""} onChange={(e) => setEditing({ ...editing, codice_accesso: e.target.value.toUpperCase() })} /></div>
                <div><Label>Mansione</Label><Input required value={editing.mansione ?? ""} onChange={(e) => setEditing({ ...editing, mansione: e.target.value })} /></div>
                <div className="col-span-2">
                  <Label>Reparto</Label>
                  <OptionsSelect
                    tipo="reparto"
                    value={editing.reparto ?? ""}
                    onChange={(v) => setEditing({ ...editing, reparto: v })}
                    placeholder="Seleziona reparto…"
                  />
                </div>
                <div>
                  <Label>Negozio</Label>
                  <OptionsSelect
                    tipo="negozio"
                    value={editing.negozio ?? ""}
                    onChange={(v) => setEditing({ ...editing, negozio: v })}
                    placeholder="Seleziona negozio…"
                    required
                  />
                </div>
                <div><Label>Foto URL</Label><Input value={editing.foto_url ?? ""} onChange={(e) => setEditing({ ...editing, foto_url: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.attivo} onCheckedChange={(v) => setEditing({ ...editing, attivo: v })} /> Attivo</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.escluso_premi} onCheckedChange={(v) => setEditing({ ...editing, escluso_premi: v })} /> Escluso dai premi</label>
              </div>
              {editing.escluso_premi && (
                <div><Label>Motivo esclusione</Label><Input value={editing.motivo_esclusione ?? ""} onChange={(e) => setEditing({ ...editing, motivo_esclusione: e.target.value })} /></div>
              )}
              <Button type="submit" className="w-full" disabled={mut.isPending}>Salva</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PeriodsTab() {
  const list = useServerFn(listPeriods);
  const toggle = useServerFn(togglePeriod);
  const resetVotes = useServerFn(resetPeriodVotes);
  const qc = useQueryClient();
  const [resettingId, setResettingId] = useState<string | null>(null);
  const { data } = useQuery({ queryKey: ["periods"], queryFn: () => list() });

  async function handleReset(p: any) {
    if (!confirm(`Cancellare TUTTI i voti (colleghi + azienda) di ${MESI[p.mese - 1]} ${p.anno}?\n\nI dipendenti potranno votare di nuovo da zero.`)) return;
    setResettingId(p.id);
    try {
      await resetVotes({ data: { periodId: p.id } });
      toast.success(`Voti di ${MESI[p.mese - 1]} ${p.anno} cancellati.`);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["participation"] });
      qc.invalidateQueries({ queryKey: ["company-results"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setResettingId(null);
    }
  }

  return (
    <div className="bg-card rounded-2xl shadow-soft p-5">
      <h3 className="font-semibold mb-3">Periodi di votazione</h3>
      <ul className="divide-y divide-border">
        {data?.periods.map((p: any) => (
          <li key={p.id} className="py-3 flex items-center justify-between gap-2">
            <div>
              <p className="font-medium">{MESI[p.mese - 1]} {p.anno}</p>
              <p className="text-xs text-muted-foreground">{p.status === "open" ? "Aperto" : "Chiuso"}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                disabled={resettingId === p.id}
                onClick={() => handleReset(p)}
              >
                <Trash2 className="size-3.5" />
                {resettingId === p.id ? "…" : "Cancella voti"}
              </Button>
              <Button
                variant={p.status === "open" ? "outline" : "default"}
                size="sm"
                onClick={async () => {
                  await toggle({ data: { id: p.id, status: p.status === "open" ? "closed" : "open" } });
                  qc.invalidateQueries({ queryKey: ["periods"] });
                }}
              >
                {p.status === "open" ? <><Lock className="size-4"/> Chiudi</> : <><Unlock className="size-4"/> Riapri</>}
              </Button>
            </div>
          </li>
        ))}
        {(!data || data.periods.length === 0) && <p className="text-sm text-muted-foreground py-6 text-center">Nessun periodo. Si crea automaticamente al primo voto.</p>}
      </ul>
    </div>
  );
}

function WinnersTab() {
  const list = useServerFn(listPeriods);
  const winnersFn = useServerFn(getWinners);
  const calc = useServerFn(calculateWinners);
  const lbFn = useServerFn(getAdminLeaderboards);
  const qc = useQueryClient();
  const { data: periods } = useQuery({ queryKey: ["periods"], queryFn: () => list() });
  const [periodId, setPeriodId] = useState<string | undefined>();
  const { data: lb } = useQuery({
    queryKey: ["adminLb", periodId],
    queryFn: () => lbFn({ data: { periodId } }),
    enabled: !!periodId,
  });

  // Filtro per l'Albo dei vincitori: di default mostra solo il periodo in corso.
  // "" (vuoto) = periodo corrente, "all" = storico completo, oppure un id periodo specifico.
  const [winnersFilter, setWinnersFilter] = useState<string>("");
  const { data: winners } = useQuery({
    queryKey: ["winners", winnersFilter],
    queryFn: () => winnersFn({ data: { periodId: winnersFilter || undefined } }),
  });
  const currentPeriod = periods?.periods.find((p: any) => p.status === "open");

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-2xl shadow-soft p-5">
        <h3 className="font-semibold mb-3">Calcola Dipendente del Mese</h3>
        <div className="flex gap-2 items-center">
          <select className="border border-input rounded-md p-2 text-sm bg-background" value={periodId ?? ""} onChange={(e) => setPeriodId(e.target.value || undefined)}>
            <option value="">Seleziona periodo…</option>
            {periods?.periods.map((p: any) => <option key={p.id} value={p.id}>{MESI[p.mese - 1]} {p.anno}</option>)}
          </select>
          <Button disabled={!periodId} onClick={async () => {
            const res = await calc({ data: { periodId: periodId! } });
            toast.success(`Vincitore: ${res.winner?.nome} ${res.winner?.cognome}`);
            qc.invalidateQueries({ queryKey: ["winners"] });
          }}><Sparkles /> Calcola</Button>
        </div>
        {lb && (
          <p className="text-xs text-muted-foreground mt-3">
            {lb.all.length} dipendenti in classifica • Top: {lb.overall[0]?.employee.nome} {lb.overall[0]?.employee.cognome} ({lb.overall[0]?.teamScore})
          </p>
        )}
      </div>
      <div className="bg-card rounded-2xl shadow-soft p-5">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h3 className="font-semibold flex items-center gap-2"><Trophy className="text-gold" /> Albo dei vincitori</h3>
          <select
            className="border border-input rounded-md p-2 text-sm bg-background"
            value={winnersFilter}
            onChange={(e) => setWinnersFilter(e.target.value)}
          >
            <option value="">
              Periodo in corso{currentPeriod ? ` (${MESI[currentPeriod.mese - 1]} ${currentPeriod.anno})` : ""}
            </option>
            {periods?.periods.map((p: any) => (
              <option key={p.id} value={p.id}>{MESI[p.mese - 1]} {p.anno}</option>
            ))}
            <option value="all">Tutto lo storico</option>
          </select>
        </div>
        <ul className="divide-y divide-border">
          {winners?.winners.map((w: any) => (
            <li key={w.id} className="py-3 flex justify-between items-center">
              <div>
                <p className="font-medium">{w.employees?.nome} {w.employees?.cognome}</p>
                <p className="text-xs text-muted-foreground">
                  {MESI[(w.voting_periods?.mese ?? 1) - 1]} {w.voting_periods?.anno} • {w.categoria}
                  {w.scope_value ? ` (${w.scope_value})` : ""}
                </p>
              </div>
              <span className="font-bold text-gold">{w.team_score}</span>
            </li>
          ))}
          {(!winners || winners.winners.length === 0) && <p className="text-sm text-muted-foreground py-6 text-center">Nessun premio assegnato per questo periodo.</p>}
        </ul>
      </div>
    </div>
  );
}

function AccountTab() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("La password deve avere almeno 8 caratteri.");
    if (pw !== pw2) return toast.error("Le password non coincidono.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success("Password aggiornata con successo.");
      setPw(""); setPw2("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card rounded-2xl shadow-soft p-5 max-w-md">
      <h3 className="font-semibold mb-1">Cambia password</h3>
      <p className="text-sm text-muted-foreground mb-4">Imposta una nuova password per il tuo account amministratore.</p>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>Nuova password</Label>
          <Input type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <div>
          <Label>Conferma password</Label>
          <Input type="password" minLength={8} required value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "…" : "Aggiorna password"}
        </Button>
      </form>
    </div>
  );
}

function MonthlyPrizeTab() {
  const getFn = useServerFn(getCurrentPrize);
  const setFn = useServerFn(setCurrentPrize);
  const delFn = useServerFn(deleteCurrentPrize);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["current-prize-admin"], queryFn: () => getFn() });

  const [titolo, setTitolo] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.prize) {
      setTitolo(data.prize.titolo ?? "");
      setDescrizione(data.prize.descrizione ?? "");
    }
  }, [data]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file && !data?.prize) {
      toast.error("Seleziona un'immagine.");
      return;
    }
    setSaving(true);
    try {
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Immagine troppo grande (max 5MB).");
        const buf = await file.arrayBuffer();
        let bin = "";
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
        const fileBase64 = btoa(bin);
        await setFn({
          data: {
            fileBase64,
            fileName: file.name,
            contentType: file.type || "image/jpeg",
            titolo: titolo || undefined,
            descrizione: descrizione || undefined,
          },
        });
      } else if (data?.prize) {
        // Re-upload existing? Skip; require new file to update meta.
        toast.error("Per aggiornare titolo/descrizione carica una nuova immagine.");
        return;
      }
      toast.success("Premio aggiornato.");
      setFile(null);
      setPreview(null);
      qc.invalidateQueries({ queryKey: ["current-prize-admin"] });
      qc.invalidateQueries({ queryKey: ["current-prize"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Rimuovere il premio del mese corrente?")) return;
    try {
      await delFn();
      setTitolo("");
      setDescrizione("");
      setFile(null);
      setPreview(null);
      toast.success("Premio rimosso.");
      qc.invalidateQueries({ queryKey: ["current-prize-admin"] });
      qc.invalidateQueries({ queryKey: ["current-prize"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="bg-card rounded-2xl shadow-soft p-5">
        <h3 className="font-semibold mb-1 flex items-center gap-2"><Gift className="text-gold" /> Premio del mese corrente</h3>
        <p className="text-sm text-muted-foreground mb-4">L'immagine apparirà nella pagina di accesso dei dipendenti.</p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Immagine (JPG/PNG, max 5MB)</Label>
            <Input type="file" accept="image/*" onChange={onFileChange} />
          </div>
          <div>
            <Label>Titolo (opzionale)</Label>
            <Input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Aspirapolvere Dyson V12" />
          </div>
          <div>
            <Label>Descrizione (opzionale)</Label>
            <Input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder="Breve descrizione del premio" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Salvataggio…" : data?.prize ? "Sostituisci immagine" : "Pubblica premio"}
            </Button>
            {data?.prize && (
              <Button type="button" variant="outline" onClick={handleDelete}>
                <Trash2 className="text-destructive" />
              </Button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-card rounded-2xl shadow-soft p-5">
        <h3 className="font-semibold mb-3">Anteprima</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        ) : preview || data?.prize?.image_url ? (
          <div className="space-y-3">
            <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-muted">
              <img
                src={preview ?? data?.prize?.image_url ?? ""}
                alt="Anteprima premio"
                className="w-full h-full object-contain"
              />
            </div>
            {(titolo || descrizione) && (
              <div>
                {titolo && <p className="font-semibold">{titolo}</p>}
                {descrizione && <p className="text-sm text-muted-foreground">{descrizione}</p>}
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-[4/3] w-full rounded-2xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
            Nessun premio caricato per questo mese
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyTab() {
  const fn = useServerFn(getCompanyResults);
  const resetFn = useServerFn(resetCompanyVotes);
  const qc = useQueryClient();
  const [resetting, setResetting] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["company-results"],
    queryFn: () => fn({ data: {} }),
  });

  async function handleReset() {
    if (!confirm("Cancellare tutti i voti azienda del periodo corrente? I dipendenti potranno votare di nuovo.")) return;
    setResetting(true);
    try {
      await resetFn({ data: {} });
      toast.success("Voti azienda cancellati. I dipendenti possono votare di nuovo.");
      qc.invalidateQueries({ queryKey: ["company-results"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setResetting(false);
    }
  }

  if (isLoading || !data) return <p className="text-muted-foreground p-4">Caricamento…</p>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl p-4 shadow-soft">
          <p className="text-xs uppercase text-muted-foreground">Punteggio aziendale</p>
          <p className="text-3xl font-bold mt-1">{data.overallScore}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-soft">
          <p className="text-xs uppercase text-muted-foreground">Partecipazione</p>
          <p className="text-3xl font-bold mt-1">{data.participationPct}<span className="text-sm font-normal text-muted-foreground">%</span></p>
          <p className="text-xs text-muted-foreground mt-1">{data.participants} su {data.totalEmployees} dipendenti</p>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-soft">
          <p className="text-xs uppercase text-muted-foreground">Commenti ricevuti</p>
          <p className="text-3xl font-bold mt-1">{data.commenti.length}</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold">Risultati per criterio</h3>
        </div>
        <ul className="divide-y divide-border">
          {data.perCriterio.map((c) => (
            <li key={c.key} className="px-4 py-3 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-sm">{c.label}</p>
                <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${c.score}%` }} />
                </div>
              </div>
              <div className="text-right min-w-20">
                <p className="font-semibold">{c.media.toFixed(2)}<span className="text-xs text-muted-foreground">/5</span></p>
                <p className="text-xs text-muted-foreground">{c.count} voti</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {data.commenti.length > 0 && (
        <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold">Commenti anonimi</h3>
          </div>
          <ul className="divide-y divide-border">
            {data.commenti.map((c, i) => (
              <li key={i} className="px-4 py-3 text-sm whitespace-pre-wrap">{c}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-soft p-5 border border-destructive/20">
        <h3 className="font-semibold mb-1 text-destructive">Zona pericolosa</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Cancella tutti i voti azienda del mese corrente. I dipendenti potranno votare di nuovo da zero.
          Usa solo se i voti esistenti sono errati o di test.
        </p>
        <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={handleReset} disabled={resetting}>
          <Trash2 className="size-4" />
          {resetting ? "Cancellazione…" : "Cancella voti azienda (mese corrente)"}
        </Button>
      </div>
    </div>
  );
}

function EmployeeCommentsTab() {
  const list = useServerFn(listPeriods);
  const fetchFn = useServerFn(getEmployeeComments);
  const { data: periods } = useQuery({ queryKey: ["periods"], queryFn: () => list() });
  const [periodId, setPeriodId] = useState<string | undefined>();
  const { data, isLoading } = useQuery({
    queryKey: ["empComments", periodId ?? "current"],
    queryFn: () => fetchFn({ data: { periodId } }),
  });

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-2xl shadow-soft p-5">
        <h3 className="font-semibold mb-3">Commenti anonimi sui dipendenti</h3>
        <div className="flex gap-2 items-center">
          <select
            className="border border-input rounded-md p-2 text-sm bg-background"
            value={periodId ?? ""}
            onChange={(e) => setPeriodId(e.target.value || undefined)}
          >
            <option value="">Periodo corrente</option>
            {periods?.periods.map((p: any) => (
              <option key={p.id} value={p.id}>{MESI[p.mese - 1]} {p.anno}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Caricamento…</p>}

      {data && data.groups.length === 0 && (
        <p className="text-sm text-muted-foreground bg-card rounded-2xl p-6 text-center">
          Nessun commento ricevuto per questo periodo.
        </p>
      )}

      <div className="space-y-4">
        {data?.groups.map((g: any) => (
          <div key={g.employee.id} className="bg-card rounded-2xl shadow-soft overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30">
              <p className="font-semibold">{g.employee.nome} {g.employee.cognome}</p>
              <p className="text-xs text-muted-foreground">
                {g.employee.mansione} • {g.employee.negozio} • {g.items.length} {g.items.length === 1 ? "commento" : "commenti"}
              </p>
            </div>
            <ul className="divide-y divide-border">
              {g.items.map((it: any) => (
                <li key={it.id} className="px-5 py-3 space-y-2">
                  {it.punto_forza && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">Punto di forza</p>
                      <p className="text-sm whitespace-pre-wrap">{it.punto_forza}</p>
                    </div>
                  )}
                  {it.suggerimento && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-amber-600 font-semibold">Suggerimento</p>
                      <p className="text-sm whitespace-pre-wrap">{it.suggerimento}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function OptionsSelect({ tipo, value, onChange, placeholder, required }: {
  tipo: "reparto" | "negozio";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const list = useServerFn(listOptions);
  const { data } = useQuery({
    queryKey: ["app_options", tipo],
    queryFn: () => list({ data: { tipo } }),
  });
  const options = data?.options ?? [];

  return (
    <Select value={value} onValueChange={onChange} required={required}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder ?? "Seleziona…"} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o: any) => (
          <SelectItem key={o.id} value={o.valore}>{o.valore}</SelectItem>
        ))}
        {options.length === 0 && (
          <div className="p-2 text-xs text-muted-foreground">Nessuna opzione — aggiungila in Impostazioni</div>
        )}
      </SelectContent>
    </Select>
  );
}

function SettingsTab() {
  return (
    <div className="space-y-6">
      <OptionManager tipo="reparto" label="Reparti" />
      <OptionManager tipo="negozio" label="Negozi / Sedi" />
    </div>
  );
}

function OptionManager({ tipo, label }: { tipo: "reparto" | "negozio"; label: string }) {
  const list = useServerFn(listOptions);
  const add = useServerFn(addOption);
  const del = useServerFn(deleteOption);
  const qc = useQueryClient();
  const [newValue, setNewValue] = useState("");
  const { data } = useQuery({
    queryKey: ["app_options", tipo],
    queryFn: () => list({ data: { tipo } }),
  });
  const options = data?.options ?? [];

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newValue.trim()) return;
    try {
      await add({ data: { tipo, valore: newValue.trim() } });
      toast.success("Aggiunto");
      setNewValue("");
      qc.invalidateQueries({ queryKey: ["app_options", tipo] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleDelete(id: string, valore: string) {
    if (!confirm(`Eliminare "${valore}"?`)) return;
    try {
      await del({ data: { id } });
      toast.success("Rimosso");
      qc.invalidateQueries({ queryKey: ["app_options", tipo] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="bg-card rounded-2xl p-5 shadow-soft">
      <h3 className="font-semibold mb-4 flex items-center gap-2"><Settings className="size-4" />{label}</h3>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={`Nuovo ${tipo}…`}
          className="flex-1"
        />
        <Button type="submit" size="sm"><Plus /> Aggiungi</Button>
      </form>
      <ul className="divide-y divide-border">
        {options.map((o: any) => (
          <li key={o.id} className="flex items-center justify-between py-2 px-1">
            <span className="text-sm">{o.valore}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDelete(o.id, o.valore)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </li>
        ))}
        {options.length === 0 && (
          <li className="py-4 text-center text-sm text-muted-foreground">Nessuna opzione ancora</li>
        )}
      </ul>
    </div>
  );
}
