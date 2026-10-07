// Pulls latest status from Mercado Pago for the user's subscription/preapproval and reconciles.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCredential } from '../_shared/creds.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const mpToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
      || (await getCredential(admin, 'MERCADO_PAGO_ACCESS_TOKEN'))
      || ((await admin.from('site_settings').select('value').eq('key','mp_access_token').single()).data?.value as string);
    if (!mpToken || typeof mpToken !== 'string') {
      return new Response(JSON.stringify({ error: 'MP not configured' }), { status: 500, headers: corsHeaders });
    }

    // Search recent payments with this user's external_reference prefix
    const search = await fetch(
      `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=10&external_reference=${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${mpToken}` } },
    );
    const json = await search.json();
    const results = (json.results as Array<Record<string, unknown>>) ?? [];

    let activated = false;
    for (const p of results) {
      const extRef = String(p.external_reference ?? '');
      if (!extRef.startsWith(userId + ':')) continue;
      const [, planId] = extRef.split(':');
      await admin.from('payments').upsert({
        user_id: userId,
        plan_id: planId || null,
        provider: 'mercadopago',
        provider_payment_id: String(p.id),
        status: p.status,
        amount_cents: Math.round(Number(p.transaction_amount ?? 0) * 100),
        payment_method: p.payment_method_id ?? null,
        external_reference: extRef,
        raw_payload: p,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'provider_payment_id' as never });

      if (p.status === 'approved' && !activated) {
        const now = new Date();
        const end = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
        await admin.from('subscriptions').upsert({
          user_id: userId,
          plan_id: planId || null,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: end.toISOString(),
          next_billing_date: end.toISOString(),
          expires_at: end.toISOString(),
          updated_at: now.toISOString(),
        }, { onConflict: 'user_id' as never });
        activated = true;
      }
    }

    const { data: sub } = await admin.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
    return new Response(JSON.stringify({ ok: true, synced: results.length, subscription: sub }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
