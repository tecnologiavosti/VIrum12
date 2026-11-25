BEGIN;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS automation_day date;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS seo_data jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS virum_blog_one_daily_post ON public.blog_posts(automation_day) WHERE automation_day IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.blog_automation_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),enabled boolean NOT NULL DEFAULT true,
 local_hour integer NOT NULL DEFAULT 8 CHECK(local_hour BETWEEN 0 AND 23),
 posts_per_day integer NOT NULL DEFAULT 1 CHECK(posts_per_day=1),
 publish_mode text NOT NULL DEFAULT 'automatic' CHECK(publish_mode IN ('automatic','draft')),
 keyword_source text NOT NULL DEFAULT 'editorial' CHECK(keyword_source IN ('google_trends','editorial')),
 topics text[] NOT NULL DEFAULT ARRAY['Estilo masculino','Imagem pessoal masculina','Guarda-roupa masculino','Coloração pessoal','Consultoria de imagem masculina'],
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.blog_automation_settings(id) VALUES(true) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.blog_automation_runs (
 day date PRIMARY KEY,state text NOT NULL DEFAULT 'running' CHECK(state IN ('running','done','failed')),
 lease_id uuid NOT NULL DEFAULT gen_random_uuid(),attempts integer NOT NULL DEFAULT 1,
 started_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz,error text,
 post_id uuid REFERENCES public.blog_posts(id) ON DELETE SET NULL,research jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE OR REPLACE FUNCTION public.is_virum_blog_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=(SELECT auth.uid()) AND role::text='admin');
$$;
REVOKE ALL ON FUNCTION public.is_virum_blog_admin() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_virum_blog_admin() TO authenticated,service_role;
ALTER TABLE public.blog_automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_automation_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS virum_blog_settings_admin ON public.blog_automation_settings;
CREATE POLICY virum_blog_settings_admin ON public.blog_automation_settings FOR ALL TO authenticated USING(public.is_virum_blog_admin()) WITH CHECK(public.is_virum_blog_admin());
DROP POLICY IF EXISTS virum_blog_runs_admin ON public.blog_automation_runs;
CREATE POLICY virum_blog_runs_admin ON public.blog_automation_runs FOR SELECT TO authenticated USING(public.is_virum_blog_admin());
REVOKE ALL ON public.blog_automation_settings,public.blog_automation_runs FROM anon,authenticated;
GRANT SELECT,UPDATE ON public.blog_automation_settings TO authenticated;
GRANT SELECT ON public.blog_automation_runs TO authenticated;
GRANT ALL ON public.blog_automation_settings,public.blog_automation_runs TO service_role;
CREATE OR REPLACE FUNCTION public.claim_virum_daily_blog(p_manual boolean DEFAULT false,p_review_post uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE s public.blog_automation_settings;r public.blog_automation_runs;d date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date;h integer:=extract(hour FROM now() AT TIME ZONE 'America/Sao_Paulo');
BEGIN
 SELECT * INTO s FROM public.blog_automation_settings WHERE id=true FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Configure a automação.';END IF;
 IF NOT p_manual AND (NOT s.enabled OR h<s.local_hour) THEN RETURN jsonb_build_object('skip','not_due');END IF;
 IF cardinality(s.topics)=0 THEN RAISE EXCEPTION 'Informe pelo menos um tema.';END IF;
 IF p_review_post IS NOT NULL THEN
  IF NOT p_manual THEN RAISE EXCEPTION 'Revisão explícita exige administrador.';END IF;
  SELECT day INTO d FROM public.blog_automation_runs WHERE post_id=p_review_post;
  IF NOT FOUND THEN RAISE EXCEPTION 'Artigo sem execução automática.';END IF;
 END IF;
 SELECT * INTO r FROM public.blog_automation_runs WHERE day=d FOR UPDATE;
 IF FOUND THEN
  IF r.post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.blog_posts WHERE id=r.post_id AND status='published') THEN RETURN jsonb_build_object('skip','already_done','post_id',r.post_id);END IF;
  IF r.state='running' AND r.started_at>now()-interval '4 minutes' THEN RETURN jsonb_build_object('skip','already_running');END IF;
  IF NOT p_manual AND (r.attempts>=6 OR (r.started_at>now()-interval '15 minutes' AND NOT COALESCE((r.research->>'source_failure')::boolean,false))) THEN RETURN jsonb_build_object('skip','retry_limit');END IF;
  IF r.state='done' AND s.publish_mode<>'automatic' AND NOT p_manual THEN RETURN jsonb_build_object('skip','draft_mode');END IF;
  UPDATE public.blog_automation_runs SET state='running',lease_id=gen_random_uuid(),started_at=now(),finished_at=NULL,error=NULL,attempts=attempts+1 WHERE day=d RETURNING * INTO r;
 ELSE
  INSERT INTO public.blog_automation_runs(day) VALUES(d) RETURNING * INTO r;
 END IF;
 RETURN jsonb_build_object('day',d,'lease_id',r.lease_id,'post_id',r.post_id,'research',r.research,'settings',to_jsonb(s));
END;$$;
REVOKE ALL ON FUNCTION public.claim_virum_daily_blog(boolean,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_virum_daily_blog(boolean,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.complete_virum_daily_blog(p_day date,p_lease uuid,p_post jsonb,p_research jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE s public.blog_automation_settings;r public.blog_automation_runs;post_uuid uuid;auto_publish boolean;
BEGIN
 SELECT * INTO s FROM public.blog_automation_settings WHERE id=true FOR UPDATE;
 SELECT * INTO r FROM public.blog_automation_runs WHERE day=p_day FOR UPDATE;
 IF NOT FOUND OR r.state<>'running' OR r.lease_id<>p_lease OR r.started_at<now()-interval '4 minutes' THEN RAISE EXCEPTION 'Execução expirada.';END IF;
 auto_publish:=s.enabled AND s.publish_mode='automatic' AND COALESCE((p_post->>'ready')::boolean,false)
  AND COALESCE((p_post->'seo_data'->'editorial_revision'->>'completed')::boolean,false)
  AND COALESCE((p_post->'seo_data'->'editorial_revision'->>'final_audit_approved')::boolean,false)
  AND COALESCE(p_post->>'cover_image_url','')<>'';
 IF r.post_id IS NULL THEN
  INSERT INTO public.blog_posts(title,slug,excerpt,content,cover_image_url,status,published_at,automation_day,seo_data,category,tags)
  VALUES(p_post->>'title',(p_post->>'slug')||'-'||p_day::text,p_post->>'excerpt',p_post->>'content',p_post->>'cover_image_url',CASE WHEN auto_publish THEN 'published' ELSE 'draft' END,CASE WHEN auto_publish THEN now() END,p_day,p_post->'seo_data','Imagem e estilo masculino',ARRAY[COALESCE(p_post->'seo_data'->>'automation_seed','Estilo masculino')]) RETURNING id INTO post_uuid;
 ELSE
  UPDATE public.blog_posts SET title=p_post->>'title',excerpt=p_post->>'excerpt',content=p_post->>'content',cover_image_url=p_post->>'cover_image_url',status=CASE WHEN auto_publish THEN 'published' ELSE 'draft' END,published_at=CASE WHEN auto_publish THEN now() ELSE published_at END,seo_data=p_post->'seo_data',updated_at=now()
  WHERE id=r.post_id AND status<>'published' AND updated_at=(p_post->>'base_updated_at')::timestamptz RETURNING id INTO post_uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'O artigo foi alterado durante a revisão. Atualize o histórico.';END IF;
 END IF;
 UPDATE public.blog_automation_runs SET state='done',finished_at=now(),post_id=post_uuid,research=p_research||jsonb_build_object('published',auto_publish,'revision_base_updated_at',(SELECT updated_at FROM public.blog_posts WHERE id=post_uuid)),error=NULL WHERE day=p_day;
 RETURN jsonb_build_object('post_id',post_uuid,'published',auto_publish);
END;$$;
REVOKE ALL ON FUNCTION public.complete_virum_daily_blog(date,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_virum_daily_blog(date,uuid,jsonb,jsonb) TO service_role;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('blog-covers','blog-covers',true,2000000,ARRAY['image/svg+xml','image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO UPDATE SET allowed_mime_types=(SELECT array_agg(DISTINCT mime) FROM unnest(COALESCE(storage.buckets.allowed_mime_types,ARRAY[]::text[]) || EXCLUDED.allowed_mime_types) AS mime);
DROP POLICY IF EXISTS virum_blog_cover_public ON storage.objects;
CREATE POLICY virum_blog_cover_public ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='blog-covers');
NOTIFY pgrst,'reload schema';
COMMIT;
