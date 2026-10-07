import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const results = {
    xai_key_details: JSON.stringify(Deno.env.get("XAI_API_KEY")), 
    gemini_key_details: JSON.stringify(Deno.env.get("GEMINI_API_KEY")),
    cerebras_key_details: JSON.stringify(Deno.env.get("CEREBRAS_API_KEY"))
  };

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
