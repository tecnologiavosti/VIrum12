import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { callAI } from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fallback template dictionary — style keyword → base EN query for menswear.
// Every template MUST start with "single adult man" tokens so stock APIs never
// return women, groups or children.
const STYLE_TEMPLATES: Record<string, string> = {
  moderno: "single adult man modern minimalist menswear neutral tones editorial",
  minimalista: "single adult man minimalist menswear neutral palette clean silhouette",
  contemporaneo: "single adult man contemporary menswear street style editorial",
  contemporâneo: "single adult man contemporary menswear street style editorial",
  classico: "single adult man classic tailored menswear formal suit",
  clássico: "single adult man classic tailored menswear formal suit",
  casual: "single adult man smart casual menswear everyday outfit",
  esportivo: "single adult man sporty menswear athleisure lifestyle",
  romantico: "single adult man romantic soft menswear layered outfit",
  romântico: "single adult man romantic soft menswear layered outfit",
  boemio: "single adult man bohemian menswear relaxed layered fashion",
  boêmio: "single adult man bohemian menswear relaxed layered fashion",
  elegante: "single adult man elegant sophisticated menswear tailored look",
  urbano: "single adult man urban menswear street style editorial",
  formal: "single adult man formal menswear suit tailored elegant",
  criativo: "single adult man creative menswear editorial fashion portrait",
};

// Reject any stock photo whose text metadata hints at women, groups or children.
const REJECT_RE = /\b(woman|women|female|girl|lady|ladies|bride|dress|skirt|heels|makeup|lipstick|mulher|garota|feminina?|noiva|vestido|saia|salto|maquiagem|batom|couple|casal|group|grupo|crowd|multid[aã]o|child|children|kid|kids|baby|bab[eê]|toddler)\b/i;
const MASC_INCLUDE_RE = /\b(man|men|male|gentleman|guy|guys|boy|boys|homem|homens|masculin[oa]|menswear)\b/i;

// STRICT: only accept photos whose alt/description positively confirms a man.
// Empty metadata → reject. Any feminine token → reject.
function passesGenderFilter(text: string): boolean {
  const t = String(text || "");
  if (!t) return false;
  if (REJECT_RE.test(t)) return false;
  return MASC_INCLUDE_RE.test(t);
}

function enforceMasculineQuery(q: string): string {
  // Strip any accidentally-included feminine tokens the LLM may emit.
  let cleaned = q.replace(REJECT_RE, " ").replace(/\s+/g, " ").trim();
  if (!/\b(man|men|menswear|male|masculin[eo])\b/i.test(cleaned)) {
    cleaned = `single adult man menswear ${cleaned}`;
  }
  return cleaned.slice(0, 180);
}

function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

const SECTION_DESCRIPTORS: Record<string, { primary: string; secondary: string }> = {
  resumo:      { primary: "editorial cover portrait full body man",          secondary: "lifestyle mood board scene man" },
  corporal:    { primary: "full body silhouette studio menswear",            secondary: "body proportion tailoring detail" },
  coloracao:   { primary: "color palette wardrobe swatches menswear",        secondary: "seasonal color mood outfit" },
  cor:         { primary: "color palette wardrobe swatches menswear",        secondary: "seasonal color mood outfit" },
  estilo:      { primary: "signature style portrait street editorial",       secondary: "style inspiration lifestyle" },
  modelagem:   { primary: "tailoring fit and cut menswear detail",           secondary: "garment silhouette shape modeling" },
  essenciais:  { primary: "wardrobe essentials flat lay menswear",           secondary: "capsule basics staples menswear" },
  capsula:     { primary: "capsule wardrobe menswear outfit grid",           secondary: "coordinated outfits capsule looks" },
  final:       { primary: "polished final look menswear editorial",          secondary: "confident lifestyle portrait men" },
};

function sectionDescriptor(section: string, variant: "primary" | "secondary"): string {
  const key = normalize(section);
  const entry = SECTION_DESCRIPTORS[key];
  if (entry) return entry[variant];
  return variant === "secondary" ? "lifestyle man solo" : "portrait full body man";
}

function templateQuery(style: string, tags: string[], variant: "primary" | "secondary", section: string): string {
  const keys = [style, ...tags].map(normalize).filter(Boolean);
  let base = "";
  for (const k of keys) {
    if (STYLE_TEMPLATES[k]) { base = STYLE_TEMPLATES[k]; break; }
  }
  if (!base) base = "modern menswear editorial fashion";
  return `${base} ${sectionDescriptor(section, variant)}`;
}

async function aiQuery(style: string, secondary: string[], tags: string[], variant: "primary" | "secondary", section: string): Promise<string | null> {
  try {
    const framing = sectionDescriptor(section, variant);
    const prompt = `You generate a single stock-photo search query in ENGLISH for a MENSWEAR style board.
Style: ${style}
Secondary styles: ${(secondary || []).join(", ") || "-"}
Tags: ${(tags || []).join(", ") || "-"}
Section: ${section} (${variant})
Framing/focus: ${framing}

Rules:
- 6 to 12 words, English only.
- Focus on menswear aesthetic (silhouette, palette, mood) AND the section's focus so different sections yield DIFFERENT images. Never mention brands or specific garments by SKU.
- Do NOT include quotes or punctuation. Return ONLY the query, nothing else.`;
    
    const raw = await callAI({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      maxTokens: 40,
    });

    if (!raw || raw.length < 6) return null;
    return raw.split("\n")[0].slice(0, 160);
  } catch (_e) {
    return null;
  }
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

async function pexelsSearch(query: string, orientation: string, pickSeed: number): Promise<{ url: string; credit: string } | null> {
  const key = Deno.env.get("PEXELS_API_KEY");
  if (!key) return null;
  const params = new URLSearchParams({ query, per_page: "30", orientation });
  const r = await fetch(`https://api.pexels.com/v1/search?${params}`, { headers: { Authorization: key } });
  if (!r.ok) return null;
  const j = await r.json();
  const photos: Array<{ src?: Record<string, string>; photographer?: string; alt?: string; width?: number; height?: number }> = j?.photos || [];
  if (!photos.length) return null;
  const safe = photos.filter((p) => passesGenderFilter(String(p.alt || "")));
  if (!safe.length) return null; // never fall back to unverified photos
  const good = safe[pickSeed % safe.length];
  const url = good?.src?.large2x || good?.src?.large || good?.src?.original;
  if (!url) return null;
  return { url, credit: `Photo by ${good?.photographer || "Pexels"} on Pexels` };
}

async function unsplashSearch(query: string, orientation: string, pickSeed: number): Promise<{ url: string; credit: string } | null> {
  const key = Deno.env.get("UNSPLASH_ACCESS_KEY");
  if (!key) return null;
  const ori = orientation === "landscape" ? "landscape" : orientation === "square" ? "squarish" : "portrait";
  const r = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30&orientation=${ori}`,
    { headers: { Authorization: `Client-ID ${key}` } },
  );
  if (!r.ok) return null;
  const j = await r.json();
  const results: Array<{ urls?: Record<string, string>; alt_description?: string; description?: string; user?: { name?: string } }> = j?.results || [];
  if (!results.length) return null;
  const safe = results.filter((r) => passesGenderFilter(`${r.alt_description || ""} ${r.description || ""}`));
  if (!safe.length) return null; // never fall back to unverified photos
  const first = safe[pickSeed % safe.length];
  const url = first?.urls?.regular;
  if (!url) return null;
  const name = first?.user?.name || "Unsplash";
  return { url, credit: `Photo by ${name} on Unsplash` };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const style = String(body.style || "").slice(0, 80);
    const secondaryStyles: string[] = Array.isArray(body.secondaryStyles) ? body.secondaryStyles.slice(0, 6).map(String) : [];
    const tags: string[] = Array.isArray(body.tags) ? body.tags.slice(0, 12).map(String) : [];
    const variant: "primary" | "secondary" = body.variant === "secondary" ? "secondary" : "primary";
    const section: string = String(body.section || "").slice(0, 40);
    const orientation: string = body.orientation === "landscape" ? "landscape" : body.orientation === "square" ? "square" : (variant === "secondary" ? "landscape" : "portrait");

    let query = await aiQuery(style, secondaryStyles, tags, variant, section);
    let source: "ai" | "template" = "ai";
    if (!query) {
      query = templateQuery(style, tags, variant, section);
      source = "template";
    }
    query = enforceMasculineQuery(query);

    const pickSeed = hashString(`${section}:${variant}:${style}`);
    let result = await unsplashSearch(query, orientation, pickSeed).catch(() => null);
    let provider = "unsplash";
    if (!result) {
      result = await pexelsSearch(query, orientation, pickSeed).catch(() => null);
      provider = "pexels";
    }
    if (!result) {
      return new Response(JSON.stringify({ url: null, query, source, provider: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ url: result.url, credit: result.credit, query, source, provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});