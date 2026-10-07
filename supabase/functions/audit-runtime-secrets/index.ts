
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const xaiKey = Deno.env.get("XAI_API_KEY") || "";
  const groqKey = Deno.env.get("GROQ_API_KEY") || "";
  const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";
  const cerebrasKey = Deno.env.get("CEREBRAS_API_KEY") || "";
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";

  const mask = (key: string) => {
    const val = key.trim().replace(/^["']|["']$/g, "").trim();
    if (!val) return "MISSING";
    if (val.length < 8) return `*** (length: ${val.length})`;
    return val.substring(0, 4) + "..." + val.substring(val.length - 4) + " (length: " + val.length + ")";
  };

  return new Response(
    JSON.stringify({
      XAI_API_KEY: mask(xaiKey),
      GROQ_API_KEY: mask(groqKey),
      GEMINI_API_KEY: mask(geminiKey),
      CEREBRAS_API_KEY: mask(cerebrasKey),
      LOVABLE_API_KEY: mask(lovableKey),
      TIMESTAMP: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
