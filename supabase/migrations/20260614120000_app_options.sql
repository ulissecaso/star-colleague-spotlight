CREATE TABLE IF NOT EXISTS public.app_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('reparto', 'negozio')),
  valore TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tipo, valore)
);

ALTER TABLE public.app_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON public.app_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
