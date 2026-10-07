import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCredentials } from "../_shared/creds.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Returns which affiliate providers have their required secrets configured.
 * Values are NEVER returned — only booleans. Admin-only.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = req.headers.get("Authorization") || "";
    const jwtClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await jwtClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creds = await getCredentials(admin, [
      "SHOPEE_APP_ID", "SHOPEE_APP_SECRET", "SHOPEE_AFFILIATE_ID",
      "SHEIN_AFFILIATE_NETWORK", "SHEIN_AFFILIATE_API_KEY", "SHEIN_AFFILIATE_PUBLISHER_ID",
      "MERCADO_PAGO_PUBLIC_KEY", "MERCADO_PAGO_ACCESS_TOKEN",
      "STRIPE_PUBLISHABLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
    ]);
    const has = (n: string) => !!(creds[n] && creds[n].length > 0);
    const shopee = has("SHOPEE_APP_ID") && has("SHOPEE_APP_SECRET") && has("SHOPEE_AFFILIATE_ID");
    const shein = has("SHEIN_AFFILIATE_NETWORK") && has("SHEIN_AFFILIATE_API_KEY") && has("SHEIN_AFFILIATE_PUBLISHER_ID");
    const mercadopago = has("MERCADO_PAGO_ACCESS_TOKEN");
    const stripe = has("STRIPE_SECRET_KEY");
    const stripe_webhook = has("STRIPE_WEBHOOK_SECRET");

    const { data: flag } = await admin
      .from("site_settings").select("value").eq("key", "affiliate_products_enabled").maybeSingle();
    const enabled = (flag?.value as unknown) === true
      || flag?.value === "true"
      || JSON.stringify(flag?.value) === "true";

    return new Response(JSON.stringify({
      enabled,
      providers: { shopee, shein },
      payments: { mercadopago, stripe, stripe_webhook },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});