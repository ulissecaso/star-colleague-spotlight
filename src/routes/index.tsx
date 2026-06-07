import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Trophy, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { employeeLogin } from "@/lib/voting.functions";
import { getSession, setSession, getDeviceId } from "@/lib/employee-session";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Voto Colleghi — Premio Dipendente del Mese" },
      { name: "description", content: "Vota i tuoi colleghi ogni mese e scopri il Dipendente del Mese e dell'Anno." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [codice, setCodice] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useServerFn(employeeLogin);

  useEffect(() => {
    if (getSession()) navigate({ to: "/vota" });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!codice.trim()) return;
    setLoading(true);
    try {
      const res = await login({ data: { codice: codice.trim(), deviceId: getDeviceId() } });
      setSession(res.session);
      toast.success(`Benvenuto, ${res.session.nome}!`);
      navigate({ to: "/vota" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-gradient-hero flex flex-col">
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="text-center text-primary-foreground mb-10">
            <div className="inline-flex items-center justify-center size-20 rounded-3xl bg-gradient-gold shadow-gold mb-5">
              <Trophy className="size-10 text-gold-foreground" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Voto Colleghi</h1>
            <p className="mt-3 text-primary-foreground/80 text-balance">
              Riconosci chi rende il team migliore. Ogni mese un Dipendente da premiare.
            </p>
          </div>

          <div className="bg-card rounded-3xl shadow-card p-7">
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Codice di accesso</label>
                <Input
                  autoFocus
                  value={codice}
                  onChange={(e) => setCodice(e.target.value.toUpperCase())}
                  placeholder="es. AB12CD"
                  className="h-14 text-lg tracking-widest text-center font-mono uppercase"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Inserisci il codice fornito dall'azienda.
                </p>
              </div>
              <Button type="submit" size="lg" className="w-full h-14 text-base" disabled={loading || !codice.trim()}>
                {loading ? "Verifica…" : "Entra"}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-border space-y-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <ShieldCheck className="size-4 text-success shrink-0 mt-0.5" />
                <span>Anonimato garantito. Nessuno vede chi ha votato.</span>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="size-4 text-gold shrink-0 mt-0.5" />
                <span>Il tuo voto contribuisce al Premio del Mese e dell'Anno.</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-6">
            <a href="/admin" className="text-xs text-primary-foreground/70 hover:text-primary-foreground underline underline-offset-4">
              Area amministratore
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
