import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticateUserRequest } from "../_shared/auth.ts";
import { callAI } from "../_shared/ai-config.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CerebrasHttpError extends Error {
  status: number;
  detail: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SYSTEM_PROMPT = `Você é o ESTRATEGISTA-CHEFE da VIRUM. Sua missão é transformar uma análise técnica de imagem em um DOSSIÊ ESTRATÉGICO DE IDENTIDADE visual masculina.

DIRETRIZES DE REDAÇÃO (TOM GQ / MR PORTER):
1. INTERPRETAÇÃO, NÃO REPETIÇÃO: Nunca repita os dados brutos. Se o biotipo é 'triângulo invertido', fale sobre 'presença atlética' e 'equilíbrio de proporções'. 
2. FOCO NO HOMEM: Linguagem masculina, confiante, sofisticada.
3. CONSTRUA UMA NARRATIVA: O dossiê deve ser uma jornada de autodescoberta e empoderamento visual.

ESTRUTURA OBRIGATÓRIA (JSON):
- introducao: "A alma da nova imagem" (3 parágrafos)
- analise_estrategica: "O porquê das escolhas" (Cruzamento de biotipo, cor e estilo)
- o_novo_homem: "A tese de identidade" (Como o mundo o lerá agora)
- plano_de_evolucao: "Passos práticos de 0 a 12 meses"
- consideracoes_finais: "O encerramento do estrategista"`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authResult = await authenticateUserRequest(req, "generate-dossier-content");
    if (!authResult.ok) return json({ error: "unauthorized" }, authResult.status);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const user = authResult.user;

    const { diagnosisId, force } = await req.json().catch(() => ({}));
    if (!diagnosisId) return json({ error: "diagnosisId required" }, 400);

    const { data: diag, error: diagErr } = await admin
      .from("diagnoses")
      .select("*")
      .eq("id", diagnosisId)
      .maybeSingle();

    if (diagErr || !diag) return json({ error: "diagnosis not found" }, 404);
    if (diag.user_id !== user.id) return json({ error: "forbidden" }, 403);

    if (!force && diag.dossier_content && Object.keys(diag.dossier_content).length > 0) {
      return json({ dossier: diag.dossier_content, cached: true });
    }

    const prompt = `Gere o dossiê estratégico para este cliente:
    
    ESTILO: ${diag.style_analysis?.estilo_predominante}
    BIOTIPO: ${diag.body_analysis?.tipo_corporal}
    ESTAÇÃO: ${diag.color_analysis?.estacao}
    RESUMO FINAL: ${diag.final_diagnosis?.summary}
    OBJETIVOS: ${diag.questionnaire?.goals}
    
    Baseie-se nestes dados para criar uma narrativa única e interpretativa.`;

    const raw = await callAI({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      responseFormat: "json_object",
      maxTokens: 4000
    });

    let dossier: Record<string, unknown>;
    try {
      dossier = JSON.parse(raw);
    } catch {
      return json({ error: "invalid AI JSON", raw }, 500);
    }

    await admin.from("diagnoses").update({ dossier_content: dossier }).eq("id", diagnosisId);

    return json({ dossier, cached: false });
  } catch (e) {
    console.error(`[DOSSIER-ERROR] ${e.message}`);
    return json({ error: String(e?.message || e) }, 500);
  }
});
