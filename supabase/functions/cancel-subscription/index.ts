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

    const { data: sub } = await admin.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
    if (!sub) return new Response(JSON.stringify({ error: 'No subscription' }), { status: 404, headers: corsHeaders });

    // Cancel MP preapproval if exists
    const mpToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
      || (await getCredential(admin, 'MERCADO_PAGO_ACCESS_TOKEN'))
      || ((await admin.from('site_settings').select('value').eq('key','mp_access_token').single()).data?.value as string);
    if (sub.mercadopago_id && mpToken && typeof mpToken === 'string') {
      try {
        await fetch(`https://api.mercadopago.com/preapproval/${sub.mercadopago_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mpToken}` },
          body: JSON.stringify({ status: 'cancelled' }),
        });
      } catch (e) { console.error('mp cancel err', e); }
    }

    await admin.from('subscriptions').update({
      status: 'canceled',
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);

    await admin.from('payment_events').insert({
      user_id: userId, event_type: 'subscription.canceled', payload: { by: 'user' },
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
