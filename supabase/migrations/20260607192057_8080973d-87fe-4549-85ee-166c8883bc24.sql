
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');
CREATE TYPE public.vote_criterion AS ENUM (
  'collaborazione','professionalita','affidabilita','disponibilita',
  'atteggiamento_positivo','comunicazione','problem_solving','spirito_aziendale'
);
CREATE TYPE public.period_status AS ENUM ('open', 'closed');

-- Employees (anagrafica)
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  telefono TEXT,
  codice_accesso TEXT NOT NULL UNIQUE,
  mansione TEXT NOT NULL,
  negozio TEXT NOT NULL,
  data_assunzione DATE,
  foto_url TEXT,
  attivo BOOLEAN NOT NULL DEFAULT true,
  escluso_premi BOOLEAN NOT NULL DEFAULT false,
  motivo_esclusione TEXT,
  device_id TEXT,
  session_token TEXT UNIQUE,
  primo_accesso_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_employees_attivo ON public.employees(attivo);
CREATE INDEX idx_employees_session ON public.employees(session_token);

-- Voting periods
CREATE TABLE public.voting_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anno INTEGER NOT NULL,
  mese INTEGER NOT NULL CHECK (mese BETWEEN 1 AND 12),
  status public.period_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(anno, mese)
);

-- Votes (8 criteri x voter x voted x period)
CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES public.voting_periods(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  voted_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  criterio public.vote_criterion NOT NULL,
  punteggio SMALLINT NOT NULL CHECK (punteggio BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_fingerprint TEXT,
  ip_address TEXT,
  user_agent TEXT,
  CONSTRAINT no_self_vote CHECK (voter_id <> voted_id),
  UNIQUE(period_id, voter_id, voted_id, criterio)
);
CREATE INDEX idx_votes_period ON public.votes(period_id);
CREATE INDEX idx_votes_voted ON public.votes(voted_id);

-- Comments (anonimi)
CREATE TABLE public.vote_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES public.voting_periods(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  voted_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  punto_forza TEXT,
  suggerimento TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_comment CHECK (voter_id <> voted_id),
  UNIQUE(period_id, voter_id, voted_id)
);

-- Disciplinary actions
CREATE TABLE public.disciplinary_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  descrizione TEXT NOT NULL,
  penalita SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log antifrode
CREATE TABLE public.vote_audit (
  id BIGSERIAL PRIMARY KEY,
  period_id UUID,
  voter_id UUID,
  voted_id UUID,
  event TEXT NOT NULL,
  meta JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (admin)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Monthly winners
CREATE TABLE public.monthly_winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES public.voting_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  team_score NUMERIC(5,2) NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'aziendale',
  scope_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(period_id, categoria, scope_value)
);

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voting_periods TO authenticated;
GRANT ALL ON public.voting_periods TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.votes TO authenticated;
GRANT ALL ON public.votes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vote_comments TO authenticated;
GRANT ALL ON public.vote_comments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.disciplinary_actions TO authenticated;
GRANT ALL ON public.disciplinary_actions TO service_role;

GRANT SELECT, INSERT ON public.vote_audit TO authenticated;
GRANT ALL ON public.vote_audit TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_winners TO authenticated;
GRANT ALL ON public.monthly_winners TO service_role;

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinary_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_winners ENABLE ROW LEVEL SECURITY;

-- Policies: tutto passa attraverso server functions con supabaseAdmin.
-- Admin autenticati: accesso completo.
CREATE POLICY "Admins manage employees" ON public.employees FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage periods" ON public.voting_periods FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage votes" ON public.votes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage comments" ON public.vote_comments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage disciplinary" ON public.disciplinary_actions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read audit" ON public.vote_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage winners" ON public.monthly_winners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
