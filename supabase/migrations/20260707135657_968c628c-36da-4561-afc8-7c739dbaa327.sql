
DROP POLICY IF EXISTS "Anyone can view clothing images" ON public.clothing_images;
DROP POLICY IF EXISTS "Authenticated users can insert clothing images" ON public.clothing_images;
DROP POLICY IF EXISTS "Anyone can view look images" ON public.look_images;
DROP POLICY IF EXISTS "Anyone can view shared look recommendations" ON public.look_recommendations;

CREATE POLICY "Users can view own clothing images"
  ON public.clothing_images FOR SELECT
  TO authenticated
  USING (
    diagnosis_id IS NULL
    OR EXISTS (SELECT 1 FROM public.diagnoses d WHERE d.id = clothing_images.diagnosis_id AND d.user_id = auth.uid())
  );

CREATE POLICY "Users can view own look images"
  ON public.look_images FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.diagnoses d WHERE d.id = look_images.diagnosis_id AND d.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.get_shared_look_images(_token text)
RETURNS TABLE(look_name text, image_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT li.look_name, li.image_url
  FROM public.look_images li
  JOIN public.diagnoses d ON d.id = li.diagnosis_id
  WHERE _token IS NOT NULL AND length(_token) >= 16 AND d.share_token = _token;
$$;

CREATE OR REPLACE FUNCTION public.get_shared_clothing_images(_token text)
RETURNS TABLE(piece_key text, normalized_key text, image_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ci.piece_key, ci.normalized_key, ci.image_url
  FROM public.clothing_images ci
  JOIN public.diagnoses d ON d.id = ci.diagnosis_id
  WHERE _token IS NOT NULL AND length(_token) >= 16 AND d.share_token = _token;
$$;

CREATE OR REPLACE FUNCTION public.get_shared_look_recommendations(_token text)
RETURNS SETOF public.look_recommendations
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lr.*
  FROM public.look_recommendations lr
  JOIN public.diagnoses d ON d.id = lr.diagnosis_id
  WHERE _token IS NOT NULL AND length(_token) >= 16 AND d.share_token = _token;
$$;

REVOKE EXECUTE ON FUNCTION public.get_shared_look_images(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_shared_clothing_images(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_shared_look_recommendations(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_look_images(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_clothing_images(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_look_recommendations(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Public read access for diagnosis photos" ON storage.objects;

REVOKE EXECUTE ON FUNCTION public.admin_get_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_affiliate_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_grant_plan(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_suspended(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_commission_status(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_force_renew(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_financial_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_affiliates() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_user_detail(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_commission_percent(numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_growth_series() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_affiliate_detail(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_plans_overview() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_affiliate_code(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_remove_plan(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_affiliate_status(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_affiliate_payout(uuid, integer, text, boolean, text, date, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_affiliate_payout(uuid, integer, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_advanced_metrics() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users_full() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_affiliate_dashboard() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_affiliate_payouts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_affiliate_payment_info() FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_my_affiliate_payment_info(text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_plan_access(uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_affiliate_commission() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_affiliate_code(text) FROM anon, authenticated;
