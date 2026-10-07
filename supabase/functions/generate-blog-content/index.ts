// Generates a full blog article for VIRUM from a chosen title using the shared VIRUM AI config.
// Admin-only. Returns strict JSON { title, excerpt, content, tags }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAiChatCompletionRequest } from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function stripFences(s: string): string {
  return s.replace(/```(?:json|markdown)?\s*/gi, "").replace(/```\s*/g, "").trim();
}

function extractBalancedJson(raw: string): string | null {
  const start = raw.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i++) {
    const char = raw[i];
    if (escaped) { escaped = false; continue; }
    if (char === "\\") { escaped = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (char === "{") depth++;
    if (char === "}") depth--;
    if (depth === 0) return raw.slice(start, i + 1);
  }
  return null;
}

function extractJsonObject(raw: string): any | null {
  const cleaned = stripFences(raw.trim());
  try { return JSON.parse(cleaned); } catch {}
  const objectJson = extractBalancedJson(cleaned);
  if (objectJson) { try { return JSON.parse(objectJson); } catch {} }
  return null;
}

async function callVirumAI(title: string, category: string, angle: string): Promise<any | null> {
  const system = "Você é um editor sênior de uma revista masculina premium (referências: GQ, Esquire, Mr Porter Journal, Huckberry Journal). Escreve em português brasileiro com voz editorial: natural, elegante, envolvente, com autoridade — nunca acadêmico, nunca corporativo, nunca listas exaustivas. Responda SOMENTE em JSON válido, sem markdown ao redor, sem cercas de código, sem texto fora do JSON.";
  const user = `Escreva um artigo editorial para o blog do VIRUM.

Título proposto: "${title}"
Categoria: ${category}
Ângulo editorial: ${angle}

VOZ E ESTILO (obrigatório):
- Estilo de revista masculina premium: prosa fluida, frases variadas, ritmo de leitura agradável.
- Comece com uma abertura envolvente (cena, observação, contraste ou anedota) — nunca com "Neste artigo vamos…", "Introdução" ou definição de dicionário.
- Escreva na 2ª pessoa quando fizer sentido, com naturalidade, como quem conversa com um leitor sofisticado.
- Traga exemplos concretos: peças, tecidos, ocasiões, referências culturais (cinema, música, arquitetura), personagens reais quando couber.
- Evite jargão acadêmico, clichês de moda ("must have", "atemporal", "curinga") e frases de efeito vazias.

ESTRUTURA (obrigatório):
- Markdown limpo. NÃO inclua um H1 no corpo (o título já é renderizado pelo site).
- No máximo 3 a 5 subtítulos H2 no artigo inteiro. Subtítulos curtos, evocativos, SEM numeração (proibido "1.", "1.1", "2.1", "Parte 1", "Capítulo", etc.).
- Nada de H3, a menos que seja realmente necessário (no máximo 1). Nada de H4+.
- Parágrafos fluidos de 2 a 5 frases. Use listas com moderação, só quando agregarem — no máximo uma lista curta no artigo.
- 700 a 1000 palavras. Sem emojis. Sem "conclusão" rotulada.
- Fechamento: um parágrafo curto que amarra a ideia e convida, com sutileza editorial, a experimentar o diagnóstico de imagem do VIRUM — sem soar como anúncio, sem CTA em caixa-alta.

SAÍDA (JSON puro, sem markdown ao redor):
{
  "title": "título final refinado, curto e editorial",
  "excerpt": "linha fina de 1 a 2 frases, até 220 caracteres, que faria capa de revista",
  "content": "corpo do artigo em Markdown, seguindo as regras acima",
  "tags": ["4 a 6 tags curtas em português, minúsculas, sem #"]
}`;

  const aiRequest = buildAiChatCompletionRequest({
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    temperature: 0.75,
    maxTokens: 4000,
  });

  const res = await fetch(aiRequest.url, {
    method: "POST",
    headers: aiRequest.headers,
    body: JSON.stringify(aiRequest.body),
  });
  if (!res.ok) { console.warn("[generate-blog-content] virum-ai", res.status, (await res.text()).slice(0, 200)); return null; }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "";
  return extractJsonObject(content);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes.user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const title = String(body.title || "").trim();
    if (title.length < 3) return new Response(JSON.stringify({ error: "invalid_title" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const category = String(body.category || "Moda Masculina").trim();
    const angle = String(body.angle || "").trim();

    let article: any | null = null;
    for (let attempt = 0; attempt < 3 && !article; attempt++) {
      const r = await callVirumAI(title, category, angle);
      if (r && typeof r.content === "string" && r.content.trim().length > 100) article = r;
    }
    if (!article) return new Response(JSON.stringify({ error: "GENERATION_FAILED" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const out = {
      title: (typeof article.title === "string" && article.title.trim()) || title,
      excerpt: typeof article.excerpt === "string" ? article.excerpt.trim().slice(0, 260) : "",
      content: String(article.content).trim(),
      tags: Array.isArray(article.tags) ? article.tags.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 10) : [],
      category,
    };
    return new Response(JSON.stringify({ article: out }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[generate-blog-content] error", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});