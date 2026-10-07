// Mercado Pago webhook - handles payment, merchant_order, preapproval notifications
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCredential } from '../_shared/creds.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
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

function planDurationMs() { return 30 * 24 * 3600 * 1000; }

async function activateSubscription(admin: ReturnType<typeof createClient>, userId: string, planId: string | null) {
  const now = new Date();
  const end = new Date(now.getTime() + planDurationMs());
  await admin.from('subscriptions').upsert(
    {
      user_id: userId,
      plan_id: planId || null,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: end.toISOString(),
      next_billing_date: end.toISOString(),
      expires_at: end.toISOString(),
      cancel_at_period_end: false,
      updated_at: now.toISOString(),
    },
    { onConflict: 'user_id' as never },
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const url = new URL(req.url);
  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch { /* MP sometimes empty */ }

  await admin.from('webhook_logs').insert({
    provider: 'mercadopago',
    event_type: String(payload.type ?? payload.action ?? url.searchParams.get('type') ?? 'unknown'),
    payload,
    status: 'received',
  });

  try {
    const mpToken = await getMpToken(admin);
    if (!mpToken) throw new Error('No MP token');

    const type = String(payload.type ?? url.searchParams.get('type') ?? '');
    const topic = String(payload.topic ?? url.searchParams.get('topic') ?? '');
    const dataObj = (payload.data as Record<string, unknown>) ?? {};
    const id = dataObj.id ?? payload.id ?? url.searchParams.get('id') ?? url.searchParams.get('data.id');

    if (!id) return new Response('ok', { headers: corsHeaders });

    let resourceUrl = '';
    let kind: 'payment' | 'preapproval' | 'merchant_order' | '' = '';
    if (type === 'payment' || topic === 'payment') {
      resourceUrl = `https://api.mercadopago.com/v1/payments/${id}`; kind = 'payment';
    } else if (type === 'subscription_preapproval' || topic === 'preapproval') {
      resourceUrl = `https://api.mercadopago.com/preapproval/${id}`; kind = 'preapproval';
    } else if (type === 'merchant_order' || topic === 'merchant_order') {
      resourceUrl = `https://api.mercadopago.com/merchant_orders/${id}`; kind = 'merchant_order';
    } else {
      return new Response('ok', { headers: corsHeaders });
    }

    const r = await fetch(resourceUrl, { headers: { Authorization: `Bearer ${mpToken}` } });
    const resource = await r.json();

    if (kind === 'payment') {
      const externalRef = String(resource.external_reference ?? '');
      const [userId, planId] = externalRef.split(':');
      if (userId) {
        const { data: pay } = await admin.from('payments').upsert({
          user_id: userId,
          plan_id: planId || null,
          provider: 'mercadopago',
          provider_payment_id: String(resource.id),
          status: resource.status,
          amount_cents: Math.round(Number(resource.transaction_amount ?? 0) * 100),
          payment_method: resource.payment_method_id ?? null,
          external_reference: externalRef,
          raw_payload: resource,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'provider_payment_id' as never }).select().single();

        await admin.from('payment_events').insert({
          user_id: userId,
          payment_id: pay?.id ?? null,
          event_type: `payment.${resource.status}`,
          provider_event_id: String(resource.id),
          payload: resource,
        });

        if (resource.status === 'approved' && planId) {
          await activateSubscription(admin, userId, planId);
        } else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(String(resource.status))) {
          await admin.from('subscriptions').update({
            status: 'canceled', updated_at: new Date().toISOString(),
          }).eq('user_id', userId);
        }
      }
    } else if (kind === 'merchant_order') {
      // Merchant order may aggregate payments — re-fetch each payment
      const payments = (resource.payments as Array<Record<string, unknown>>) ?? [];
      for (const p of payments) {
        if (p.status === 'approved') {
          const externalRef = String(resource.external_reference ?? '');
          const [userId, planId] = externalRef.split(':');
          if (userId && planId) await activateSubscription(admin, userId, planId);
        }
      }
    } else if (kind === 'preapproval') {
      const externalRef = String(resource.external_reference ?? '');
      const [userId, planId] = externalRef.split(':');
      const mpStatus = String(resource.status ?? '');
      const status = mpStatus === 'authorized' ? 'active' : mpStatus === 'cancelled' ? 'canceled' : 'pending';
      if (userId) {
        await admin.from('subscriptions').upsert(
          {
            user_id: userId,
            plan_id: planId || null,
            status,
            mercadopago_id: String(resource.id),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' as never },
        );
      }
    }

    return new Response('ok', { headers: corsHeaders });
  } catch (e) {
    console.error('webhook error', e);
    await admin.from('webhook_logs').insert({
      provider: 'mercadopago', event_type: 'error', payload, status: 'error', error: String(e),
    });
    return new Response('ok', { headers: corsHeaders });
  }
});
