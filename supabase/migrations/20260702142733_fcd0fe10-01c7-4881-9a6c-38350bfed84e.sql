
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
  v_email text;
  v_unlimited boolean := false;
BEGIN
  v_is_admin := public.has_role(_user_id, 'admin');
  IF v_is_admin THEN
    RETURN jsonb_build_object(
      'is_admin', true, 'has_subscription', false, 'plan_name', null,
      'looks_per_month', 0, 'looks_used', 0, 'looks_remaining', 0,
      'can_download_pdf', false, 'can_share', false
    );
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = _user_id;
  IF lower(coalesce(v_email,'')) = 'usuario@virum.test' THEN
    v_unlimited := true;
  END IF;

  SELECT * INTO v_sub FROM public.subscriptions
    WHERE user_id = _user_id AND status = 'active'
    ORDER BY updated_at DESC NULLS LAST LIMIT 1;

  IF NOT FOUND THEN
    IF v_unlimited THEN
      RETURN jsonb_build_object(
        'is_admin', false, 'has_subscription', true, 'unlimited', true,
        'plan_name', 'Ilimitado (Teste)',
        'looks_per_month', 999999, 'looks_used', 0, 'looks_remaining', 999999,
        'can_download_pdf', true, 'can_share', true
      );
    END IF;
    RETURN jsonb_build_object('is_admin', false, 'has_subscription', false);
  END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id = v_sub.plan_id;
  IF NOT FOUND THEN
    SELECT * INTO v_plan FROM public.plans WHERE name = 'Plano Essencial' LIMIT 1;
  END IF;

  v_period_start := COALESCE(v_sub.current_period_start, date_trunc('month', now()));

  SELECT count(*) INTO v_used FROM public.diagnoses
    WHERE user_id = _user_id
      AND created_at >= v_period_start;

  IF v_unlimited THEN
    RETURN jsonb_build_object(
      'is_admin', false, 'has_subscription', true, 'unlimited', true,
      'plan_id', v_plan.id, 'plan_name', COALESCE(v_plan.name,'') || ' (Ilimitado)',
      'looks_per_month', 999999,
      'looks_used', v_used,
      'looks_remaining', 999999,
      'can_download_pdf', true, 'can_share', true,
      'period_end', v_sub.current_period_end
    );
  END IF;

  RETURN jsonb_build_object(
    'is_admin', false, 'has_subscription', true,
    'plan_id', v_plan.id, 'plan_name', v_plan.name,
    'looks_per_month', v_plan.looks_per_month,
    'looks_used', v_used,
    'looks_remaining', GREATEST(0, v_plan.looks_per_month - v_used),
    'can_download_pdf', COALESCE(v_plan.can_download_pdf, true),
    'can_share', COALESCE(v_plan.can_share, true),
    'period_end', v_sub.current_period_end
  );
END;
$function$;
