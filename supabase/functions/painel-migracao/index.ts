import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const groqKey = Deno.env.get("GROQ_API_KEY") || "";
    const xaiKey = Deno.env.get("XAI_API_KEY") || "";
    
    const mask = (k: string) => {
      const val = k ? k.trim().replace(/^["']|["']$/g, "").trim() : "";
      return val ? `${val.substring(0, 4)}...${val.substring(val.length - 4)} (${val.length})` : "MISSING";
    };
    
    let aiTest = "SKIPPED";
    let groqConfig = {
      url: "https://api.groq.com/openai/v1/chat/completions",
      model: "llama-3.3-70b-versatile"
    };

    // Use ONLY GROQ_API_KEY for this test
    const cleanKey = groqKey.trim().replace(/^["']|["']$/g, "").trim();
    const testHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${cleanKey}`
    };

    const res = await fetch(groqConfig.url, {
      method: "POST",
      headers: testHeaders,
      body: JSON.stringify({ 
        model: groqConfig.model, 
        messages: [{role:"user", content:"Say OK"}], 
        max_tokens: 5 
      })
    });
    
    const data = await res.json().catch(() => ({}));
    aiTest = `Status: ${res.status} | Response: ${JSON.stringify(data).substring(0, 100)}`;

    return new Response(JSON.stringify({ 
      success: true, 
      env: { 
        GROQ_API_KEY: mask(groqKey), 
        XAI_API_KEY: mask(xaiKey)
      },
      groq_config: groqConfig,
      ai_test: aiTest,
      deployed_at: new Date().toISOString(),
      test_result: res.status === 200 ? "SUCCESS" : `FAILED (${res.status})`
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});