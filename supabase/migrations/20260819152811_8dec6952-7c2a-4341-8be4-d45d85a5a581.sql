-- Ensure processing_step exists
ALTER TABLE public.diagnoses ADD COLUMN IF NOT EXISTS processing_step text;
COMMENT ON COLUMN public.diagnoses.processing_step IS 'Tracks the current AI generation step (body, color, style, etc.)';

-- Create monitoring table if missing
CREATE TABLE IF NOT EXISTS public.ai_usage_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnosis_id uuid REFERENCES public.diagnoses(id) ON DELETE CASCADE,
    provider text NOT NULL,
    model text NOT NULL,
    section text NOT NULL,
    tokens_used integer,
    status text NOT NULL,
    error_message text,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_usage_events TO authenticated;
GRANT ALL ON public.ai_usage_events TO service_role;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all usage" ON public.ai_usage_events
    FOR SELECT TO authenticated USING (true);

-- Ensure site_settings exists or at least we know it's missing
CREATE TABLE IF NOT EXISTS public.site_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
