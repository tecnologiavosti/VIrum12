
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { testGroqAuth } from "./handler.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  
  const result = await testGroqAuth();
  
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
