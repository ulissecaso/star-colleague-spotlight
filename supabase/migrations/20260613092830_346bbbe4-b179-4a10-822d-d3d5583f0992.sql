
CREATE TABLE public.company_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES public.voting_periods(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  criterio TEXT NOT NULL,
  punteggio SMALLINT NOT NULL CHECK (punteggio >= 1 AND punteggio <= 5),
  commento TEXT,
  device_fingerprint TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (period_id, voter_id, criterio)
);

CREATE INDEX idx_company_votes_period ON public.company_votes(period_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_votes TO authenticated;
GRANT ALL ON public.company_votes TO service_role;

ALTER TABLE public.company_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage company_votes"
  ON public.company_votes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
