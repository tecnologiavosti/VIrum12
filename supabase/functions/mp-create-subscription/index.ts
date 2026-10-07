// Creates a Mercado Pago Preapproval (recurring subscription) and returns the init_point URL.
import { createClient } from 'npm:@supabase/supabase-js@2';

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
    const userEmail = (claims.claims.email as string) || 'user@virum.com';

    const { plan_id, return_url } = await req.json();
    if (!plan_id) {
      return new Response(JSON.stringify({ error: 'plan_id required' }), { status: 400, headers: corsHeaders });
    }

    const { data: plan } = await admin.from('plans').select('*').eq('id', plan_id).single();
    if (!plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404, headers: corsHeaders });
    }

    const { data: settings } = await admin
      .from('site_settings')
      .select('value')
      .eq('key', 'mp_access_token')
      .single();
    const mpToken = typeof settings?.value === 'string' ? settings.value : (settings?.value as string);
    if (!mpToken) throw new Error('Mercado Pago token not configured');

    const amount = (plan.price_cents / 100).toFixed(2);
    const backUrl = return_url || `${req.headers.get('origin') ?? ''}/payment-success`;

    // Create preapproval (recurring subscription)
    const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mpToken}` },
      body: JSON.stringify({
        reason: plan.name,
        external_reference: `${userId}:${plan.id}`,
        payer_email: userEmail,
        back_url: backUrl,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: Number(amount),
          currency_id: 'BRL',
        },
        status: 'pending',
      }),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error('MP error', mpData);
      return new Response(JSON.stringify({ error: 'mp_error', detail: mpData }), { status: 502, headers: corsHeaders });
    }

    // Pre-create subscription record
    await admin.from('subscriptions').upsert(
      {
        user_id: userId,
        plan_id: plan.id,
        plan: 'monthly',
        status: 'pending',
        stripe_subscription_id: mpData.id, // reuse column to store MP preapproval id
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' as never },
    );

    return new Response(
      JSON.stringify({ init_point: mpData.init_point, preapproval_id: mpData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
