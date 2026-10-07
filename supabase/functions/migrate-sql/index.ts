
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { audit } = body;

    if (audit === true) {
      const groqKey = Deno.env.get("GROQ_API_KEY") || "";
      const xaiKey = Deno.env.get("XAI_API_KEY") || "";
      
      const mask = (k: string) => {
        const val = k ? k.trim().replace(/^["']|["']$/g, "").trim() : "";
        return val ? `${val.substring(0, 4)}...${val.substring(val.length - 4)} (${val.length})` : "MISSING";
      };
      
      let aiTest = "SKIPPED";
      let groqConfig = {};
      try {
        const { getGrokEndpoint } = await import("../_shared/ai-config.ts");
        const grok = getGrokEndpoint();
        groqConfig = { url: grok.url, model: grok.model };
        
        // Use ONLY GROQ_API_KEY for this test
        const testHeaders = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey.trim().replace(/^["']|["']$/g, "").trim()}`
        };

        const res = await fetch(grok.url, {
          method: "POST",
          headers: testHeaders,
          body: JSON.stringify({ 
            model: grok.model, 
            messages: [{role:"user", content:"Say OK"}], 
            max_tokens: 5 
          })
        });
        const data = await res.json().catch(() => ({}));
        aiTest = `Status: ${res.status} | Response: ${JSON.stringify(data).substring(0, 100)}`;
      } catch (e) { aiTest = `Error: ${e.message}`; }

      return new Response(JSON.stringify({ 
        success: true, 
        env: { 
          GROQ_API_KEY: mask(groqKey), 
          XAI_API_KEY: mask(xaiKey)
        },
        groq_config: groqConfig,
        ai_test: aiTest,
        deployed_at: new Date().toISOString()
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Audit not requested" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
