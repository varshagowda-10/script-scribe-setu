CREATE TABLE public.lexicon_entries (
  id BIGSERIAL PRIMARY KEY,
  hale TEXT NOT NULL,
  hosa TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX lexicon_entries_hale_idx ON public.lexicon_entries (hale);

GRANT ALL ON public.lexicon_entries TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.lexicon_entries_id_seq TO service_role;

ALTER TABLE public.lexicon_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages the lexicon"
ON public.lexicon_entries FOR ALL TO service_role
USING (true) WITH CHECK (true);