
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGrokEndpoint } from "../_shared/ai-config.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  
  try {
    const grok = getGrokEndpoint();
    const payload = {
      model: grok.model,
      messages: [{ role: "user", content: "Say OK" }],
      max_tokens: 5
    };

    console.log(`[TEST-PROD-AUTH] Calling ${grok.url} with model ${grok.model}`);
    
    const response = await fetch(grok.url, {
      method: "POST",
      headers: grok.headers,
      body: JSON.stringify(payload)
    });

    const status = response.status;
    const data = await response.json().catch(() => ({}));
    
    return new Response(JSON.stringify({
      status,
      provider: grok.provider,
      endpoint: grok.url,
      model: grok.model,
      data
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      status: "EXCEPTION",
      error: err.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
