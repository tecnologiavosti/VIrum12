
-- Revoke default PUBLIC execute on every SECURITY DEFINER function in public schema.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.sig);
  END LOOP;
END $$;

-- Re-grant to the roles that legitimately need to call each function.

-- Public (unauthenticated) endpoints:
GRANT EXECUTE ON FUNCTION public.get_shared_diagnosis(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_look_images(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_clothing_images(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_look_recommendations(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_affiliate_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, uuid, uuid) TO anon, authenticated;

-- Called by RLS policies — must be executable as any effective role:
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

-- Signed-in users only:
GRANT EXECUTE ON FUNCTION public.get_my_affiliate_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_affiliate_payouts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_affiliate_payment_info() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_my_affiliate_payment_info(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_plan_access(uuid) TO authenticated;

-- Admin-only (functions check has_role internally, but only signed-in users can invoke):
GRANT EXECUTE ON FUNCTION public.admin_get_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_affiliate_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_plan(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_suspended(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_commission_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_force_renew(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_financial_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_affiliates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_commission_percent(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_growth_series() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_affiliate_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_plans_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_affiliate_code(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_affiliate_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_affiliate_payout(uuid, integer, text, boolean, text, date, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_affiliate_payout(uuid, integer, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_advanced_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users_full() TO authenticated;

-- Trigger-only / internal (only server-side needs to invoke):
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.process_affiliate_commission() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_affiliate_code(text) TO service_role;
-- slugify_blog_title is IMMUTABLE (not SECURITY DEFINER) but harmless to expose.
