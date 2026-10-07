-- VIRUM: Restauração Crítica de Infraestrutura (Profiles e Colunas Faltantes)
-- Este script restaura a tabela profiles e adiciona colunas essenciais na tabela diagnoses
-- que foram perdidas ou não migradas corretamente para o projeto oficial mhvmjgyibehthmglnxge.

DO $$ 
BEGIN
    -- 1. Restaurar tabela profiles se não existir
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
            full_name TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        
        GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
        GRANT ALL ON public.profiles TO service_role;
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
            CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
        END IF;
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
            CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
        END IF;
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
            CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
        END IF;
    END IF;

    -- 2. Restaurar colunas faltantes na tabela diagnoses
    -- processing_step
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'diagnoses' AND column_name = 'processing_step') THEN
        ALTER TABLE public.diagnoses ADD COLUMN processing_step TEXT DEFAULT 'pending';
    END IF;

    -- generated_images
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'diagnoses' AND column_name = 'generated_images') THEN
        ALTER TABLE public.diagnoses ADD COLUMN generated_images JSONB DEFAULT '{}'::jsonb;
    END IF;

END $$;

-- 3. Garantir existência do bucket storage
-- Nota: buckets não podem ser criados via SQL simples em todos os ambientes sem extensões específicas,
-- mas garantimos que a lógica de RLS para ele exista se o bucket for criado.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('diagnosis-photos', 'diagnosis-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage para diagnosis-photos
DO $$
BEGIN
    -- Insert
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can upload diagnosis photos') THEN
        CREATE POLICY "Users can upload diagnosis photos" ON storage.objects 
        FOR INSERT WITH CHECK (bucket_id = 'diagnosis-photos' AND auth.role() = 'authenticated');
    END IF;
    
    -- Select (Público conforme migração 20260228)
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Anyone can view diagnosis photos') THEN
        CREATE POLICY "Anyone can view diagnosis photos" ON storage.objects 
        FOR SELECT USING (bucket_id = 'diagnosis-photos');
    END IF;
END $$;
