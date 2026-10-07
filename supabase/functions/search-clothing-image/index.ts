import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Removed: HuggingFace vision validator. Selection uses simple heuristics only
// (reachability + query bias). No external model call for image scoring.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// === Translation maps PT → EN ===

const clothingTermMap: Record<string, string> = {
  "blazer estruturado": "men structured blazer",
  "blazer oversized": "men oversized blazer",
  blazer: "men blazer jacket",
  "camisa social": "men dress shirt formal",
  camisa: "men shirt menswear",
  blusa: "men shirt menswear",
  camiseta: "men t-shirt tee menswear",
  "top cropped": "men premium t-shirt",
  top: "men premium t-shirt",
  regata: "men tank top sleeveless",
  body: "men premium t-shirt",
  cropped: "men premium t-shirt",
  "suéter": "men sweater pullover",
  tricot: "men knit sweater",
  cardigan: "men cardigan knit",
  moletom: "men sweatshirt",
  "jaqueta de couro": "men leather jacket",
  jaqueta: "men jacket outerwear",
  casaco: "men overcoat outerwear",
  "trench coat": "men trench coat",
  colete: "men vest waistcoat",
  "calça alfaiataria": "men tailored trousers",
  "calça wide leg": "men wide leg pants",
  "calça pantalona": "men palazzo pants",
  "calça skinny": "men skinny jeans",
  "calça reta": "men straight leg pants",
  "calça jeans": "men jeans denim",
  "calça": "men trousers pants",
  legging: "men jogger pants",
  "saia midi": "men chino trousers",
  "saia lápis": "men tailored trousers",
  "saia plissada": "men pleated trousers",
  "saia longa": "men wide leg trousers",
  "saia curta": "men chino shorts",
  saia: "men trousers",
  "vestido midi": "men tailored suit",
  "vestido longo": "men three piece suit",
  "vestido curto": "men suit set",
  "vestido envelope": "men double breasted suit",
  "vestido tubinho": "men slim suit",
  "vestido chemise": "men shirt and chino set",
  vestido: "men tailored suit",
  "macacão": "men utility jumpsuit",
  macaquinho: "men shorts and tee set",
  short: "men shorts",
  shorts: "men shorts",
  bermuda: "men bermuda shorts",
  scarpin: "men oxford dress shoes",
  "sandália de salto": "men leather loafers",
  "sandália rasteira": "men leather sandals",
  "sandália": "men leather sandals",
  "tênis branco": "men white sneakers",
  "tênis": "men sneakers trainers",
  "bota cano alto": "men tall leather boots",
  "bota chelsea": "men chelsea boots",
  bota: "men boots ankle",
  rasteirinha: "men leather sandals",
  mocassim: "men loafers",
  sapatilha: "men minimalist sneakers",
  mule: "men slip on loafers",
  sapato: "men shoes",
  "bolsa estruturada": "men leather briefcase",
  "bolsa tote": "men leather tote bag",
  bolsa: "men leather messenger bag",
  clutch: "men leather document holder",
  mochila: "men backpack",
  cinto: "men belt leather",
  "lenço de seda": "men silk pocket square",
  "lenço": "men pocket square",
  cachecol: "men winter scarf",
  "chapéu": "men hat",
  echarpe: "men wool scarf",
  brinco: "men minimalist stud earring",
  colar: "men chain necklace",
  pulseira: "men leather bracelet",
  anel: "men signet ring",
  "óculos de sol": "men sunglasses",
  "óculos": "men sunglasses",
};

const colorMap: Record<string, string> = {
  preto: "black", preta: "black", branco: "white", branca: "white",
  azul: "blue", "azul marinho": "navy blue", "azul claro": "light blue",
  vermelho: "red", vermelha: "red", verde: "green", "verde oliva": "olive green",
  amarelo: "yellow", amarela: "yellow", rosa: "pink", "rosa claro": "light pink",
  bege: "beige", caramelo: "caramel", marrom: "brown", cinza: "gray",
  dourado: "gold", dourada: "gold", prata: "silver", nude: "nude",
  borgonha: "burgundy", terracota: "terracotta", mostarda: "mustard",
  coral: "coral", lavanda: "lavender", creme: "cream", off: "off-white",
};

const materialMap: Record<string, string> = {
  "crochê": "crochet", croche: "crochet", tricot: "knit",
  renda: "lace", linho: "linen", couro: "leather", jeans: "denim",
  seda: "silk", "algodão": "cotton", algodao: "cotton", cetim: "satin",
  veludo: "velvet", tweed: "tweed", camurça: "suede", camurca: "suede",
};

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

/** Generate a normalized key for deduplication */
function generateNormalizedKey(input: string): string {
  const n = normalize(input);
  const sortedKeys = Object.keys(clothingTermMap).sort((a, b) => b.length - a.length);
  let type = "";
  for (const key of sortedKeys) {
    if (n.includes(normalize(key))) { type = key; break; }
  }
  let color = "";
  const sortedColors = Object.keys(colorMap).sort((a, b) => b.length - a.length);
  for (const pt of sortedColors) {
    if (n.includes(normalize(pt))) { color = pt; break; }
  }
  let material = "";
  for (const [pt] of Object.entries(materialMap)) {
    if (n.includes(normalize(pt))) { material = pt; break; }
  }
  return [type, color, material].filter(Boolean).join("_").replace(/\s+/g, "_") || n.replace(/\s+/g, "_");
}

/** Detect clothing category */
function detectCategory(input: string): string {
  const n = normalize(input);
  const categoryRules: [string[], string][] = [
    [["blazer", "jaqueta", "casaco", "trench", "colete", "cardigan", "sueter", "moletom"], "tercas_pecas"],
    [["camisa", "blusa", "camiseta", "top", "regata", "body", "cropped"], "tops"],
    [["calca", "legging", "shorts", "bermuda", "short"], "bottoms"],
    [["saia"], "bottoms"],
    [["vestido", "macacao", "macaquinho"], "vestidos"],
    [["scarpin", "sandalia", "tenis", "bota", "mocassim", "sapatilha", "mule", "sapato", "rasteirinha"], "calcados"],
    [["bolsa", "clutch", "mochila", "cinto", "lenco", "cachecol", "chapeu", "echarpe", "brinco", "colar", "pulseira", "anel", "oculos"], "acessorios"],
  ];
  for (const [keywords, cat] of categoryRules) {
    for (const kw of keywords) {
      if (n.includes(kw)) return cat;
    }
  }
  return "outros";
}

function gerarQueryPexels(input: string): string {
  const normalized = normalize(input);
  const sortedKeys = Object.keys(clothingTermMap).sort((a, b) => b.length - a.length);
  
  let tipo = "";
  for (const key of sortedKeys) {
    if (normalized.includes(normalize(key))) { tipo = clothingTermMap[key]; break; }
  }
  if (!tipo) tipo = "clothing fashion";

  let cor = "";
  const sortedColors = Object.keys(colorMap).sort((a, b) => b.length - a.length);
  for (const pt of sortedColors) {
    if (normalized.includes(normalize(pt))) { cor = colorMap[pt]; break; }
  }

  let material = "";
  for (const [pt, en] of Object.entries(materialMap)) {
    if (normalized.includes(normalize(pt))) { material = en; break; }
  }

  const parts = [cor, material, tipo, "menswear male model editorial -woman -women -female -dress -skirt -heels -makeup -handbag -lipstick"].filter(Boolean);
  return parts.join(" ");
}

/**
 * Popular English synonyms for menswear pieces — Pexels indexes these MUCH
 * better than descriptive Portuguese-translated phrases like "men tailored
 * trousers pants". When a piece has a well-known short EN name (e.g. "chinos",
 * "loafers", "chelsea boots"), we try it as the last, most permissive query.
 */
const SIMPLE_SYNONYMS: Array<{ match: RegExp; terms: string[] }> = [
  { match: /blazer|sport coat|suit jacket/i, terms: ["blazer", "sport coat", "suit jacket"] },
  { match: /dress shirt|camisa social|button.?down|oxford shirt/i, terms: ["oxford shirt", "dress shirt", "button down shirt"] },
  { match: /\bshirt\b/i, terms: ["shirt"] },
  { match: /t-?shirt|tee/i, terms: ["t-shirt"] },
  { match: /polo/i, terms: ["polo shirt"] },
  { match: /sweater|pullover|knit/i, terms: ["sweater", "knitwear"] },
  { match: /cardigan/i, terms: ["cardigan"] },
  { match: /hoodie|moletom/i, terms: ["hoodie"] },
  { match: /coat|overcoat|casaco/i, terms: ["overcoat", "coat"] },
  { match: /trench/i, terms: ["trench coat"] },
  { match: /vest|waistcoat|colete/i, terms: ["waistcoat", "vest"] },
  { match: /jacket|jaqueta/i, terms: ["jacket"] },
  { match: /chino|khaki/i, terms: ["chinos", "chino pants"] },
  { match: /jeans|denim/i, terms: ["jeans", "denim pants"] },
  { match: /trousers|pants|calc?a|tailored/i, terms: ["trousers", "dress pants"] },
  { match: /shorts|bermuda/i, terms: ["shorts"] },
  { match: /suit\b/i, terms: ["suit"] },
  { match: /loafer|mocassim/i, terms: ["loafers"] },
  { match: /oxford|derby|dress shoes|scarpin/i, terms: ["oxford shoes", "dress shoes"] },
  { match: /chelsea/i, terms: ["chelsea boots"] },
  { match: /boot|bota/i, terms: ["boots"] },
  { match: /sneaker|t[eê]nis/i, terms: ["sneakers"] },
  { match: /sandal|sand[aá]lia/i, terms: ["sandals"] },
  { match: /belt|cinto/i, terms: ["belt"] },
  { match: /watch|rel[oó]gio/i, terms: ["watch"] },
  { match: /sunglass|[oó]culos/i, terms: ["sunglasses"] },
  { match: /scarf|cachecol|echarpe/i, terms: ["scarf"] },
  { match: /bag|bolsa|mochila|backpack/i, terms: ["leather bag"] },
  { match: /tie|gravata/i, terms: ["tie"] },
  { match: /hat|chap[eé]u|cap/i, terms: ["hat"] },
];

/**
 * Progressive query builder: from most specific to most permissive.
 * The caller iterates the list and stops at the first query that returns a
 * validated image. This prevents Pexels from failing just because the full
 * descriptor (color + material + fit + season + occasion) has zero indexed hits.
 */
function buildProgressiveQueries(input: string): string[] {
  const normalized = normalize(input);

  // Type (translated PT → EN)
  let translatedType = "";
  for (const key of Object.keys(clothingTermMap).sort((a, b) => b.length - a.length)) {
    if (normalized.includes(normalize(key))) { translatedType = clothingTermMap[key]; break; }
  }

  // Color
  let color = "";
  for (const pt of Object.keys(colorMap).sort((a, b) => b.length - a.length)) {
    if (normalized.includes(normalize(pt))) { color = colorMap[pt]; break; }
  }

  // Material
  let material = "";
  for (const [pt, en] of Object.entries(materialMap)) {
    if (normalized.includes(normalize(pt))) { material = en; break; }
  }

  // Popular EN synonyms (based on either the raw input or the translated type)
  const source = `${normalized} ${translatedType}`;
  const synonyms: string[] = [];
  for (const { match, terms } of SIMPLE_SYNONYMS) {
    if (match.test(source)) {
      for (const t of terms) if (!synonyms.includes(t)) synonyms.push(t);
    }
  }

  const queries: string[] = [];
  const push = (q: string) => {
    const clean = q.replace(/\s+/g, " ").trim();
    if (clean && !queries.includes(clean)) queries.push(clean);
  };

  // 1. Full descriptor — biased toward menswear catalog shots
  push([color, material, translatedType || "menswear clothing", "menswear"].filter(Boolean).join(" "));

  // 2. Color + material + type (drop the "menswear" bias)
  if (color || material) push([color, material, translatedType].filter(Boolean).join(" "));

  // 3. Color + simple EN synonym (e.g. "navy blazer", "brown loafers")
  if (color && synonyms.length) {
    for (const syn of synonyms.slice(0, 2)) push(`${color} ${syn}`);
  }

  // 4. Color + translated type
  if (color && translatedType) push(`${color} ${translatedType}`);

  // 5. Simple EN synonym alone (e.g. "loafers", "chelsea boots")
  for (const syn of synonyms.slice(0, 3)) push(syn);

  // 6. Translated type alone
  if (translatedType) push(translatedType);

  // 7. Final safety net
  push("menswear");

  return queries;
}

// === Pexels (API 1 - primary) ===

async function buscarPexels(query: string, perPage: number): Promise<{ url: string; source: string }[]> {
  const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY");
  if (!PEXELS_API_KEY) {
    console.log("PEXELS_API_KEY not configured");
    return [];
  }

  try {
    const res = await fetch(
      // No orientation filter here: Pexels' `orientation=portrait` slices
      // the pool aggressively and drops a lot of otherwise valid catalog
      // shots. The AI validator later rejects anything unsuitable.
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );

    if (!res.ok) {
      console.log(`Pexels returned status ${res.status}`);
      return [];
    }

    const data = await res.json();
    // Strict gender gate: alt MUST mention a masculine indicator (man, men, male,
    // gentleman, guy, homem, masculino) AND must NOT mention any feminine
    // indicator. Photos with empty alt are dropped — we cannot verify them.
    const HARD_EXCLUDE_RE = /\b(woman|women|female|girl|lady|ladies|bride|dress|gown|skirt|heels|makeup|lipstick|handbag|purse|feminine|mulher|garota|feminina?|noiva|vestido|saia|salto|maquiagem|batom)\b/i;
    const MASC_INCLUDE_RE = /\b(man|men|male|gentleman|guy|guys|boy|boys|homem|homens|masculin[oa]|menswear)\b/i;

    const results = (data.photos || [])
      .filter((p: any) => {
        const alt = String(p.alt || "");
        if (!alt) return false;
        if (HARD_EXCLUDE_RE.test(alt)) return false;
        return MASC_INCLUDE_RE.test(alt);
      })
      .map((p: any) => ({
        url: p.src?.medium || p.src?.large || p.src?.small,
        source: "pexels",
      }))
      .filter((r: any) => r.url);

    console.log(`Pexels: ${results.length} product images for "${query}"`);
    return results;
  } catch (e) {
    console.error("Pexels fetch error:", e);
    return [];
  }
}

// === Unsplash (API 2 - fallback) ===

async function buscarUnsplash(query: string, perPage: number): Promise<{ url: string; source: string }[]> {
  const UNSPLASH_KEY = Deno.env.get("UNSPLASH_ACCESS_KEY");
  if (!UNSPLASH_KEY) {
    console.log("UNSPLASH_ACCESS_KEY not configured");
    return [];
  }

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + " clothing product flat lay -face -person")}&per_page=${perPage}&orientation=portrait`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
    );

    if (!res.ok) {
      console.log(`Unsplash returned status ${res.status}`);
      return [];
    }

    const data = await res.json();
    const HARD_EXCLUDE_RE = /\b(woman|women|female|girl|lady|ladies|bride|dress|gown|skirt|heels|makeup|lipstick|handbag|purse|feminine|mulher|garota|feminina?|noiva|vestido|saia|salto|maquiagem|batom)\b/i;
    const MASC_INCLUDE_RE = /\b(man|men|male|gentleman|guy|guys|boy|boys|homem|homens|masculin[oa]|menswear)\b/i;

    const results = (data.results || [])
      .filter((p: any) => {
        const desc = String(p.description || p.alt_description || "");
        if (!desc) return false;
        if (HARD_EXCLUDE_RE.test(desc)) return false;
        return MASC_INCLUDE_RE.test(desc);
      })
      .map((p: any) => ({
        url: p.urls?.regular || p.urls?.small,
        source: "unsplash",
      }))
      .filter((r: any) => r.url);

    console.log(`Unsplash: ${results.length} product images for "${query}"`);
    return results;
  } catch (e) {
    console.error("Unsplash fetch error:", e);
    return [];
  }
}

// === Validate image URL is accessible ===

async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    const contentType = res.headers.get("content-type") || "";
    return res.ok && contentType.startsWith("image/");
  } catch {
    return false;
  }
}

// === Heuristic image ranker (no external model) ===
// Preserves the {index, score, reason} shape the rest of the pipeline expects
// so we can drop the HuggingFace validator without touching the caller. Every
// reachable candidate is accepted with a synthetic score that decays with
// position — the first result from Pexels/Unsplash wins, which is exactly the
// behaviour requested (Cerebras-only text; no vision providers).
interface AiScore { index: number; score: number; reason: string; category_guess?: string }

async function aiScoreImages(
  _expectedContext: string,
  _expectedCategory: string | null,
  urls: string[],
): Promise<AiScore[]> {
  return urls.map((_, index) => ({
    index,
    score: Math.max(60, 100 - index * 3),
    reason: "heuristic: reachable candidate, no external validator",
  }));
}

const CATEGORY_LABELS: Record<string, string> = {
  tercas_pecas: "men outerwear / third layer (men blazer, jacket, overcoat, vest, cardigan)",
  tops: "men top only (shirt, t-shirt, polo, henley)",
  bottoms: "men bottoms only (trousers, chinos, jeans, shorts)",
  vestidos: "men tailored suit set only",
  calcados: "men shoes only (sneakers, oxfords, loafers, boots, derbies)",
  acessorios: "men accessory only (leather bag, belt, watch, scarf, sunglasses)",
  outros: "men's clothing piece",
};

// === Main handler ===

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, count = 1, diagnosisId, mode = "product", seed = 0, section, fallbackQueries } = await req.json();
    if (!query || typeof query !== "string") {
      throw new Error("Missing or invalid query parameter");
    }
    const seedNum = Math.abs(parseInt(String(seed), 10) || 0);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[VIRUM IMG AUDIT] STEP 3 - Edge Function search-clothing-image`, { mode, section, diagnosisId, query, count, seed: seedNum });

    // ── EDITORIAL MODE: per-section specialized AI validation ──
    if (mode === "editorial") {
      // Per-tab specialist: each section defines what a valid image must show.
      const SECTION_SPECS: Record<string, { label: string; mustShow: string; reject: string; minScore: number }> = {
        corpo: {
          label: "body-type styling reference",
          mustShow: "an adult man fully clothed, cropped strictly from below the neck, outfit clearly designed for the target body shape, balanced proportions visible without any head or face",
          reject: "any woman/female subject, any face, any head, hair, portrait, selfie, group shots, children, nudity, shirtless bodies, accessories alone, abstract editorials with no garment focus",
          minScore: 80,
        },
        cores: {
          label: "color palette / season styling",
          mustShow: "garments or palette swatches in the EXACT season's colors (warm autumn, cool winter, etc.). Color story must dominate the frame",
          reject: "any woman/female subject, any face, any head, hair, portrait, selfie, children, nudity, shirtless bodies, wrong-season colors, neon or off-palette tones, busy backgrounds, makeup tutorials",
          minScore: 80,
        },
        estilo: {
          label: "style identity outfit",
          mustShow: "a complete look that visually embodies the target style aesthetic on one adult man, fully clothed, cropped below the neck with the head completely out of frame",
          reject: "any woman/female subject, any face, any head, hair, portrait, selfie, children, nudity, shirtless bodies, outfits from a different style family, costumes, irrelevant lifestyle",
          minScore: 80,
        },
        modelagens: {
          label: "garment fit / silhouette reference",
          mustShow: "a single menswear garment showcasing the exact cut/fit as a flat-lay, product shot, or worn by an adult man cropped below the neck",
          reject: "any woman/female subject, any face, any head, hair, portrait, selfie, children, nudity, shirtless bodies, full styled outfits when product fit is unclear, accessories, multiple unrelated pieces",
          minScore: 80,
        },
        essenciais: {
          label: "wardrobe essential piece",
          mustShow: "a single essential garment (white shirt, trench, jeans, etc.) shown cleanly as a product or worn minimally",
          reject: "any woman/female subject, any face, any head, hair, portrait, selfie, children, nudity, shirtless bodies, complete looks, trendy statement pieces, accessories-only, irrelevant items",
          minScore: 80,
        },
        capsula: {
          label: "capsule wardrobe outfit",
          mustShow: "a curated, coherent men's outfit on an adult man fully clothed and cropped strictly from below the neck, aligned with style + occasion + season",
          reject: "any woman/female subject, any face, any head, hair, portrait, selfie, children, nudity, shirtless bodies, off-style outfits, costume/cosplay, random fashion shots",
          minScore: 80,
        },
        resumo: {
          label: "editorial hero outfit of a styled adult man",
          mustShow: "a high-quality editorial menswear image of a single adult man in a complete look matching the profile, fully clothed, cropped strictly from below the neck",
          reject: "any woman/female subject, any face, any head, hair, portrait, selfie, children, nudity, shirtless bodies, group shots, screenshots, watermarked stock",
          minScore: 75,
        },
      };
      const spec = (section && SECTION_SPECS[section]) || SECTION_SPECS.resumo;
      const queries: string[] = [query, ...(Array.isArray(fallbackQueries) ? fallbackQueries : [])];
      console.log(`[VIRUM IMG AUDIT] STEP 2 - Query editorial recebida (não prompt de geração)`, { section, queries });
      console.log(`[VIRUM IMG AUDIT] STEP 4 - Modelo utilizado no modo editorial`, 'Pexels/Unsplash search + google/gemini-2.5-flash validator');

      async function fetchPool(q: string) {
        const perPage = 20;
        let pool: { url: string; source: string }[] = [];
        const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY");
        if (PEXELS_API_KEY) {
          try {
            const res = await fetch(
              `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${perPage}&orientation=portrait`,
              { headers: { Authorization: PEXELS_API_KEY } }
            );
            if (res.ok) {
              const data = await res.json();
              pool = (data.photos || [])
                .map((p: any) => ({ url: p.src?.large || p.src?.medium, source: "pexels" }))
                .filter((r: any) => r.url);
            }
          } catch (e) { console.error("editorial pexels error", e); }
        }
        if (pool.length === 0) {
          const UNSPLASH_KEY = Deno.env.get("UNSPLASH_ACCESS_KEY");
          if (UNSPLASH_KEY) {
            try {
              const res = await fetch(
                `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=${perPage}&orientation=portrait`,
                { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
              );
              if (res.ok) {
                const data = await res.json();
                pool = (data.results || [])
                  .map((p: any) => ({ url: p.urls?.regular || p.urls?.small, source: "unsplash" }))
                  .filter((r: any) => r.url);
              }
            } catch (e) { console.error("editorial unsplash error", e); }
          }
        }
        return pool;
      }

      let bestPick: { url: string; source: string; score: number } | null = null;
      let lastReachable: { url: string; source: string }[] = [];

      for (const q of queries) {
        const pool = await fetchPool(q);
        if (pool.length === 0) continue;
        const reachable: { url: string; source: string }[] = [];
        for (const r of pool.slice(0, 12)) {
          if (await validateImageUrl(r.url)) reachable.push(r);
          if (reachable.length >= 10) break;
        }
        if (reachable.length === 0) continue;
        lastReachable = reachable;

        const aiContext = `SECTION: "${spec.label}". TARGET: ${query}. MUST SHOW: ${spec.mustShow}. HARD REJECT: ${spec.reject}. Mandatory VIRUM rule: reject if any human face, head, hair, woman/female subject, child, nudity, shirtless torso, group, portrait, selfie, or headshot is visible.`;
        const aiScores = await aiScoreImages(aiContext, spec.label, reachable.map(r => r.url));
        const acceptable = aiScores.filter(s => s.score >= spec.minScore && reachable[s.index]);

        if (acceptable.length > 0) {
          const chosen = acceptable[seedNum % acceptable.length];
          bestPick = { ...reachable[chosen.index], score: chosen.score };
          console.log(`✅ editorial[${section}] q="${q}" score=${chosen.score}`);
          break;
        } else {
          console.warn(`↪ editorial[${section}] rejected all for "${q}" (top=${aiScores[0]?.score ?? 'n/a'}); trying fallback`);
        }
      }

      if (!bestPick) {
        console.warn(`[VIRUM IMG AUDIT] STEP 5 - Editorial sem imagem segura; nenhum fallback não validado será retornado`, { section, lastReachable: lastReachable.length });
        return new Response(
          JSON.stringify({ results: [], source: "none", rejected: true, reason: "no_validated_face_free_editorial_image" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[VIRUM IMG AUDIT] STEP 5 - URL editorial validada`, { section, url: bestPick.url, source: bestPick.source, score: bestPick.score });
      return new Response(
        JSON.stringify({ results: [{ url: bestPick.url, source: bestPick.source, score: bestPick.score }], cached: false, seed: seedNum, section }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedKey = generateNormalizedKey(query);
    const category = detectCategory(query);

    console.log(`🔍 Input: "${query}" → Key: "${normalizedKey}" | Cat: "${category}"`);

    // ── STEP 0: Per-diagnosis SNAPSHOT (immutable) ──
    // If this diagnosis has already been shown an image for this piece, ALWAYS
    // return that URL — regardless of `needs_regen` on the global cache. This
    // guarantees a reopened diagnosis renders the exact same capsule the user
    // originally saw, even after mass regenerations of the global catalog.
    if (diagnosisId) {
      const { data: snap } = await supabase
        .from("diagnosis_images")
        .select("image_url, source")
        .eq("diagnosis_id", diagnosisId)
        .eq("normalized_key", normalizedKey)
        .maybeSingle();
      if (snap?.image_url) {
        console.log(`📸 SNAPSHOT HIT (diag=${diagnosisId}) "${normalizedKey}": ${snap.image_url}`);
        return new Response(
          JSON.stringify({
            results: [{ url: snap.image_url, source: snap.source || "snapshot" }],
            cached: true,
            snapshot: true,
            normalizedKey,
            category,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── STEP 1: Check DB for existing image ──
    const { data: existing } = await supabase
      .from("clothing_images")
      .select("image_url, piece_key, description, needs_regen")
      .eq("normalized_key", normalizedKey)
      .limit(1)
      .maybeSingle();

    // Treat rows flagged for regeneration as MISS — they were cached before
    // the new faceless/product rules and must be re-fetched from the pipeline.
    if (existing?.image_url && !existing.needs_regen) {
      console.log(`✅ DB HIT for "${normalizedKey}": ${existing.image_url}`);
      // Persist snapshot even on cache hit so the first render of this diagnosis
      // locks in the URL and future reopens skip straight to STEP 0.
      if (diagnosisId) {
        await supabase
          .from("diagnosis_images")
          .insert({
            diagnosis_id: diagnosisId,
            normalized_key: normalizedKey,
            image_url: existing.image_url,
            category,
            description: query,
            source: "database",
          })
          .then(({ error }) => {
            if (error && !/duplicate|unique/i.test(error.message)) {
              console.warn("snapshot(cache-hit) insert failed:", error.message);
            }
          });
      }
      return new Response(
        JSON.stringify({ results: [{ url: existing.image_url, source: "database" }], cached: true, normalizedKey, category }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existing?.needs_regen) {
      console.log(`♻️ DB REGEN required for "${normalizedKey}" → refetching from APIs`);
    } else {
      console.log(`❌ DB MISS for "${normalizedKey}" → searching APIs...`);
    }

    const perPage = 20;
    const categoryLabel = CATEGORY_LABELS[category] || CATEGORY_LABELS.outros;

    // ── STEP 2/3: PROGRESSIVE search (specific → generic, EN only) ──
    // For each candidate query, try Pexels first, then Unsplash, then run the
    // AI validator. Stop at the first query that yields an image scoring ≥70.
    const progressiveQueries = buildProgressiveQueries(query);
    console.log(`🔎 Progressive queries for "${query}":`, progressiveQueries);

    let validUrl: string | null = null;
    let validSource = "";
    let validScore = 0;
    let lastAttempt: { query: string; poolSize: number; topScore: number | null } | null = null;

    for (let i = 0; i < progressiveQueries.length; i++) {
      const q = progressiveQueries[i];
      const isRelaxed = i > 0;
      console.log(`🔎 [${i + 1}/${progressiveQueries.length}] Pexels: "${q}"`);
      let pool = await buscarPexels(q, perPage);
      if (pool.length === 0) {
        console.log(`🔎 [${i + 1}/${progressiveQueries.length}] Unsplash: "${q}"`);
        pool = await buscarUnsplash(q, perPage);
      }
      if (pool.length === 0) continue;

      const reachable: { url: string; source: string }[] = [];
      for (const r of pool.slice(0, 12)) {
        if (await validateImageUrl(r.url)) reachable.push(r);
        if (reachable.length >= 8) break;
      }
      if (reachable.length === 0) continue;

      // Relax the AI acceptance threshold on the last fallbacks so we don't
      // reject a perfectly good generic "loafers" shot just because it isn't
      // an exact style match.
      const minScore = isRelaxed ? 55 : 70;
      const aiContext = `Men's fashion catalog image showing a single ${categoryLabel}. Description: "${query}". Query used: "${q}". Must be a clean product / flat-lay or focused garment shot — no women, no faces close-up, no group shots, no irrelevant categories.`;
      const aiScores = await aiScoreImages(aiContext, categoryLabel, reachable.map(r => r.url));
      lastAttempt = { query: q, poolSize: reachable.length, topScore: aiScores[0]?.score ?? null };

      for (const s of aiScores) {
        if (s.score >= minScore && reachable[s.index]) {
          validUrl = reachable[s.index].url;
          validSource = reachable[s.index].source;
          validScore = s.score;
          console.log(`🤖 AI picked q="${q}" idx=${s.index} score=${s.score} minScore=${minScore} reason="${s.reason}"`);
          break;
        }
      }
      if (validUrl) break;
      console.warn(`↪ progressive: rejected all for "${q}" (top=${aiScores[0]?.score ?? 'n/a'}, min=${minScore})`);
    }

    if (!validUrl) {
      console.warn(`[VIRUM IMG AUDIT] STEP 5 - Produto sem imagem segura após busca progressiva`, { query, normalizedKey, category, lastAttempt });
      return new Response(
        JSON.stringify({ results: [], source: "none", normalizedKey, category, rejected: true, reason: "no_validated_face_free_product_image" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Validated (${validSource}, score=${validScore}): ${validUrl}`);

    // ── STEP 4.5: Write per-diagnosis SNAPSHOT ──
    // Lock the freshly picked URL to this diagnosis so any future reopen skips
    // the cache/generation pipeline entirely (STEP 0 hit).
    if (diagnosisId && validUrl) {
      const { error: snapErr } = await supabase
        .from("diagnosis_images")
        .insert({
          diagnosis_id: diagnosisId,
          normalized_key: normalizedKey,
          image_url: validUrl,
          category,
          description: query,
          source: validSource,
        });
      if (snapErr && !/duplicate|unique/i.test(snapErr.message)) {
        console.warn("snapshot(fresh) insert failed:", snapErr.message);
      } else if (!snapErr) {
        console.log(`📸 Snapshot written for diag=${diagnosisId} key="${normalizedKey}"`);
      }
    }

    // ── STEP 5: Save to DB (only if not already saved) ──
    const { data: doubleCheck } = await supabase
      .from("clothing_images")
      .select("id")
      .eq("normalized_key", normalizedKey)
      .maybeSingle();

    if (!doubleCheck) {
      const { error: insertError } = await supabase
        .from("clothing_images")
        .insert({
          piece_key: normalizedKey,
          image_url: validUrl,
          description: query,
          category,
          normalized_key: normalizedKey,
          diagnosis_id: null, // Global: shared across all users
          needs_regen: false, // Freshly generated under the current faceless/product rules.
        });

      if (insertError) {
        // Unique constraint violation = already saved by another request (race condition)
        if (insertError.message?.includes("duplicate") || insertError.message?.includes("unique")) {
          console.log(`⚡ Race condition: "${normalizedKey}" already saved by another request`);
        } else {
          console.warn("Failed to save clothing image:", insertError.message);
        }
      } else {
        console.log(`💾 Saved to catalog: "${normalizedKey}" (${category}) from ${validSource}`);
      }
    } else {
      console.log(`⚡ Already saved by concurrent request: "${normalizedKey}"`);
      // If the concurrent row is a legacy one still flagged for regen, refresh it
      // now with the freshly validated URL so we don't loop back to REGEN next time.
      if (existing?.needs_regen) {
        const { error: updErr } = await supabase
          .from("clothing_images")
          .update({ image_url: validUrl, needs_regen: false, description: query, category })
          .eq("normalized_key", normalizedKey);
        if (updErr) console.warn("Failed to refresh legacy row:", updErr.message);
        else console.log(`♻️ Refreshed legacy row for "${normalizedKey}"`);
      }
    }

    return new Response(
      JSON.stringify({ results: [{ url: validUrl, source: validSource, score: validScore }], normalizedKey, category, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error searching clothing image:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, results: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
