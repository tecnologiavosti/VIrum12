
CREATE OR REPLACE FUNCTION public.get_my_affiliate_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  a record;
  r jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO a FROM public.affiliates WHERE user_id = uid LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('has_affiliate', false);
  END IF;

  SELECT jsonb_build_object(
    'has_affiliate', true,
    'affiliate', jsonb_build_object(
      'id', a.id,
      'code', a.code,
      'status', a.status,
      'created_at', a.created_at
    ),
    'referrals_count', (SELECT count(*) FROM public.affiliate_referrals WHERE affiliate_id = a.id),
    'paying_count', (SELECT count(DISTINCT referred_user_id) FROM public.affiliate_commissions WHERE affiliate_id = a.id),
    'total_sold_cents', COALESCE((SELECT sum(plan_amount_cents) FROM public.affiliate_commissions WHERE affiliate_id = a.id AND status IN ('approved','paid')),0),
    'pending_commission_cents', COALESCE((SELECT sum(commission_cents) FROM public.affiliate_commissions WHERE affiliate_id = a.id AND status='pending'),0),
    'approved_commission_cents', COALESCE((SELECT sum(commission_cents) FROM public.affiliate_commissions WHERE affiliate_id = a.id AND status='approved'),0),
    'paid_commission_cents', COALESCE((SELECT sum(commission_cents) FROM public.affiliate_commissions WHERE affiliate_id = a.id AND status='paid'),0),
    'referrals', COALESCE((
      SELECT jsonb_agg(x ORDER BY x->>'created_at' DESC) FROM (
        SELECT jsonb_build_object(
          'referred_user_id', r.referred_user_id,
          'full_name', pr.full_name,
          'email', ru.email,
          'created_at', r.created_at,
          'plan_name', (
            SELECT pl.name FROM public.affiliate_commissions c
            LEFT JOIN public.plans pl ON pl.id = c.plan_id
            WHERE c.affiliate_id = a.id AND c.referred_user_id = r.referred_user_id
            ORDER BY c.created_at DESC LIMIT 1
          ),
          'plan_amount_cents', COALESCE((
            SELECT sum(plan_amount_cents) FROM public.affiliate_commissions
            WHERE affiliate_id = a.id AND referred_user_id = r.referred_user_id AND status IN ('approved','paid')
          ),0),
          'commission_cents', COALESCE((
            SELECT sum(commission_cents) FROM public.affiliate_commissions
            WHERE affiliate_id = a.id AND referred_user_id = r.referred_user_id AND status IN ('pending','approved','paid')
          ),0),
          'purchase_status', COALESCE((
            SELECT status FROM public.affiliate_commissions
            WHERE affiliate_id = a.id AND referred_user_id = r.referred_user_id
            ORDER BY created_at DESC LIMIT 1
          ), 'no_purchase')
        ) AS x
        FROM public.affiliate_referrals r
        LEFT JOIN public.profiles pr ON pr.user_id = r.referred_user_id
        LEFT JOIN auth.users ru ON ru.id = r.referred_user_id
        WHERE r.affiliate_id = a.id
      ) sub
    ), '[]'::jsonb)
  ) INTO r;

  RETURN r;
END;
$$;
