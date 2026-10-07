
-- Storage policies for the new private bucket "diagnostic-form-images".
-- Admins can upload/update/delete; any authenticated user can read
-- (form is behind auth via RequireUser).
CREATE POLICY "Admins upload diagnostic form images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'diagnostic-form-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update diagnostic form images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'diagnostic-form-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete diagnostic form images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'diagnostic-form-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read diagnostic form images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'diagnostic-form-images');

-- Add storage_path column for manual upload tracking
ALTER TABLE public.diagnostic_form_images
  ADD COLUMN IF NOT EXISTS storage_path text;
