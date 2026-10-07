ALTER TABLE public.diagnoses ADD COLUMN IF NOT EXISTS processing_step text;
COMMENT ON COLUMN public.diagnoses.processing_step IS 'Tracks the current AI generation step (body, color, style, etc.)';