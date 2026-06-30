import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Trophy, Sparkles, ShieldCheck, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { employeeLogin } from "@/lib/voting.functions";
import { getCurrentPrize } from "@/lib/prizes.functions";
import { getSession, setSession, getDeviceId } from "@/lib/employee-session";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Voto Colleghi — Premio Dipendente del Mese" },
      {
        name: "description",
        content: "Vota i tuoi colleghi ogni mese e scopri il Dipendente del Mese e dell'Anno.",
      },
    ],
  }),
  component: LoginPage,
});

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

function LoginPage() {
  const [codice, setCodice] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useServerFn(employeeLogin);
  const prizeFn = useServerFn(getCurrentPrize);
  const { data: prizeData } = useQuery({
    queryKey: ["current-prize"],
    queryFn: () => prizeFn(),
  });

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

  const prize = prizeData?.prize;

  return (
    <main className="min-h-dvh bg-gradient-hero relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-primary-glow/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 size-[28rem] rounded-full bg-gold/20 blur-3xl" />
      <Sparkles className="pointer-events-none absolute top-20 right-10 size-6 text-gold/60" />
      <Sparkles className="pointer-events-none absolute bottom-32 left-12 size-5 text-primary-foreground/40" />
      <div className="relative flex flex-col items-center justify-center px-5 py-10 min-h-dvh">
        <div className="w-full max-w-md">
          <div className="text-center text-primary-foreground mb-8">
            <div className="inline-flex items-center justify-center size-24 rounded-3xl bg-gradient-gold shadow-gold mb-5 ring-4 ring-gold/20">
              <Trophy className="size-12 text-gold-foreground drop-shadow" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight drop-shadow-lg">Voto Colleghi</h1>
            <p className="mt-3 text-primary-foreground/85 text-balance">
              Riconosci chi rende il team migliore.
              <br />
              Ogni mese un Dipendente da premiare.
            </p>
          </div>
          {prize?.image_url && (
            <div className="mb-5 bg-card/95 backdrop-blur rounded-3xl shadow-card overflow-hidden border border-gold/30">
              <div className="bg-gradient-gold px-5 py-2.5 flex items-center justify-center gap-2 text-gold-foreground">
                <Gift className="size-4" />
                <span className="text-sm font-semibold tracking-wide uppercase">
                  Premio di {MESI[(prize.mese ?? 1) - 1]}
                </span>
              </div>
              <div className="p-5">
                <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-muted shadow-soft">
                  <img
                    src={prize.image_url}
                    alt={prize.titolo ?? "Premio del mese"}
                    className="w-full h-full object-contain"
                  />
                </div>
                {(prize.titolo || prize.descrizione) && (
                  <div className="mt-3 text-center">
                    {prize.titolo && (
                      <h2 className="text-lg font-bold text-foreground">{prize.titolo}</h2>
                    )}
                    {prize.descrizione && (
                      <p className="text-sm text-muted-foreground mt-1">{prize.descrizione}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="bg-card rounded-3xl shadow-card p-7 border border-border/50">
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Codice di accesso
                </label>
                <Input
                  autoFocus
                  value={codice}
                  onChange={(e) => setCodice(e.target.value.toUpperCase())}
                  placeholder="ES. AB12CD"
                  className="h-14 text-lg tracking-[0.3em] text-center font-mono uppercase"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Inserisci il codice fornito dall'azienda.
                </p>
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full h-14 text-base font-semibold shadow-soft"
                disabled={loading || !codice.trim()}
              >
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
            <a
              href="/admin"
              className="text-xs text-primary-foreground/70 hover:text-primary-foreground underline underline-offset-4"
            >
              Area amministratore
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
