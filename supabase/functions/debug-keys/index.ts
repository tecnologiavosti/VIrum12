
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-config.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const groqKey = Deno.env.get("GROQ_API_KEY") || "";
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";
    const xaiKey = Deno.env.get("XAI_API_KEY") || "";

    const hash = async (str: string) => {
      if (!str) return "MISSING";
      const encoder = new TextEncoder();
      const data = encoder.encode(str.trim());
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 10);
    };

    const results = {
      groq: {
        present: !!groqKey,
        length: groqKey.length,
        fingerprint: await hash(groqKey),
        trimmed_length: groqKey.trim().length
      },
      gemini: {
        present: !!geminiKey,
        length: geminiKey.length,
        fingerprint: await hash(geminiKey),
        trimmed_length: geminiKey.trim().length
      },
      xai: {
        present: !!xaiKey,
        length: xaiKey.length,
        fingerprint: await hash(xaiKey),
        trimmed_length: xaiKey.trim().length
      }
    };

    console.log("[FINGERPRINT-CHECK]", JSON.stringify(results));

    // Real call test
    let callResult = "NOT_TESTED";
    try {
      const res = await callAI({
        messages: [{ role: "user", content: "body: Test diagnostic section" }],
        maxTokens: 10
      });
      callResult = `SUCCESS: ${res}`;
    } catch (e) {
      callResult = `FAILURE: ${e.message}`;
    }

    return new Response(JSON.stringify({ results, callResult }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
