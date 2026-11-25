-- Execute after deploying daily-blog-post and configuring Edge Function secrets.
-- In Vault, create virum_blog_cron_secret with the SAME value as
-- BLOG_AUTOMATION_CRON_SECRET (at least 32 characters). Never store Tavily here.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name='virum_blog_cron_secret' AND length(decrypted_secret)>=32) THEN
  RAISE EXCEPTION 'Cadastre virum_blog_cron_secret no Vault antes de ativar o agendador.';
 END IF;
END $$;
SELECT cron.schedule('virum-daily-blog','*/3 * * * *',$job$
 SELECT net.http_post(
  url:='https://mhvmjgyibehthmglnxge.supabase.co/functions/v1/daily-blog-post',
  headers:=jsonb_build_object('Content-Type','application/json','x-blog-cron-secret',
   (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='virum_blog_cron_secret' LIMIT 1)),
  body:='{}'::jsonb,timeout_milliseconds:=150000
 );
$job$);
