
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const groqKey = Deno.env.get("GROQ_API_KEY");
  const xaiKey = Deno.env.get("XAI_API_KEY");
  
  return new Response(
    JSON.stringify({ 
      GROQ_API_KEY_EXISTS: !!groqKey,
      XAI_API_KEY_EXISTS: !!xaiKey,
      GROQ_API_KEY_LENGTH: groqKey?.length || 0,
      XAI_API_KEY_LENGTH: xaiKey?.length || 0
    }),
    { headers: { "Content-Type": "application/json" } }
  )
})
