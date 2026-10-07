import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-config.ts";

const DEFAULT_PIECE_IMAGE = "/assets/default.jpg";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { diagnosisId } = await req.json();
    if (!diagnosisId) {
      return new Response(JSON.stringify({ error: "diagnosisId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: diagnosis, error: diagError } = await supabase
      .from("diagnoses")
      .select("*")
      .eq("id", diagnosisId)
      .single();

    if (diagError || !diagnosis) {
      return new Response(JSON.stringify({ error: "Diagnóstico não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (diagnosis.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questionnaire = (diagnosis.questionnaire || {}) as Record<string, unknown>;
    const bodyAnalysis = (diagnosis.body_analysis || {}) as Record<string, unknown>;
    const colorAnalysis = (diagnosis.color_analysis || {}) as Record<string, unknown>;
    const styleAnalysis = (diagnosis.style_analysis || {}) as Record<string, unknown>;

    const predominantStyle = styleAnalysis.estilo_predominante || "Clássico";
    const occasion = "Look de Impacto";

    const prompt = `Gere uma sugestão de look MASCULINO premium (menswear) baseada neste diagnóstico:
    ESTILO: ${predominantStyle}
    BIOTIPO: ${bodyAnalysis.tipo_corporal}
    ESTAÇÃO: ${colorAnalysis.estacao}
    PROFISSÃO: ${questionnaire.profession}
    CLIMA: ${questionnaire.climate}

    Responda EXCLUSIVAMENTE em JSON:
    {
      "look_name": "Nome do Look",
      "occasion": "${occasion}",
      "occasion_description": "Breve descrição",
      "pieces": [
        { "name": "Nome da Peça", "category": "top|bottom|calcado|terceira_peca|acessorio", "color": "Cor", "description": "Detalhes" }
      ],
      "styling_tips": ["Dica 1", "Dica 2"],
      "mood": "Sentimento do look"
    }`;

    const raw = await callAI({
      messages: [
        { role: "system", content: "Você é um personal stylist masculino sênior da VIRUM." },
        { role: "user", content: prompt }
      ],
      responseFormat: "json_object",
      maxTokens: 1500
    });

    const lookData = JSON.parse(raw);

    // Image search (simulated flow for search-clothing-image)
    const processedPieces = await Promise.all(lookData.pieces.map(async (piece: any) => {
      let imageUrl = DEFAULT_PIECE_IMAGE;
      try {
        const searchRes = await fetch(`${supabaseUrl}/functions/v1/search-clothing-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseAnonKey}` },
          body: JSON.stringify({ query: `${piece.name} ${piece.color} menswear`, count: 1, diagnosisId })
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          imageUrl = searchData?.results?.[0]?.url || DEFAULT_PIECE_IMAGE;
        }
      } catch (err) {
        console.error(`Error searching image for ${piece.name}:`, err);
      }
      return { ...piece, image_url: imageUrl, available: imageUrl !== DEFAULT_PIECE_IMAGE };
    }));

    const { data: recommendation, error: insertError } = await supabase
      .from("look_recommendations")
      .insert({
        diagnosis_id: diagnosisId,
        look_name: lookData.look_name,
        occasion: lookData.occasion,
        occasion_description: lookData.occasion_description,
        pieces: processedPieces,
        styling_tips: lookData.styling_tips,
        metadata: { mood: lookData.mood }
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, recommendation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
