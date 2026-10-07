
CREATE TABLE public.diagnostic_form_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  position int NOT NULL CHECK (position BETWEEN 1 AND 12),
  image_url text NOT NULL,
  image_hd_url text,
  photographer text,
  pexels_id text,
  search_query text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, position)
);

GRANT SELECT ON public.diagnostic_form_images TO anon, authenticated;
GRANT ALL ON public.diagnostic_form_images TO service_role;

ALTER TABLE public.diagnostic_form_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active form images"
  ON public.diagnostic_form_images FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert form images"
  ON public.diagnostic_form_images FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update form images"
  ON public.diagnostic_form_images FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete form images"
  ON public.diagnostic_form_images FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_diagnostic_form_images_updated_at
  BEFORE UPDATE ON public.diagnostic_form_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_diagnostic_form_images_category ON public.diagnostic_form_images (category, position) WHERE is_active = true;
