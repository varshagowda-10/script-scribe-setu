CREATE TABLE public.reading_corrections (
  id BIGSERIAL PRIMARY KEY,
  wrong TEXT NOT NULL,
  correct TEXT NOT NULL,
  uses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wrong)
);

GRANT ALL ON public.reading_corrections TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.reading_corrections_id_seq TO service_role;

ALTER TABLE public.reading_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server only access to reading corrections"
ON public.reading_corrections FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_reading_corrections_updated_at
BEFORE UPDATE ON public.reading_corrections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();