import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2, CheckCircle2 } from "lucide-react";
import {
  COMPANY_CRITERI,
  getCompanyVoteStatus,
  submitCompanyVote,
} from "@/lib/company.functions";
import { getSession, getDeviceId } from "@/lib/employee-session";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

export const Route = createFileRoute("/vota-azienda")({
  head: () => ({ meta: [{ title: "Valuta l'azienda" }] }),
  component: VotaAziendaPage,
});

const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

function VotaAziendaPage() {
  const navigate = useNavigate();
  const session = typeof window !== "undefined" ? getSession() : null;
  const statusFn = useServerFn(getCompanyVoteStatus);
  const submitFn = useServerFn(submitCompanyVote);

  const [scores, setScores] = useState<Record<string, number>>({});
  const [commento, setCommento] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !getSession()) navigate({ to: "/" });
  }, [navigate]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["company-status", session?.id],
    queryFn: () => statusFn({ data: { token: session!.session_token } }),
    enabled: !!session,
  });

  const allFilled = COMPANY_CRITERI.every((c) => (scores[c.key] ?? 0) >= 1);

  async function save() {
    if (!allFilled) return;
    setSaving(true);
    try {
      await submitFn({
        data: {
          token: session!.session_token,
          scores,
          commento: commento.trim() || undefined,
          deviceId: getDeviceId(),
        },
      });
      toast.success("Valutazione aziendale inviata. Grazie!");
      refetch();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-background pb-32">
      <header className="bg-gradient-hero text-primary-foreground px-5 pt-6 pb-8 rounded-b-3xl shadow-card">
        <button
          onClick={() => navigate({ to: "/vota" })}
          className="inline-flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground mb-4"
        >
          <ArrowLeft className="size-4" /> Indietro
        </button>
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center">
            <Building2 className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Valuta l'azienda</h1>
            <p className="text-xs text-primary-foreground/80">
              {data?.period && `${MESI[data.period.mese - 1]} ${data.period.anno}`} • Anonima
            </p>
          </div>
        </div>
        <p className="text-sm text-primary-foreground/80 mt-4">
          La tua opinione conta. Rispondi in modo onesto: i risultati sono visibili solo alla direzione in forma aggregata.
        </p>
      </header>

      {isLoading && (
        <p className="p-10 text-center text-muted-foreground">Caricamento…</p>
      )}

      {data?.alreadyVoted && (
        <div className="max-w-md mx-auto px-5 mt-8">
          <div className="bg-card rounded-2xl p-6 shadow-soft text-center">
            <CheckCircle2 className="size-12 text-success mx-auto mb-3" />
            <h2 className="font-bold text-lg text-foreground">Valutazione già inviata</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Hai già valutato l'azienda per questo mese. Grazie per aver contribuito!
            </p>
            <Button className="mt-5" onClick={() => navigate({ to: "/vota" })}>
              Torna ai colleghi
            </Button>
          </div>
        </div>
      )}

      {data && !data.alreadyVoted && (
        <>
          <div className="max-w-md mx-auto px-5 mt-6 space-y-3">
            {COMPANY_CRITERI.map((cr) => (
              <div key={cr.key} className="bg-card rounded-2xl p-4 shadow-soft">
                <div className="mb-3">
                  <p className="font-semibold text-foreground">{cr.label}</p>
                  <p className="text-xs text-muted-foreground">{cr.desc}</p>
                </div>
                <StarRating
                  value={scores[cr.key] ?? 0}
                  onChange={(v) => setScores((s) => ({ ...s, [cr.key]: v }))}
                />
              </div>
            ))}

            <div className="bg-card rounded-2xl p-4 shadow-soft space-y-2">
              <p className="font-semibold text-foreground">Commento libero (opzionale)</p>
              <p className="text-xs text-muted-foreground">
                Suggerimenti o segnalazioni che vorresti far arrivare alla direzione.
              </p>
              <Textarea
                value={commento}
                onChange={(e) => setCommento(e.target.value)}
                placeholder="Scrivi qui…"
                maxLength={1000}
                rows={3}
              />
            </div>
          </div>

          <div className="fixed bottom-16 inset-x-0 p-4 bg-background/95 backdrop-blur-md border-t border-border">
            <div className="max-w-md mx-auto">
              <Button
                size="lg"
                className="w-full h-14 text-base"
                onClick={save}
                disabled={!allFilled || saving}
              >
                {saving
                  ? "Invio…"
                  : allFilled
                  ? "Invia valutazione"
                  : `Compila tutte le voci (${Object.values(scores).filter((v) => v >= 1).length}/${COMPANY_CRITERI.length})`}
              </Button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </main>
  );
}
