
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  
  if (!geminiKey) {
    return new Response(JSON.stringify({ error: "No GEMINI_API_KEY found" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const results: any = {};
  
  // Test v1/models
  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${geminiKey}`);
    results.v1_models = await resp.json();
  } catch (e) {
    results.v1_models_error = e.message;
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
