// Suggests 8 blog article titles for VIRUM using the shared VIRUM AI config.
// Admin-only. Returns strict JSON [{ title, category, angle }].
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

function extractBalancedJson(raw: string, opener: "{" | "["): string | null {
  const closer = opener === "{" ? "}" : "]";
  const start = raw.indexOf(opener);
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
    if (char === opener) depth++;
    if (char === closer) depth--;
    if (depth === 0) return raw.slice(start, i + 1);
  }
  return null;
}

function extractJsonArray(raw: string): any[] | null {
  const cleaned = stripFences(raw.trim());
  try { const p = JSON.parse(cleaned); if (Array.isArray(p)) return p; if (Array.isArray(p?.suggestions)) return p.suggestions; } catch {}
  const objectJson = extractBalancedJson(cleaned, "{");
  if (objectJson) { try { const p = JSON.parse(objectJson); if (Array.isArray(p?.suggestions)) return p.suggestions; } catch {} }
  const arrayJson = extractBalancedJson(cleaned, "[");
  if (arrayJson) { try { const p = JSON.parse(arrayJson); if (Array.isArray(p)) return p; } catch {} }
  return null;
}

async function callVirumAI(focus?: string): Promise<any[] | null> {
  const system = "Você é um editor-chefe de uma revista premium de moda masculina (VIRUM). Responda SOMENTE em JSON válido, sem texto fora do JSON, sem markdown, sem cercas de código.";
  const user = `Gere EXATAMENTE 8 sugestões de pautas de artigo para o blog do VIRUM.
Público: homens interessados em estilo, moda, guarda-roupa, cores, tendências e imagem pessoal.
Objetivo editorial: atrair leitores a assinar o diagnóstico de imagem do VIRUM.
${focus ? `Foco adicional: ${focus}.` : ""}

Cada sugestão deve ter:
- title: título editorial forte em português (60-90 caracteres, sem clickbait raso)
- category: uma de ["Moda Masculina","Estilo Pessoal","Guarda-Roupa","Cores","Tendências","Alfaiataria","Casual"]
- angle: 1 frase (máx 160 caracteres) explicando o ângulo do artigo

Formato de saída OBRIGATÓRIO (objeto JSON puro):
{"suggestions":[{"title":"...","category":"...","angle":"..."}]}`;

  const aiRequest = buildAiChatCompletionRequest({
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    temperature: 0.9,
    maxTokens: 1400,
  });

  const res = await fetch(aiRequest.url, {
    method: "POST",
    headers: aiRequest.headers,
    body: JSON.stringify(aiRequest.body),
  });
  if (!res.ok) { console.warn("[suggest-blog-titles] virum-ai", res.status, (await res.text()).slice(0, 200)); return null; }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "";
  return extractJsonArray(content);
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
    const focus = body?.focus ? String(body.focus).slice(0, 200) : undefined;

    let items: any[] | null = null;
    for (let attempt = 0; attempt < 2 && !items; attempt++) {
      items = await callVirumAI(focus);
    }
    if (!items) return new Response(JSON.stringify({ error: "SUGGESTIONS_FAILED" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const suggestions = items
      .filter((x) => x && typeof x.title === "string")
      .slice(0, 8)
      .map((x) => ({
        title: String(x.title).trim(),
        category: typeof x.category === "string" ? x.category.trim() : "Moda Masculina",
        angle: typeof x.angle === "string" ? x.angle.trim() : "",
      }));

    return new Response(JSON.stringify({ suggestions }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[suggest-blog-titles] error", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});