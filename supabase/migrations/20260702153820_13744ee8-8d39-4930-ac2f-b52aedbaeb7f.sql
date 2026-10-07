ALTER TABLE public.clothing_images ADD COLUMN IF NOT EXISTS needs_regen boolean NOT NULL DEFAULT false;
-- Marcar todas as imagens antigas (anteriores a esta migration) como candidatas à regeneração
UPDATE public.clothing_images SET needs_regen = true WHERE needs_regen = false AND created_at < now();
CREATE INDEX IF NOT EXISTS idx_clothing_images_needs_regen ON public.clothing_images(needs_regen) WHERE needs_regen = true;