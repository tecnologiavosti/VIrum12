// Mercado Pago Checkout Pro - creates a preference and returns init_point
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCredential } from '../_shared/creds.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getMpToken(admin: ReturnType<typeof createClient>) {
  const envToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
  if (envToken) return envToken;
  const enc = await getCredential(admin, 'MERCADO_PAGO_ACCESS_TOKEN');
  if (enc) return enc;
  const { data } = await admin.from('site_settings').select('value').eq('key', 'mp_access_token').single();
  const v = data?.value as unknown;
  return typeof v === 'string' ? v : String(v ?? '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const token = authHeader.replace('Bearer ', '');
    const { data: claims } = await supabase.auth.getClaims(token);
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string) || 'user@virum.com';

    const { plan_id, success_url, failure_url, pending_url, coupon_code } = await req.json();
    if (!plan_id) {
      return new Response(JSON.stringify({ error: 'plan_id required' }), { status: 400, headers: corsHeaders });
    }

    const { data: plan } = await admin.from('plans').select('*').eq('id', plan_id).single();
    if (!plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404, headers: corsHeaders });
    }

    let finalCents: number = plan.price_cents;
    let discountCents = 0;
    let couponId: string | null = null;
    let couponCode: string | null = null;

    if (coupon_code && typeof coupon_code === 'string') {
      const { data: cval } = await admin.rpc('validate_coupon', {
        _code: coupon_code,
        _plan_id: plan.id,
        _user_id: userId,
      });
      const v = cval as { valid: boolean; final_cents?: number; discount_cents?: number; coupon_id?: string; code?: string; error?: string } | null;
      if (!v?.valid) {
        return new Response(JSON.stringify({ error: v?.error || 'Cupom inválido' }), { status: 400, headers: corsHeaders });
      }
      finalCents = v.final_cents ?? plan.price_cents;
      discountCents = v.discount_cents ?? 0;
      couponId = v.coupon_id ?? null;
      couponCode = v.code ?? coupon_code;
    }

    const mpToken = await getMpToken(admin);
    if (!mpToken) throw new Error('MP token not configured');

    const origin = req.headers.get('origin') ?? 'https://virum.com.br';
    const externalReference = `${userId}:${plan.id}:${crypto.randomUUID()}`;
    const amount = Number((finalCents / 100).toFixed(2));

    const prefBody = {
      items: [{
        id: plan.id,
        title: plan.name,
        description: plan.description ?? `Assinatura ${plan.name}`,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: amount,
      }],
      payer: { email: userEmail },
      back_urls: {
        success: success_url || `${origin}/payment-success`,
        failure: failure_url || `${origin}/payment-failed`,
        pending: pending_url || `${origin}/payment-success?status=pending`,
      },
      auto_return: 'approved',
      external_reference: externalReference,
      metadata: { user_id: userId, plan_id: plan.id, coupon_code: couponCode, discount_cents: discountCents },
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`,
      statement_descriptor: 'VIRUM',
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mpToken}` },
      body: JSON.stringify(prefBody),
    });
    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error('MP error', mpData);
      return new Response(JSON.stringify({ error: 'mp_error', detail: mpData }), { status: 502, headers: corsHeaders });
    }

    await admin.from('subscriptions').upsert(
      {
        user_id: userId,
        plan_id: plan.id,
        plan: 'monthly',
        status: 'pending',
        mercadopago_id: mpData.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' as never },
    );

    await admin.from('payment_events').insert({
      user_id: userId,
      event_type: 'checkout_created',
      provider_event_id: mpData.id,
      payload: { external_reference: externalReference, plan_id: plan.id, amount_cents: finalCents, original_cents: plan.price_cents, discount_cents: discountCents, coupon_code: couponCode, coupon_id: couponId },
    });

    return new Response(
      JSON.stringify({ init_point: mpData.init_point, preference_id: mpData.id, final_cents: finalCents, discount_cents: discountCents }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
