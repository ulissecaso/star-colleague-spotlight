CREATE TABLE public.vote_skips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES public.voting_periods(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  voted_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(period_id, voter_id, voted_id),
  CHECK (voter_id <> voted_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vote_skips TO authenticated;
GRANT ALL ON public.vote_skips TO service_role;
ALTER TABLE public.vote_skips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages skips" ON public.vote_skips FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));