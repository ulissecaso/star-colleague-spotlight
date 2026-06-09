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
import { Trophy, Upload, LogOut, Plus, Trash2, Lock, Unlock, Sparkles } from "lucide-react";
import {
  adminBootstrap, listEmployees, upsertEmployee, deleteEmployee, importEmployeesCsv,
  listPeriods, togglePeriod,
} from "@/lib/employees.functions";
import { getAdminLeaderboards, getDashboard, calculateWinners, getWinners } from "@/lib/voting.functions";
import { getCurrentPrize, setCurrentPrize, deleteCurrentPrize } from "@/lib/prizes.functions";
import { Gift } from "lucide-react";

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
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard"><DashboardTab /></TabsContent>
          <TabsContent value="dipendenti"><EmployeesTab /></TabsContent>
          <TabsContent value="periodi"><PeriodsTab /></TabsContent>
          <TabsContent value="premio-mese"><MonthlyPrizeTab /></TabsContent>
          <TabsContent value="premi"><WinnersTab /></TabsContent>
          <TabsContent value="account"><AccountTab /></TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function DashboardTab() {
  const fn = useServerFn(getDashboard);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });
  if (!data) return <p className="text-muted-foreground">Caricamento…</p>;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Dipendenti attivi" value={data.totalEmployees} />
        <Stat label="Completamento" value={`${data.completion}%`} />
        <Stat label="Hanno completato" value={data.fullyDone} />
        <Stat label="Team Score medio" value={data.overallTeamScore} gold />
      </div>
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
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent("nome;cognome;telefono;codice_accesso;mansione;negozio;data_assunzione;foto_url\nMario;Rossi;+393331234567;MR001;Commesso;Milano Centro;2023-01-15;")}`}
          download="template_dipendenti.csv"
          className="text-xs text-muted-foreground self-center underline"
        >Scarica template</a>
      </div>

      <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr><th className="text-left p-3">Nome</th><th className="text-left p-3">Codice</th><th className="text-left p-3">Mansione</th><th className="text-left p-3">Negozio</th><th className="p-3">Stato</th><th></th></tr>
          </thead>
          <tbody>
            {data?.employees.map((e: any) => (
              <tr key={e.id} className="border-t border-border">
                <td className="p-3">{e.nome} {e.cognome}</td>
                <td className="p-3 font-mono text-xs">{e.codice_accesso}</td>
                <td className="p-3">{e.mansione}</td>
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
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nessun dipendente. Importa un CSV o crea il primo.</td></tr>
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
                  telefono: editing.telefono ?? "",
                  codice_accesso: editing.codice_accesso ?? "",
                  mansione: editing.mansione ?? "",
                  negozio: editing.negozio ?? "",
                  data_assunzione: editing.data_assunzione ?? "",
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
                <div><Label>Telefono</Label><Input value={editing.telefono ?? ""} onChange={(e) => setEditing({ ...editing, telefono: e.target.value })} /></div>
                <div><Label>Mansione</Label><Input required value={editing.mansione ?? ""} onChange={(e) => setEditing({ ...editing, mansione: e.target.value })} /></div>
                <div><Label>Negozio</Label><Input required value={editing.negozio ?? ""} onChange={(e) => setEditing({ ...editing, negozio: e.target.value })} /></div>
                <div><Label>Data assunzione</Label><Input type="date" value={editing.data_assunzione ?? ""} onChange={(e) => setEditing({ ...editing, data_assunzione: e.target.value })} /></div>
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
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["periods"], queryFn: () => list() });
  return (
    <div className="bg-card rounded-2xl shadow-soft p-5">
      <h3 className="font-semibold mb-3">Periodi di votazione</h3>
      <ul className="divide-y divide-border">
        {data?.periods.map((p: any) => (
          <li key={p.id} className="py-3 flex items-center justify-between">
            <div>
              <p className="font-medium">{MESI[p.mese - 1]} {p.anno}</p>
              <p className="text-xs text-muted-foreground">{p.status === "open" ? "Aperto" : "Chiuso"}</p>
            </div>
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
  const { data: winners } = useQuery({ queryKey: ["winners"], queryFn: () => winnersFn() });
  const [periodId, setPeriodId] = useState<string | undefined>();
  const { data: lb } = useQuery({
    queryKey: ["adminLb", periodId],
    queryFn: () => lbFn({ data: { periodId } }),
    enabled: !!periodId,
  });

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
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Trophy className="text-gold" /> Albo dei vincitori</h3>
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
          {(!winners || winners.winners.length === 0) && <p className="text-sm text-muted-foreground py-6 text-center">Nessun premio assegnato.</p>}
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
