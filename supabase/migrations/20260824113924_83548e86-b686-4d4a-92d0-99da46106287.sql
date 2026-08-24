CREATE TABLE public.manuscript_results (
  image_hash TEXT PRIMARY KEY,
  hale_kannada TEXT NOT NULL,
  hosa_kannada TEXT NOT NULL,
  english TEXT NOT NULL,
  confidence NUMERIC,
  confidence_basis TEXT,
  ocr_engine TEXT,
  raw_ocr TEXT,
  glossary JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.manuscript_results TO anon;
GRANT SELECT ON public.manuscript_results TO authenticated;
GRANT ALL ON public.manuscript_results TO service_role;

ALTER TABLE public.manuscript_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cached results are publicly readable"
ON public.manuscript_results FOR SELECT
TO anon, authenticated
USING (true);