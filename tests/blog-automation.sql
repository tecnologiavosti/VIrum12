-- Run against a disposable DB with the Virum migration installed.
-- All changes are rolled back. Never requires real provider keys.
BEGIN;
DO $$
DECLARE claim jsonb; result jsonb; post_uuid uuid; lease uuid; stamp timestamptz;
BEGIN
 UPDATE public.blog_automation_settings SET enabled=true,local_hour=0,publish_mode='automatic';
 claim:=public.claim_virum_daily_blog(true,NULL);
 lease:=(claim->>'lease_id')::uuid;
 IF lease IS NULL THEN RAISE EXCEPTION 'Claim did not acquire a lease'; END IF;
 result:=public.claim_virum_daily_blog(true,NULL);
 IF result->>'skip'<>'already_running' THEN RAISE EXCEPTION 'Concurrent run was allowed';END IF;
 result:=public.complete_virum_daily_blog((claim->>'day')::date,lease,
  jsonb_build_object('title','Teste de estilo masculino','slug','teste-virum','content','Texto','excerpt','Resumo','ready',true,'cover_image_url','https://example.com/cover.svg','seo_data',jsonb_build_object('editorial_revision',jsonb_build_object('completed',true,'final_audit_approved',false))),'{}');
 post_uuid:=(result->>'post_id')::uuid;
 IF result->>'published'<>'false' OR (SELECT status FROM public.blog_posts WHERE id=post_uuid)<>'draft' THEN RAISE EXCEPTION 'Unapproved article was published';END IF;
 claim:=public.claim_virum_daily_blog(true,post_uuid);
 SELECT updated_at INTO stamp FROM public.blog_posts WHERE id=post_uuid;
 BEGIN
  PERFORM public.complete_virum_daily_blog((claim->>'day')::date,lease,'{}','{}');
  RAISE EXCEPTION 'Stale lease was accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='Stale lease was accepted' THEN RAISE; END IF;
 END;
 result:=public.complete_virum_daily_blog((claim->>'day')::date,(claim->>'lease_id')::uuid,
  jsonb_build_object('title','Teste de estilo masculino','slug','teste-virum','content','Texto','excerpt','Resumo','base_updated_at',stamp,'ready',true,'cover_image_url','https://example.com/cover.svg','seo_data',jsonb_build_object('editorial_revision',jsonb_build_object('completed',true,'final_audit_approved',true))),'{}');
 IF result->>'published'<>'true' OR (SELECT status FROM public.blog_posts WHERE id=post_uuid)<>'published' THEN RAISE EXCEPTION 'Approved article not published';END IF;
 result:=public.claim_virum_daily_blog(true,NULL);
 IF result->>'skip'<>'already_done' THEN RAISE EXCEPTION 'Duplicate daily publication was allowed';END IF;
 IF has_function_privilege('anon','public.claim_virum_daily_blog(boolean,uuid)','EXECUTE') OR has_function_privilege('authenticated','public.complete_virum_daily_blog(date,uuid,jsonb,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Privileged RPC exposed';END IF;
END $$;
ROLLBACK;
