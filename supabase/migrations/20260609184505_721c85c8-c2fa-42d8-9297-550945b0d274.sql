
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.monthly_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL UNIQUE REFERENCES public.voting_periods(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  titolo text,
  descrizione text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.monthly_prizes TO authenticated;
GRANT ALL ON public.monthly_prizes TO service_role;

ALTER TABLE public.monthly_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read prizes"
  ON public.monthly_prizes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage prizes"
  ON public.monthly_prizes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_monthly_prizes_updated_at
  BEFORE UPDATE ON public.monthly_prizes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins upload prize images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'prize-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update prize images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'prize-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete prize images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'prize-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read prize images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'prize-images' AND public.has_role(auth.uid(), 'admin'));
