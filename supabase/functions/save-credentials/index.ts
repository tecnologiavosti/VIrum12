import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptValue } from "../_shared/creds.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Only these credential names can be written from the admin UI.
// Names must match Deno.env keys used elsewhere so an env value overrides
// the stored one automatically.
const ALLOWED = new Set<string>([
  // Shopee affiliate
  "SHOPEE_APP_ID",
  "SHOPEE_APP_SECRET",
  "SHOPEE_AFFILIATE_ID",
  // Shein affiliate network
  "SHEIN_AFFILIATE_NETWORK",
  "SHEIN_AFFILIATE_API_KEY",
  "SHEIN_AFFILIATE_PUBLISHER_ID",
  // Mercado Pago
  "MERCADO_PAGO_PUBLIC_KEY",
  "MERCADO_PAGO_ACCESS_TOKEN",
  // Stripe
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
]);

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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const credentials = (body?.credentials || {}) as Record<string, unknown>;

    const results: Record<string, "saved" | "cleared" | "invalid" | "forbidden"> = {};
    for (const [name, raw] of Object.entries(credentials)) {
      if (!ALLOWED.has(name)) { results[name] = "forbidden"; continue; }
      const val = typeof raw === "string" ? raw.trim() : "";
      const key = `cred_${name}`;
      if (!val) {
        // Empty => remove the stored value (env still wins if set).
        const { error } = await admin.from("site_settings").delete().eq("key", key);
        if (error) console.error("[save-credentials] delete", name, error);
        results[name] = "cleared";
        continue;
      }
      try {
        const enc = await encryptValue(val);
        const { error } = await admin
          .from("site_settings")
          .upsert({ key, value: enc as unknown, updated_at: new Date().toISOString() }, { onConflict: "key" });
        if (error) {
          console.error("[save-credentials] upsert", name, error);
          results[name] = "invalid";
        } else {
          results[name] = "saved";
        }
      } catch (e) {
        console.error("[save-credentials] encrypt", name, e);
        results[name] = "invalid";
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});