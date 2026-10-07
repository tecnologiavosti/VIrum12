import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const results: any = {};
    
    // Test section "body"
    console.log("Testing section 'body'...");
    results.body = await callAI({
      messages: [
        { role: "system", content: "Você é um consultor de estilo. Responda estritamente em JSON." },
        { role: "user", content: "Gere a seção 'body' de um diagnóstico para alguém com biotipo retangular." }
      ],
      responseFormat: "json_object"
    });

    // Test section "color"
    console.log("Testing section 'color'...");
    results.color = await callAI({
      messages: [
        { role: "system", content: "Você é um consultor de coloração pessoal. Responda estritamente em JSON." },
        { role: "user", content: "Gere a seção 'color' de um diagnóstico para a paleta Outono Suave." }
      ],
      responseFormat: "json_object"
    });

    return new Response(JSON.stringify(results), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (err) {
    console.error("Test AI Error:", err);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
