
CREATE TABLE public.affiliate_product_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diagnosis_id UUID NOT NULL REFERENCES public.diagnoses(id) ON DELETE CASCADE,
  look_recommendation_id UUID REFERENCES public.look_recommendations(id) ON DELETE SET NULL,
  normalized_key TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('shopee','shein')),
  product_title TEXT,
  product_price NUMERIC(12,2),
  product_currency TEXT NOT NULL DEFAULT 'BRL',
  product_image_url TEXT,
  product_url TEXT,
  affiliate_url TEXT NOT NULL,
  rank INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX affiliate_product_matches_diag_key_idx
  ON public.affiliate_product_matches (diagnosis_id, normalized_key);

GRANT SELECT ON public.affiliate_product_matches TO authenticated;
GRANT ALL ON public.affiliate_product_matches TO service_role;

ALTER TABLE public.affiliate_product_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners or admins can view affiliate matches"
  ON public.affiliate_product_matches
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.diagnoses d
      WHERE d.id = affiliate_product_matches.diagnosis_id
        AND d.user_id = auth.uid()
    )
  );

INSERT INTO public.site_settings (key, value)
VALUES ('affiliate_products_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES ('affiliate_max_matches_per_piece', '3'::jsonb)
ON CONFLICT (key) DO NOTHING;
