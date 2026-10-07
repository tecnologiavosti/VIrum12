CREATE TABLE public.diagnosis_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id uuid NOT NULL,
  normalized_key text NOT NULL,
  image_url text NOT NULL,
  category text,
  description text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.diagnosis_images TO anon, authenticated;
GRANT ALL ON public.diagnosis_images TO service_role;

CREATE UNIQUE INDEX diagnosis_images_diag_key_uidx
  ON public.diagnosis_images (diagnosis_id, normalized_key);
CREATE INDEX diagnosis_images_diagnosis_idx
  ON public.diagnosis_images (diagnosis_id);

ALTER TABLE public.diagnosis_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view diagnosis image snapshots"
  ON public.diagnosis_images
  FOR SELECT
  USING (true);

CREATE POLICY "Only service role can write diagnosis image snapshots"
  ON public.diagnosis_images
  FOR ALL
  USING (false)
  WITH CHECK (false);