
-- 1) Payment info table
CREATE TABLE public.affiliate_payment_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL UNIQUE REFERENCES public.affiliates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pix_key_type text NOT NULL CHECK (pix_key_type IN ('cpf','email','phone','random')),
  pix_key text NOT NULL,
  holder_name text NOT NULL,
  holder_cpf text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_payment_info TO authenticated;
GRANT ALL ON public.affiliate_payment_info TO service_role;

ALTER TABLE public.affiliate_payment_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own payment info"
  ON public.affiliate_payment_info FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owner can upsert own payment info"
  ON public.affiliate_payment_info FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can update own payment info"
  ON public.affiliate_payment_info FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all payment info"
  ON public.affiliate_payment_info FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_affiliate_payment_info_updated_at
  BEFORE UPDATE ON public.affiliate_payment_info
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Extend affiliate_payouts
ALTER TABLE public.affiliate_payouts
  ADD COLUMN IF NOT EXISTS receipt_url text,
  ADD COLUMN IF NOT EXISTS payment_date date,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date;

-- 3) Storage RLS on affiliate-receipts bucket
-- Path convention: <affiliate_id>/<file>
CREATE POLICY "Admins upload affiliate receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'affiliate-receipts' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins manage affiliate receipts"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'affiliate-receipts' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'affiliate-receipts' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Affiliate reads own receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'affiliate-receipts'
    AND EXISTS (
      SELECT 1 FROM public.affiliates a
      WHERE a.user_id = auth.uid()
        AND (storage.foldername(name))[1] = a.id::text
    )
  );

-- 4) RPCs for affiliate self-service
CREATE OR REPLACE FUNCTION public.get_my_affiliate_payment_info()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  r jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT to_jsonb(pi.*) INTO r
    FROM public.affiliate_payment_info pi
    JOIN public.affiliates a ON a.id = pi.affiliate_id
   WHERE a.user_id = uid
   LIMIT 1;
  RETURN COALESCE(r, 'null'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_my_affiliate_payment_info(
  _pix_key_type text,
  _pix_key text,
  _holder_name text,
  _holder_cpf text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  aff_id uuid;
  cpf_clean text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _pix_key_type NOT IN ('cpf','email','phone','random') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tipo de chave PIX inválido');
  END IF;
  IF _pix_key IS NULL OR length(trim(_pix_key)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chave PIX inválida');
  END IF;
  IF _holder_name IS NULL OR length(trim(_holder_name)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome do titular inválido');
  END IF;
  cpf_clean := regexp_replace(coalesce(_holder_cpf,''), '\D', '', 'g');
  IF length(cpf_clean) <> 11 THEN
    RETURN jsonb_build_object('success', false, 'error', 'CPF deve conter 11 dígitos');
  END IF;
  IF _pix_key_type = 'email' AND _pix_key !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email PIX inválido');
  END IF;

  SELECT id INTO aff_id FROM public.affiliates WHERE user_id = uid LIMIT 1;
  IF aff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Afiliado não encontrado');
  END IF;

  INSERT INTO public.affiliate_payment_info (affiliate_id, user_id, pix_key_type, pix_key, holder_name, holder_cpf)
  VALUES (aff_id, uid, _pix_key_type, trim(_pix_key), trim(_holder_name), cpf_clean)
  ON CONFLICT (affiliate_id) DO UPDATE
    SET pix_key_type = EXCLUDED.pix_key_type,
        pix_key = EXCLUDED.pix_key,
        holder_name = EXCLUDED.holder_name,
        holder_cpf = EXCLUDED.holder_cpf,
        updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_affiliate_payouts()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  aff_id uuid;
  r jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO aff_id FROM public.affiliates WHERE user_id = uid LIMIT 1;
  IF aff_id IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', po.id,
    'amount_cents', po.amount_cents,
    'status', po.status,
    'payment_date', po.payment_date,
    'period_start', po.period_start,
    'period_end', po.period_end,
    'notes', po.notes,
    'receipt_url', po.receipt_url,
    'created_at', po.created_at
  ) ORDER BY po.created_at DESC), '[]'::jsonb) INTO r
  FROM public.affiliate_payouts po
  WHERE po.affiliate_id = aff_id;

  RETURN r;
END;
$$;

-- 5) Update admin_get_affiliate_detail to include payment_info + richer payout fields
CREATE OR REPLACE FUNCTION public.admin_get_affiliate_detail(_affiliate_id uuid)
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
    'affiliate', jsonb_build_object(
      'id', a.id,
      'user_id', a.user_id,
      'full_name', p.full_name,
      'email', u.email,
      'code', a.code,
      'status', a.status,
      'created_at', a.created_at
    ),
    'payment_info', (SELECT to_jsonb(pi.*) FROM public.affiliate_payment_info pi WHERE pi.affiliate_id = a.id),
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
        'payment_date', po.payment_date,
        'period_start', po.period_start,
        'period_end', po.period_end,
        'notes', po.notes,
        'receipt_url', po.receipt_url,
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
$function$;

-- 6) Extend admin_create_affiliate_payout with receipt/date/period
CREATE OR REPLACE FUNCTION public.admin_create_affiliate_payout(
  _affiliate_id uuid,
  _amount_cents integer,
  _notes text DEFAULT NULL,
  _mark_approved_as_paid boolean DEFAULT true,
  _receipt_url text DEFAULT NULL,
  _payment_date date DEFAULT NULL,
  _period_start date DEFAULT NULL,
  _period_end date DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _amount_cents IS NULL OR _amount_cents <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Valor inválido');
  END IF;

  INSERT INTO public.affiliate_payouts (
    affiliate_id, amount_cents, status, paid_at, notes, created_by,
    receipt_url, payment_date, period_start, period_end
  ) VALUES (
    _affiliate_id, _amount_cents, 'paid',
    COALESCE(_payment_date::timestamptz, now()),
    _notes, auth.uid(),
    _receipt_url, COALESCE(_payment_date, current_date), _period_start, _period_end
  )
  RETURNING id INTO new_id;

  IF _mark_approved_as_paid THEN
    UPDATE public.affiliate_commissions
       SET status = 'paid', updated_at = now()
     WHERE affiliate_id = _affiliate_id AND status IN ('pending','approved');
  END IF;

  INSERT INTO public.affiliate_audit_log (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'create_payout', 'payout', new_id,
    jsonb_build_object('affiliate_id', _affiliate_id, 'amount_cents', _amount_cents, 'receipt_url', _receipt_url));

  RETURN jsonb_build_object('success', true, 'payout_id', new_id);
END;
$$;
