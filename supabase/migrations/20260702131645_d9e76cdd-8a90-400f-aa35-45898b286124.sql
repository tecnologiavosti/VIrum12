
-- Helper: exclude admin user_ids everywhere
-- Uses public.has_role which already exists.

-- 1) admin_get_stats: exclude admins from users, and from diagnoses/subscriptions belonging to admins
CREATE OR REPLACE FUNCTION public.admin_get_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT json_build_object(
    'users', (SELECT count(*) FROM public.profiles p WHERE NOT public.has_role(p.user_id,'admin')),
    'diagnoses', (SELECT count(*) FROM public.diagnoses d WHERE NOT public.has_role(d.user_id,'admin')),
    'active_subscriptions', (SELECT count(*) FROM public.subscriptions s WHERE s.status = 'active' AND NOT public.has_role(s.user_id,'admin'))
  ) INTO result;

  RETURN result;
END;
$function$;

-- 2) admin_financial_stats: exclude admin subs/payments/users
CREATE OR REPLACE FUNCTION public.admin_financial_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT jsonb_build_object(
    'mrr_cents', COALESCE((SELECT sum(pl.price_cents) FROM public.subscriptions s JOIN public.plans pl ON pl.id = s.plan_id WHERE s.status = 'active' AND pl.interval = 'monthly' AND NOT public.has_role(s.user_id,'admin')),0),
    'arr_cents', COALESCE((SELECT sum(pl.price_cents) FROM public.subscriptions s JOIN public.plans pl ON pl.id = s.plan_id WHERE s.status = 'active' AND pl.interval = 'monthly' AND NOT public.has_role(s.user_id,'admin')),0) * 12,
    'total_revenue_cents', COALESCE((SELECT sum(amount_cents) FROM public.payments py WHERE py.status IN ('approved','paid') AND NOT public.has_role(py.user_id,'admin')),0),
    'monthly_revenue_cents', COALESCE((SELECT sum(amount_cents) FROM public.payments py WHERE py.status IN ('approved','paid') AND py.created_at >= date_trunc('month', now()) AND NOT public.has_role(py.user_id,'admin')),0),
    'active_subscriptions', (SELECT count(*) FROM public.subscriptions s WHERE s.status = 'active' AND NOT public.has_role(s.user_id,'admin')),
    'canceled_subscriptions', (SELECT count(*) FROM public.subscriptions s WHERE s.status IN ('canceled','cancelled') AND NOT public.has_role(s.user_id,'admin')),
    'total_users', (SELECT count(*) FROM public.profiles p WHERE NOT public.has_role(p.user_id,'admin')),
    'new_users_month', (SELECT count(*) FROM public.profiles p WHERE p.created_at >= date_trunc('month', now()) AND NOT public.has_role(p.user_id,'admin')),
    'approved_payments', (SELECT count(*) FROM public.payments py WHERE py.status IN ('approved','paid') AND NOT public.has_role(py.user_id,'admin')),
    'failed_payments', (SELECT count(*) FROM public.payments py WHERE py.status IN ('rejected','failed') AND NOT public.has_role(py.user_id,'admin')),
    'avg_ticket_cents', COALESCE((SELECT avg(amount_cents)::int FROM public.payments py WHERE py.status IN ('approved','paid') AND NOT public.has_role(py.user_id,'admin')),0),
    'conversion_rate', CASE WHEN (SELECT count(*) FROM public.profiles p WHERE NOT public.has_role(p.user_id,'admin')) > 0 THEN
      round(((SELECT count(*) FROM public.subscriptions s WHERE s.status='active' AND NOT public.has_role(s.user_id,'admin'))::numeric
             / (SELECT count(*) FROM public.profiles p WHERE NOT public.has_role(p.user_id,'admin'))::numeric) * 100, 2)
      ELSE 0 END,
    'subs_by_plan', COALESCE((SELECT jsonb_agg(jsonb_build_object('plan', pl.name, 'count', cnt))
      FROM (SELECT s.plan_id, count(*) cnt FROM public.subscriptions s WHERE s.status='active' AND NOT public.has_role(s.user_id,'admin') GROUP BY s.plan_id) x
      JOIN public.plans pl ON pl.id = x.plan_id),'[]'::jsonb)
  ) INTO r;
  RETURN r;
END;
$function$;

-- 3) admin_advanced_metrics: exclude admins
CREATE OR REPLACE FUNCTION public.admin_advanced_metrics()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_revenue bigint;
  paying_users int;
  active_subs int;
  total_users int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT COALESCE(sum(amount_cents),0) INTO total_revenue FROM public.payments py WHERE py.status IN ('approved','paid') AND NOT public.has_role(py.user_id,'admin');
  SELECT count(DISTINCT user_id) INTO paying_users FROM public.payments py WHERE py.status IN ('approved','paid') AND NOT public.has_role(py.user_id,'admin');
  SELECT count(*) INTO active_subs FROM public.subscriptions s WHERE s.status='active' AND NOT public.has_role(s.user_id,'admin');
  SELECT count(*) INTO total_users FROM public.profiles p WHERE NOT public.has_role(p.user_id,'admin');

  RETURN jsonb_build_object(
    'ltv_cents', CASE WHEN paying_users > 0 THEN (total_revenue / paying_users)::int ELSE 0 END,
    'paying_users', paying_users,
    'active_subscriptions', active_subs,
    'total_users', total_users,
    'conversion_rate', CASE WHEN total_users>0 THEN round((active_subs::numeric/total_users::numeric)*100,2) ELSE 0 END
  );
END;
$function$;

-- 4) admin_growth_series: exclude admins
CREATE OR REPLACE FUNCTION public.admin_growth_series()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH days AS (
    SELECT generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day')::date AS d
  ),
  users_per_day AS (
    SELECT date_trunc('day', p.created_at)::date AS d, count(*) AS c
    FROM public.profiles p
    WHERE p.created_at >= now() - interval '30 days'
      AND NOT public.has_role(p.user_id,'admin')
    GROUP BY 1
  ),
  revenue_per_day AS (
    SELECT date_trunc('day', py.created_at)::date AS d, sum(py.amount_cents) AS c
    FROM public.payments py
    WHERE py.status IN ('approved','paid')
      AND py.created_at >= now() - interval '30 days'
      AND NOT public.has_role(py.user_id,'admin')
    GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object(
    'date', to_char(days.d,'DD/MM'),
    'users', COALESCE(u.c,0),
    'revenue', COALESCE(r2.c,0) / 100.0
  ) ORDER BY days.d)
  INTO r
  FROM days
  LEFT JOIN users_per_day u ON u.d = days.d
  LEFT JOIN revenue_per_day r2 ON r2.d = days.d;

  RETURN COALESCE(r, '[]'::jsonb);
END;
$function$;

-- 5) admin_plans_overview: exclude admin subs/payments and admins from denominator
CREATE OR REPLACE FUNCTION public.admin_plans_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'plan_id', pl.id,
    'name', pl.name,
    'price_cents', pl.price_cents,
    'subscribers', COALESCE(sub.cnt,0),
    'revenue_cents', COALESCE(pay.total,0),
    'conversion_rate', CASE WHEN (SELECT count(*) FROM public.profiles p WHERE NOT public.has_role(p.user_id,'admin')) > 0
      THEN round((COALESCE(sub.cnt,0)::numeric / (SELECT count(*) FROM public.profiles p WHERE NOT public.has_role(p.user_id,'admin'))::numeric)*100,2)
      ELSE 0 END
  ) ORDER BY pl.sort_order), '[]'::jsonb) INTO r
  FROM public.plans pl
  LEFT JOIN (SELECT s.plan_id, count(*) cnt FROM public.subscriptions s WHERE s.status='active' AND NOT public.has_role(s.user_id,'admin') GROUP BY s.plan_id) sub ON sub.plan_id = pl.id
  LEFT JOIN (SELECT py.plan_id, sum(py.amount_cents) total FROM public.payments py WHERE py.status IN ('approved','paid') AND NOT public.has_role(py.user_id,'admin') GROUP BY py.plan_id) pay ON pay.plan_id = pl.id
  WHERE pl.is_active = true;
  RETURN r;
END;
$function$;

-- 6) admin_list_users_full: hide admin accounts
CREATE OR REPLACE FUNCTION public.admin_list_users_full()
 RETURNS TABLE(user_id uuid, full_name text, email text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, plan_name text, subscription_status text, diagnoses_count bigint, total_spent_cents bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT
    p.user_id,
    p.full_name,
    u.email::text,
    p.created_at,
    u.last_sign_in_at,
    pl.name AS plan_name,
    s.status AS subscription_status,
    (SELECT count(*) FROM public.diagnoses d WHERE d.user_id = p.user_id),
    COALESCE((SELECT sum(amount_cents) FROM public.payments py WHERE py.user_id = p.user_id AND py.status IN ('approved','paid')),0)
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN LATERAL (
    SELECT * FROM public.subscriptions s2 WHERE s2.user_id = p.user_id ORDER BY updated_at DESC NULLS LAST LIMIT 1
  ) s ON true
  LEFT JOIN public.plans pl ON pl.id = s.plan_id
  WHERE NOT public.has_role(p.user_id,'admin')
  ORDER BY p.created_at DESC;
END;
$function$;

-- 7) admin_list_profiles: hide admin accounts
CREATE OR REPLACE FUNCTION public.admin_list_profiles()
 RETURNS SETOF profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY SELECT * FROM public.profiles p
    WHERE NOT public.has_role(p.user_id,'admin')
    ORDER BY p.created_at DESC;
END;
$function$;

-- 8) admin_affiliate_stats: exclude affiliates owned by admins (defensive)
CREATE OR REPLACE FUNCTION public.admin_affiliate_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT jsonb_build_object(
    'total_affiliates', (SELECT count(*) FROM public.affiliates a WHERE NOT public.has_role(a.user_id,'admin')),
    'active_affiliates', (SELECT count(*) FROM public.affiliates a WHERE a.status='active' AND NOT public.has_role(a.user_id,'admin')),
    'total_referrals', (SELECT count(*) FROM public.affiliate_referrals r
                          JOIN public.affiliates a ON a.id = r.affiliate_id
                         WHERE NOT public.has_role(a.user_id,'admin')
                           AND NOT public.has_role(r.referred_user_id,'admin')),
    'paying_referrals', (SELECT count(DISTINCT r.referred_user_id)
                          FROM public.affiliate_referrals r
                          JOIN public.affiliates a ON a.id = r.affiliate_id
                          JOIN public.affiliate_commissions c ON c.referred_user_id = r.referred_user_id
                         WHERE NOT public.has_role(a.user_id,'admin')
                           AND NOT public.has_role(r.referred_user_id,'admin')),
    'total_revenue_cents', COALESCE((SELECT sum(c.plan_amount_cents)
                                       FROM public.affiliate_commissions c
                                       JOIN public.affiliates a ON a.id = c.affiliate_id
                                      WHERE c.status IN ('approved','paid')
                                        AND NOT public.has_role(a.user_id,'admin')
                                        AND NOT public.has_role(c.referred_user_id,'admin')),0),
    'pending_commission_cents', COALESCE((SELECT sum(c.commission_cents)
                                            FROM public.affiliate_commissions c
                                            JOIN public.affiliates a ON a.id = c.affiliate_id
                                           WHERE c.status IN ('pending','approved')
                                             AND NOT public.has_role(a.user_id,'admin')
                                             AND NOT public.has_role(c.referred_user_id,'admin')),0),
    'paid_commission_cents', COALESCE((SELECT sum(c.commission_cents)
                                         FROM public.affiliate_commissions c
                                         JOIN public.affiliates a ON a.id = c.affiliate_id
                                        WHERE c.status='paid'
                                          AND NOT public.has_role(a.user_id,'admin')
                                          AND NOT public.has_role(c.referred_user_id,'admin')),0),
    'commission_percent', COALESCE((SELECT (value#>>'{}')::numeric FROM public.site_settings WHERE key='affiliate_commission_percent'), 20)
  ) INTO r;
  RETURN r;
END;
$function$;

-- 9) admin_list_affiliates: hide admin-owned affiliates
CREATE OR REPLACE FUNCTION public.admin_list_affiliates()
 RETURNS TABLE(affiliate_id uuid, user_id uuid, full_name text, email text, code text, status text, referrals_count bigint, paying_count bigint, total_sold_cents bigint, total_commission_cents bigint, paid_commission_cents bigint, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT
    a.id,
    a.user_id,
    p.full_name,
    u.email::text,
    a.code,
    a.status,
    (SELECT count(*) FROM public.affiliate_referrals r WHERE r.affiliate_id = a.id),
    (SELECT count(DISTINCT c2.referred_user_id) FROM public.affiliate_commissions c2 WHERE c2.affiliate_id = a.id),
    COALESCE((SELECT sum(c3.plan_amount_cents) FROM public.affiliate_commissions c3 WHERE c3.affiliate_id = a.id AND c3.status IN ('approved','paid')),0),
    COALESCE((SELECT sum(c4.commission_cents) FROM public.affiliate_commissions c4 WHERE c4.affiliate_id = a.id AND c4.status IN ('pending','approved','paid')),0),
    COALESCE((SELECT sum(c5.commission_cents) FROM public.affiliate_commissions c5 WHERE c5.affiliate_id = a.id AND c5.status = 'paid'),0),
    a.created_at
  FROM public.affiliates a
  LEFT JOIN public.profiles p ON p.user_id = a.user_id
  LEFT JOIN auth.users u ON u.id = a.user_id
  WHERE NOT public.has_role(a.user_id,'admin')
  ORDER BY a.created_at DESC;
END;
$function$;

-- 10) get_user_plan_access: admins are NOT customers. They cannot consume plans or create diagnoses.
CREATE OR REPLACE FUNCTION public.get_user_plan_access(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_sub record;
  v_plan record;
  v_used int;
  v_period_start timestamptz;
BEGIN
  v_is_admin := public.has_role(_user_id, 'admin');
  IF v_is_admin THEN
    -- Admins are a separate category: no plan, no diagnoses, no shares.
    RETURN jsonb_build_object(
      'is_admin', true,
      'has_subscription', false,
      'plan_name', null,
      'looks_per_month', 0,
      'looks_used', 0,
      'looks_remaining', 0,
      'can_download_pdf', false,
      'can_share', false
    );
  END IF;

  SELECT * INTO v_sub FROM public.subscriptions
    WHERE user_id = _user_id AND status = 'active'
    ORDER BY updated_at DESC NULLS LAST LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('is_admin', false, 'has_subscription', false);
  END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id = v_sub.plan_id;
  IF NOT FOUND THEN
    SELECT * INTO v_plan FROM public.plans WHERE name = 'Plano Essencial' LIMIT 1;
  END IF;

  v_period_start := COALESCE(v_sub.current_period_start, date_trunc('month', now()));

  SELECT count(*) INTO v_used FROM public.diagnoses
    WHERE user_id = _user_id
      AND status IN ('completed','processing')
      AND created_at >= v_period_start;

  RETURN jsonb_build_object(
    'is_admin', false,
    'has_subscription', true,
    'plan_id', v_plan.id,
    'plan_name', v_plan.name,
    'looks_per_month', v_plan.looks_per_month,
    'looks_used', v_used,
    'looks_remaining', GREATEST(0, v_plan.looks_per_month - v_used),
    'can_download_pdf', COALESCE(v_plan.can_download_pdf, true),
    'can_share', COALESCE(v_plan.can_share, true),
    'period_end', v_sub.current_period_end
  );
END;
$function$;

-- 11) handle_new_user: skip affiliate creation and referral binding for admin accounts.
--     (Admins are typically promoted after signup; this is defensive if role exists at insert time.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  full_name_val text;
  new_code text;
  new_affiliate_id uuid;
  ref_code text;
  ref_affiliate_id uuid;
  is_admin boolean;
BEGIN
  full_name_val := new.raw_user_meta_data ->> 'full_name';

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, full_name_val)
  ON CONFLICT (user_id) DO NOTHING;

  is_admin := public.has_role(new.id, 'admin');

  IF NOT is_admin THEN
    new_code := public.generate_affiliate_code(coalesce(full_name_val, split_part(new.email, '@', 1)));
    INSERT INTO public.affiliates (user_id, code)
    VALUES (new.id, new_code)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING id INTO new_affiliate_id;

    ref_code := new.raw_user_meta_data ->> 'referral_code';
    IF ref_code IS NOT NULL AND length(trim(ref_code)) > 0 THEN
      SELECT id INTO ref_affiliate_id
        FROM public.affiliates
       WHERE upper(code) = upper(trim(ref_code))
         AND status = 'active'
         AND user_id <> new.id
       LIMIT 1;
      IF ref_affiliate_id IS NOT NULL THEN
        INSERT INTO public.affiliate_referrals (affiliate_id, referred_user_id, code_used)
        VALUES (ref_affiliate_id, new.id, upper(trim(ref_code)))
        ON CONFLICT (referred_user_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN new;
END;
$function$;

-- 12) process_affiliate_commission: don't generate commissions when the payer is an admin
CREATE OR REPLACE FUNCTION public.process_affiliate_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ref_affiliate_id uuid;
  pct numeric;
  commission_val integer;
BEGIN
  IF NEW.status NOT IN ('approved','paid') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  IF NEW.amount_cents IS NULL OR NEW.amount_cents <= 0 THEN
    RETURN NEW;
  END IF;
  IF public.has_role(NEW.user_id, 'admin') THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.affiliate_commissions WHERE payment_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT r.affiliate_id INTO ref_affiliate_id
    FROM public.affiliate_referrals r
    JOIN public.affiliates a ON a.id = r.affiliate_id
   WHERE r.referred_user_id = NEW.user_id
     AND a.status = 'active'
     AND NOT public.has_role(a.user_id,'admin')
   LIMIT 1;

  IF ref_affiliate_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE((value#>>'{}')::numeric, 20) INTO pct
    FROM public.site_settings WHERE key = 'affiliate_commission_percent';
  IF pct IS NULL THEN pct := 20; END IF;

  commission_val := floor(NEW.amount_cents * pct / 100.0)::int;

  INSERT INTO public.affiliate_commissions (
    affiliate_id, referred_user_id, payment_id, plan_id,
    plan_amount_cents, commission_percent, commission_cents, status
  ) VALUES (
    ref_affiliate_id, NEW.user_id, NEW.id, NEW.plan_id,
    NEW.amount_cents, pct, commission_val, 'pending'
  );

  RETURN NEW;
END;
$function$;
