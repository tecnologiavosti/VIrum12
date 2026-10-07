
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const groqKey = Deno.env.get("GROQ_API_KEY") || "";
    const xaiKey = Deno.env.get("XAI_API_KEY") || "";
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";
    const cerebrasKey = Deno.env.get("CEREBRAS_API_KEY") || "";
    const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
    
    const mask = (k: string) => {
      const val = k.trim().replace(/^["']|["']$/g, "").trim();
      return val ? `${val.substring(0, 4)}...${val.substring(val.length - 4)} (${val.length})` : "MISSING";
    };
    
    let aiTest = "SKIPPED";
    let groqConfig = {};
    try {
      const { getGrokEndpoint } = await import("../_shared/ai-config.ts");
      const grok = getGrokEndpoint();
      groqConfig = { url: grok.url, model: grok.model };
      
      // Strict test using ONLY GROQ_API_KEY
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
        XAI_API_KEY: mask(xaiKey),
        GEMINI_API_KEY: mask(geminiKey),
        CEREBRAS_API_KEY: mask(cerebrasKey),
        LOVABLE_API_KEY: mask(lovableKey)
      },
      groq_config: groqConfig,
      ai_test: aiTest,
      timestamp: new Date().toISOString()
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
