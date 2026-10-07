
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { callAI } from "../_shared/ai-config.ts"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } })
  }

  try {
    // 1. Check GROQ_API_KEY presence
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
       return new Response(
         JSON.stringify({ 
           error: "GROQ_API_KEY NOT FOUND", 
           GROQ_API_KEY_FOUND: "NÃO",
           XAI_API_KEY_EXISTS: !!Deno.env.get("XAI_API_KEY") 
         }),
         { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
       )
    }

    // 2. Perform real minimal call to Groq
    const result = await callAI({
      messages: [
        { role: "user", content: "Respond OK" }
      ],
      maxTokens: 5
    });

    return new Response(
      JSON.stringify({ 
        GROQ_API_KEY_FOUND: "SIM",
        autenticacao: 200,
        result 
      }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    )
  } catch (err) {
    const status = err.message.includes("401") ? 401 : err.message.includes("429") ? 429 : 500;
    return new Response(
      JSON.stringify({ 
        GROQ_API_KEY_FOUND: !!Deno.env.get("GROQ_API_KEY") ? "SIM" : "NÃO",
        autenticacao: status,
        error: err.message 
      }),
      { 
        status: status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
      }
    )
  }
})
