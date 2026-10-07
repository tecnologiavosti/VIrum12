
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const vars = ["GROQ_API_KEY", "XAI_API_KEY", "GEMINI_API_KEY", "CEREBRAS_API_KEY"];
  const results = {};
  vars.forEach(v => {
    const val = Deno.env.get(v);
    results[v] = {
      exists: !!val,
      length: val?.length || 0,
      prefix: val?.substring(0, 7) || "",
      suffix: val?.slice(-4) || ""
    };
  });
  
  return new Response(JSON.stringify(results, null, 2), { headers: { "Content-Type": "application/json" } });
})
