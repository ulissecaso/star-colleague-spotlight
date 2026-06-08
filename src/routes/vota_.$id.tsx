import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getColleague, submitVote } from "@/lib/voting.functions";
import { getSession, getDeviceId } from "@/lib/employee-session";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/vota_/$id")({
  head: () => ({ meta: [{ title: "Valuta collega" }] }),
  component: VotaForm,
});

const CRITERI = [
  { key: "collaborazione", label: "Collaborazione", desc: "Aiuta i colleghi quando necessario" },
  { key: "professionalita", label: "Professionalità", desc: "Mantiene comportamenti corretti" },
  { key: "affidabilita", label: "Affidabilità", desc: "Rispetta impegni, orari e responsabilità" },
  { key: "disponibilita", label: "Disponibilità", desc: "È disponibile a supportare il gruppo" },
  { key: "atteggiamento_positivo", label: "Atteggiamento positivo", desc: "Contribuisce a un clima sereno" },
  { key: "comunicazione", label: "Comunicazione", desc: "Comunica in modo chiaro e rispettoso" },
  { key: "problem_solving", label: "Problem solving", desc: "Aiuta a trovare soluzioni ai problemi" },
  { key: "spirito_aziendale", label: "Spirito aziendale", desc: "Rappresenta bene i valori aziendali" },
] as const;

function VotaForm() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const session = typeof window !== "undefined" ? getSession() : null;
  const fetchColleague = useServerFn(getColleague);
  const submit = useServerFn(submitVote);

  const [scores, setScores] = useState<Record<string, number>>({});
  const [puntoForza, setPuntoForza] = useState("");
  const [suggerimento, setSuggerimento] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !getSession()) navigate({ to: "/" });
  }, [navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["colleague", id],
    queryFn: () => fetchColleague({ data: { token: session!.session_token, id } }),
    enabled: !!session,
  });

  useEffect(() => {
    if (data?.alreadyVoted) {
      toast.info("Hai già votato questo collega questo mese.");
      navigate({ to: "/vota" });
    }
  }, [data, navigate]);

  const allFilled = CRITERI.every((c) => scores[c.key] >= 1);

  async function save() {
    if (!allFilled) return;
    setSaving(true);
    try {
      await submit({
        data: {
          token: session!.session_token,
          votedId: id,
          scores,
          puntoForza: puntoForza.trim() || undefined,
          suggerimento: suggerimento.trim() || undefined,
          deviceId: getDeviceId(),
        },
      });
      toast.success("Voto registrato. Grazie!");
      navigate({ to: "/vota" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !data) return <main className="p-10 text-center text-muted-foreground">Caricamento…</main>;
  const c = data.colleague;

  return (
    <main className="min-h-dvh bg-background pb-32">
      <header className="bg-gradient-hero text-primary-foreground px-5 pt-6 pb-8 rounded-b-3xl shadow-card">
        <button
          onClick={() => navigate({ to: "/vota" })}
          className="inline-flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground mb-4"
        >
          <ArrowLeft className="size-4" /> Indietro
        </button>
        <div className="flex items-center gap-4">
          <EmployeeAvatar nome={c.nome} cognome={c.cognome} foto_url={c.foto_url} size={72} />
          <div>
            <h1 className="text-2xl font-bold">{c.nome} {c.cognome}</h1>
            <p className="text-sm text-primary-foreground/80">{c.mansione}</p>
            <p className="text-xs text-primary-foreground/70">{c.negozio}</p>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 mt-6 space-y-3">
        {CRITERI.map((cr) => (
          <div key={cr.key} className="bg-card rounded-2xl p-4 shadow-soft">
            <div className="mb-3">
              <p className="font-semibold text-foreground">{cr.label}</p>
              <p className="text-xs text-muted-foreground">{cr.desc}</p>
            </div>
            <StarRating value={scores[cr.key] ?? 0} onChange={(v) => setScores((s) => ({ ...s, [cr.key]: v }))} />
          </div>
        ))}

        <div className="bg-card rounded-2xl p-4 shadow-soft space-y-3">
          <p className="font-semibold text-foreground">Commento (opzionale, anonimo)</p>
          <div>
            <label className="text-xs text-muted-foreground">Punto di forza</label>
            <Textarea
              value={puntoForza}
              onChange={(e) => setPuntoForza(e.target.value)}
              placeholder="Cosa fa molto bene?"
              maxLength={500}
              rows={2}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Suggerimento di miglioramento</label>
            <Textarea
              value={suggerimento}
              onChange={(e) => setSuggerimento(e.target.value)}
              placeholder="Cosa potrebbe migliorare?"
              maxLength={500}
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 p-4 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="max-w-md mx-auto">
          <Button size="lg" className="w-full h-14 text-base" onClick={save} disabled={!allFilled || saving}>
            {saving ? "Invio…" : allFilled ? "Conferma voto" : `Compila tutti i criteri (${Object.values(scores).filter((v) => v >= 1).length}/8)`}
          </Button>
        </div>
      </div>
    </main>
  );
}
