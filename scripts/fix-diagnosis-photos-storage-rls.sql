-- ============================================================================
-- VIRUM — Correção de RLS do bucket `diagnosis-photos`
-- Executar NO PROJETO OFICIAL: mhvmjgyibehthmglnxge (SQL Editor)
--
-- Causa raiz: as policies de storage.objects deste bucket não existem neste
-- banco (as migrations foram aplicadas apenas no banco antigo). Sem policy de
-- INSERT/UPDATE, todo upload retorna:
--   "new row violates row-level security policy"
--
-- Nenhuma policy permissiva (USING true) para escrita, nenhum SECURITY DEFINER,
-- RLS permanece habilitado. Caminho usado pelo app: `<auth.uid()>/<diagnosis_id>/<tipo>.<ext>`
-- ============================================================================

-- 1) Garante que o bucket existe e é público apenas para LEITURA de imagens.
INSERT INTO storage.buckets (id, name, public)
VALUES ('diagnosis-photos', 'diagnosis-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2) Limpa policies antigas/duplicadas deste bucket.
DROP POLICY IF EXISTS "Users can upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for diagnosis photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "diagnosis_photos_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "diagnosis_photos_update_own" ON storage.objects;
DROP POLICY IF EXISTS "diagnosis_photos_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "diagnosis_photos_public_read" ON storage.objects;

-- 3) Policies corretas: o dono é a 1ª pasta do caminho = auth.uid().
CREATE POLICY "diagnosis_photos_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'diagnosis-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "diagnosis_photos_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'diagnosis-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'diagnosis-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "diagnosis_photos_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'diagnosis-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Leitura pública apenas deste bucket (as URLs públicas são usadas no dossiê/PDF).
CREATE POLICY "diagnosis_photos_public_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'diagnosis-photos');

-- 4) Verificação (deve retornar as 4 policies acima).
SELECT policyname, cmd, roles::text, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname LIKE 'diagnosis_photos%';
