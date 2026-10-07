
-- Índice para evitar duplicação de comissão por pagamento
CREATE UNIQUE INDEX IF NOT EXISTS uniq_commission_payment
  ON public.affiliate_commissions(payment_id)
  WHERE payment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.process_affiliate_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_affiliate_id uuid;
  pct numeric;
  commission_val integer;
BEGIN
  -- Só age quando o pagamento está aprovado/pago
  IF NEW.status NOT IN ('approved','paid') THEN
    RETURN NEW;
  END IF;

  -- Só nova aprovação (evita reprocessar UPDATEs sem mudança de status)
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.amount_cents IS NULL OR NEW.amount_cents <= 0 THEN
    RETURN NEW;
  END IF;

  -- Já existe comissão para esse pagamento?
  IF EXISTS (SELECT 1 FROM public.affiliate_commissions WHERE payment_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Localiza o afiliado que indicou esse usuário
  SELECT r.affiliate_id INTO ref_affiliate_id
    FROM public.affiliate_referrals r
    JOIN public.affiliates a ON a.id = r.affiliate_id
   WHERE r.referred_user_id = NEW.user_id
     AND a.status = 'active'
   LIMIT 1;

  IF ref_affiliate_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Percentual global vigente
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
$$;

DROP TRIGGER IF EXISTS trg_payments_affiliate_commission ON public.payments;
CREATE TRIGGER trg_payments_affiliate_commission
  AFTER INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.process_affiliate_commission();

-- Backfill: gera comissão para pagamentos aprovados anteriores cujo cliente foi indicado
INSERT INTO public.affiliate_commissions (
  affiliate_id, referred_user_id, payment_id, plan_id,
  plan_amount_cents, commission_percent, commission_cents, status
)
SELECT
  r.affiliate_id,
  p.user_id,
  p.id,
  p.plan_id,
  p.amount_cents,
  COALESCE((SELECT (value#>>'{}')::numeric FROM public.site_settings WHERE key='affiliate_commission_percent'), 20),
  floor(p.amount_cents * COALESCE((SELECT (value#>>'{}')::numeric FROM public.site_settings WHERE key='affiliate_commission_percent'), 20) / 100.0)::int,
  'pending'
FROM public.payments p
JOIN public.affiliate_referrals r ON r.referred_user_id = p.user_id
JOIN public.affiliates a ON a.id = r.affiliate_id AND a.status = 'active'
WHERE p.status IN ('approved','paid')
  AND p.amount_cents > 0
  AND NOT EXISTS (SELECT 1 FROM public.affiliate_commissions c WHERE c.payment_id = p.id);
