
-- ============ 1. TABELAS ============

CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliates_code ON public.affiliates(lower(code));
GRANT SELECT ON public.affiliates TO authenticated;
GRANT ALL ON public.affiliates TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates: owner select"
  ON public.affiliates FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Affiliates: admin select"
  ON public.affiliates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Affiliates: admin update"
  ON public.affiliates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Affiliates: admin delete"
  ON public.affiliates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_affiliates_updated
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code_used text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_referrals_affiliate ON public.affiliate_referrals(affiliate_id);
GRANT SELECT ON public.affiliate_referrals TO authenticated;
GRANT ALL ON public.affiliate_referrals TO service_role;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrals: affiliate owner select"
  ON public.affiliate_referrals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "Referrals: referred user select"
  ON public.affiliate_referrals FOR SELECT TO authenticated
  USING (referred_user_id = auth.uid());
CREATE POLICY "Referrals: admin all"
  ON public.affiliate_referrals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));


CREATE TABLE public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE RESTRICT,
  referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  plan_amount_cents integer NOT NULL,
  commission_percent numeric(5,2) NOT NULL,
  commission_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','canceled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_commissions_affiliate ON public.affiliate_commissions(affiliate_id);
CREATE INDEX idx_commissions_status ON public.affiliate_commissions(status);
CREATE INDEX idx_commissions_payment ON public.affiliate_commissions(payment_id);
GRANT SELECT ON public.affiliate_commissions TO authenticated;
GRANT ALL ON public.affiliate_commissions TO service_role;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Commissions: affiliate owner select"
  ON public.affiliate_commissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "Commissions: admin all"
  ON public.affiliate_commissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_commissions_updated
  BEFORE UPDATE ON public.affiliate_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE RESTRICT,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','canceled')),
  paid_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payouts_affiliate ON public.affiliate_payouts(affiliate_id);
GRANT SELECT ON public.affiliate_payouts TO authenticated;
GRANT ALL ON public.affiliate_payouts TO service_role;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payouts: affiliate owner select"
  ON public.affiliate_payouts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "Payouts: admin all"
  ON public.affiliate_payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_payouts_updated
  BEFORE UPDATE ON public.affiliate_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.affiliate_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.affiliate_audit_log(created_at DESC);
GRANT SELECT ON public.affiliate_audit_log TO authenticated;
GRANT ALL ON public.affiliate_audit_log TO service_role;
ALTER TABLE public.affiliate_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit: admin select"
  ON public.affiliate_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));


-- ============ 2. CONFIG GLOBAL ============
INSERT INTO public.site_settings (key, value)
VALUES ('affiliate_commission_percent', '20'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ============ 3. FUNÇÕES ============

-- Gera código único baseado no nome
CREATE OR REPLACE FUNCTION public.generate_affiliate_code(_full_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  suffix text;
  attempts int := 0;
BEGIN
  -- Normaliza: remove acentos, upper, mantém só A-Z0-9, pega até 6 chars
  base := upper(regexp_replace(
    translate(coalesce(_full_name,''), 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'),
    '[^A-Za-z0-9]', '', 'g'
  ));
  base := substring(base FROM 1 FOR 6);
  IF length(base) < 3 THEN
    base := base || substring(md5(random()::text) FROM 1 FOR (3 - length(base)));
    base := upper(base);
  END IF;

  LOOP
    suffix := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 3));
    candidate := base || suffix;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.affiliates WHERE upper(code) = candidate);
    attempts := attempts + 1;
    IF attempts > 20 THEN
      candidate := base || upper(substring(md5(random()::text) FROM 1 FOR 6));
      EXIT;
    END IF;
  END LOOP;

  RETURN candidate;
END;
$$;

-- Valida código informado no signup
CREATE OR REPLACE FUNCTION public.validate_affiliate_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a record;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Código vazio');
  END IF;
  SELECT id, user_id, code, status INTO a
    FROM public.affiliates
   WHERE upper(code) = upper(trim(_code))
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Código de afiliado inválido');
  END IF;
  IF a.status <> 'active' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Código de afiliado inativo');
  END IF;
  RETURN jsonb_build_object('valid', true, 'affiliate_id', a.id, 'code', a.code);
END;
$$;

-- Admin altera código com verificação de unicidade
CREATE OR REPLACE FUNCTION public.admin_update_affiliate_code(_affiliate_id uuid, _new_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_code text;
  old_code text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  clean_code := upper(regexp_replace(coalesce(_new_code,''), '[^A-Za-z0-9]', '', 'g'));
  IF length(clean_code) < 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código deve ter ao menos 4 caracteres alfanuméricos');
  END IF;
  IF EXISTS (SELECT 1 FROM public.affiliates WHERE upper(code) = clean_code AND id <> _affiliate_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código já em uso por outro afiliado');
  END IF;

  SELECT code INTO old_code FROM public.affiliates WHERE id = _affiliate_id;
  UPDATE public.affiliates SET code = clean_code, updated_at = now() WHERE id = _affiliate_id;

  INSERT INTO public.affiliate_audit_log (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'update_affiliate_code', 'affiliate', _affiliate_id,
    jsonb_build_object('old_code', old_code, 'new_code', clean_code));

  RETURN jsonb_build_object('success', true, 'code', clean_code);
END;
$$;

-- Modifica handle_new_user para criar afiliado + processar referral
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  full_name_val text;
  new_code text;
  new_affiliate_id uuid;
  ref_code text;
  ref_affiliate_id uuid;
BEGIN
  full_name_val := new.raw_user_meta_data ->> 'full_name';

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, full_name_val)
  ON CONFLICT (user_id) DO NOTHING;

  -- Cria o afiliado próprio
  new_code := public.generate_affiliate_code(coalesce(full_name_val, split_part(new.email, '@', 1)));
  INSERT INTO public.affiliates (user_id, code)
  VALUES (new.id, new_code)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO new_affiliate_id;

  -- Processa referral code, se veio nos metadados
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

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============ 4. BACKFILL: criar afiliados para usuários existentes ============
INSERT INTO public.affiliates (user_id, code)
SELECT p.user_id, public.generate_affiliate_code(coalesce(p.full_name, 'USER'))
  FROM public.profiles p
  LEFT JOIN public.affiliates a ON a.user_id = p.user_id
 WHERE a.id IS NULL
ON CONFLICT (user_id) DO NOTHING;
