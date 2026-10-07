
-- Dashboard geral do programa
CREATE OR REPLACE FUNCTION public.admin_affiliate_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT jsonb_build_object(
    'total_affiliates', (SELECT count(*) FROM public.affiliates),
    'active_affiliates', (SELECT count(*) FROM public.affiliates WHERE status='active'),
    'total_referrals', (SELECT count(*) FROM public.affiliate_referrals),
    'paying_referrals', (SELECT count(DISTINCT r.referred_user_id)
                          FROM public.affiliate_referrals r
                          JOIN public.affiliate_commissions c ON c.referred_user_id = r.referred_user_id),
    'total_revenue_cents', COALESCE((SELECT sum(plan_amount_cents) FROM public.affiliate_commissions WHERE status IN ('approved','paid')),0),
    'pending_commission_cents', COALESCE((SELECT sum(commission_cents) FROM public.affiliate_commissions WHERE status IN ('pending','approved')),0),
    'paid_commission_cents', COALESCE((SELECT sum(commission_cents) FROM public.affiliate_commissions WHERE status='paid'),0),
    'commission_percent', COALESCE((SELECT (value#>>'{}')::numeric FROM public.site_settings WHERE key='affiliate_commission_percent'), 20)
  ) INTO r;
  RETURN r;
END;
$$;

-- Listagem completa de afiliados
CREATE OR REPLACE FUNCTION public.admin_list_affiliates()
RETURNS TABLE(
  affiliate_id uuid,
  user_id uuid,
  full_name text,
  email text,
  code text,
  status text,
  referrals_count bigint,
  paying_count bigint,
  total_sold_cents bigint,
  total_commission_cents bigint,
  paid_commission_cents bigint,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
  ORDER BY a.created_at DESC;
END;
$$;

-- Detalhes completos de um afiliado
CREATE OR REPLACE FUNCTION public.admin_get_affiliate_detail(_affiliate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'affiliate', jsonb_build_object(
      'id', a.id,
      'user_id', a.user_id,
      'full_name', p.full_name,
      'email', u.email,
      'code', a.code,
      'status', a.status,
      'created_at', a.created_at
    ),
    'referrals_count', (SELECT count(*) FROM public.affiliate_referrals r WHERE r.affiliate_id = a.id),
    'paying_count', (SELECT count(DISTINCT c.referred_user_id) FROM public.affiliate_commissions c WHERE c.affiliate_id = a.id),
    'total_sold_cents', COALESCE((SELECT sum(plan_amount_cents) FROM public.affiliate_commissions WHERE affiliate_id = a.id AND status IN ('approved','paid')),0),
    'pending_commission_cents', COALESCE((SELECT sum(commission_cents) FROM public.affiliate_commissions WHERE affiliate_id = a.id AND status IN ('pending','approved')),0),
    'paid_commission_cents', COALESCE((SELECT sum(commission_cents) FROM public.affiliate_commissions WHERE affiliate_id = a.id AND status='paid'),0),
    'referrals', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'referred_user_id', r.referred_user_id,
        'full_name', pr.full_name,
        'email', ru.email,
        'created_at', r.created_at,
        'code_used', r.code_used,
        'has_paid', EXISTS(SELECT 1 FROM public.affiliate_commissions c WHERE c.referred_user_id = r.referred_user_id AND c.affiliate_id = a.id)
      ) ORDER BY r.created_at DESC)
      FROM public.affiliate_referrals r
      LEFT JOIN public.profiles pr ON pr.user_id = r.referred_user_id
      LEFT JOIN auth.users ru ON ru.id = r.referred_user_id
      WHERE r.affiliate_id = a.id
    ), '[]'::jsonb),
    'commissions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id,
        'referred_user_id', c.referred_user_id,
        'referred_name', prc.full_name,
        'referred_email', ruc.email,
        'plan_id', c.plan_id,
        'plan_name', pl.name,
        'plan_amount_cents', c.plan_amount_cents,
        'commission_percent', c.commission_percent,
        'commission_cents', c.commission_cents,
        'status', c.status,
        'created_at', c.created_at
      ) ORDER BY c.created_at DESC)
      FROM public.affiliate_commissions c
      LEFT JOIN public.profiles prc ON prc.user_id = c.referred_user_id
      LEFT JOIN auth.users ruc ON ruc.id = c.referred_user_id
      LEFT JOIN public.plans pl ON pl.id = c.plan_id
      WHERE c.affiliate_id = a.id
    ), '[]'::jsonb),
    'payouts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', po.id,
        'amount_cents', po.amount_cents,
        'status', po.status,
        'paid_at', po.paid_at,
        'notes', po.notes,
        'created_at', po.created_at
      ) ORDER BY po.created_at DESC)
      FROM public.affiliate_payouts po WHERE po.affiliate_id = a.id
    ), '[]'::jsonb)
  ) INTO r
  FROM public.affiliates a
  LEFT JOIN public.profiles p ON p.user_id = a.user_id
  LEFT JOIN auth.users u ON u.id = a.user_id
  WHERE a.id = _affiliate_id;

  RETURN r;
END;
$$;

-- Atualiza percentual global de comissão
CREATE OR REPLACE FUNCTION public.admin_set_commission_percent(_percent numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE old_val numeric;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _percent IS NULL OR _percent < 0 OR _percent > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Percentual deve estar entre 0 e 100');
  END IF;

  SELECT (value#>>'{}')::numeric INTO old_val FROM public.site_settings WHERE key='affiliate_commission_percent';

  INSERT INTO public.site_settings (key, value)
  VALUES ('affiliate_commission_percent', to_jsonb(_percent))
  ON CONFLICT (key) DO UPDATE SET value = to_jsonb(_percent), updated_at = now();

  INSERT INTO public.affiliate_audit_log (actor_id, action, target_type, details)
  VALUES (auth.uid(), 'update_commission_percent', 'setting',
    jsonb_build_object('old', old_val, 'new', _percent));

  RETURN jsonb_build_object('success', true, 'percent', _percent);
END;
$$;

-- Muda status de comissão
CREATE OR REPLACE FUNCTION public.admin_update_commission_status(_commission_id uuid, _status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE old_status text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _status NOT IN ('pending','approved','paid','canceled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Status inválido');
  END IF;

  SELECT status INTO old_status FROM public.affiliate_commissions WHERE id = _commission_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Comissão não encontrada');
  END IF;

  UPDATE public.affiliate_commissions SET status = _status, updated_at = now() WHERE id = _commission_id;

  INSERT INTO public.affiliate_audit_log (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'update_commission_status', 'commission', _commission_id,
    jsonb_build_object('old', old_status, 'new', _status));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Muda status do afiliado
CREATE OR REPLACE FUNCTION public.admin_set_affiliate_status(_affiliate_id uuid, _status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE old_status text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _status NOT IN ('active','inactive') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Status inválido');
  END IF;

  SELECT status INTO old_status FROM public.affiliates WHERE id = _affiliate_id;
  UPDATE public.affiliates SET status = _status, updated_at = now() WHERE id = _affiliate_id;

  INSERT INTO public.affiliate_audit_log (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'update_affiliate_status', 'affiliate', _affiliate_id,
    jsonb_build_object('old', old_status, 'new', _status));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Registra um pagamento ao afiliado
CREATE OR REPLACE FUNCTION public.admin_create_affiliate_payout(_affiliate_id uuid, _amount_cents integer, _notes text DEFAULT NULL, _mark_approved_as_paid boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _amount_cents IS NULL OR _amount_cents <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Valor inválido');
  END IF;

  INSERT INTO public.affiliate_payouts (affiliate_id, amount_cents, status, paid_at, notes, created_by)
  VALUES (_affiliate_id, _amount_cents, 'paid', now(), _notes, auth.uid())
  RETURNING id INTO new_id;

  IF _mark_approved_as_paid THEN
    UPDATE public.affiliate_commissions
       SET status = 'paid', updated_at = now()
     WHERE affiliate_id = _affiliate_id AND status = 'approved';
  END IF;

  INSERT INTO public.affiliate_audit_log (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'create_payout', 'payout', new_id,
    jsonb_build_object('affiliate_id', _affiliate_id, 'amount_cents', _amount_cents));

  RETURN jsonb_build_object('success', true, 'payout_id', new_id);
END;
$$;
