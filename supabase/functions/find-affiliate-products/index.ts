import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticateUserRequest } from "../_shared/auth.ts";
import { getCredentials } from "../_shared/creds.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─────────────────────────── Types ───────────────────────────
interface AffiliateProduct {
  platform: "shopee" | "shein";
  product_title: string;
  product_price: number | null;
  product_currency: string;
  product_image_url: string | null;
  product_url: string;
  affiliate_url: string;
  rank: number;
}

interface AffiliateProvider {
  name: "shopee" | "shein";
  isConfigured(): boolean;
  search(query: string, limit: number): Promise<AffiliateProduct[]>;
}

// ─────────────────────── Query translation ───────────────────
// Small commerce-friendly PT→EN/simple-PT map. We keep queries short:
// e-commerce search engines rank by keyword frequency, not descriptors.
const COMMERCE_TERMS: Record<string, string> = {
  "blazer estruturado": "blazer masculino",
  blazer: "blazer masculino",
  "camisa social": "camisa social masculina",
  camisa: "camisa masculina",
  camiseta: "camiseta masculina",
  polo: "camisa polo masculina",
  "suéter": "sueter masculino",
  sueter: "sueter masculino",
  tricot: "tricot masculino",
  moletom: "moletom masculino",
  "jaqueta de couro": "jaqueta couro masculina",
  jaqueta: "jaqueta masculina",
  casaco: "casaco masculino",
  "trench coat": "trench coat masculino",
  colete: "colete masculino",
  "calça alfaiataria": "calca alfaiataria masculina",
  "calça jeans": "calca jeans masculina",
  "calça": "calca masculina",
  bermuda: "bermuda masculina",
  shorts: "shorts masculino",
  short: "shorts masculino",
  scarpin: "sapato social masculino",
  mocassim: "mocassim masculino",
  "tênis": "tenis masculino",
  tenis: "tenis masculino",
  "bota chelsea": "bota chelsea masculina",
  bota: "bota masculina",
  sapato: "sapato masculino",
  cinto: "cinto masculino couro",
  "óculos de sol": "oculos de sol masculino",
  oculos: "oculos masculino",
  bolsa: "bolsa masculina",
  mochila: "mochila masculina",
  gravata: "gravata masculina",
  cachecol: "cachecol masculino",
  relogio: "relogio masculino",
  "relógio": "relogio masculino",
};

const COLOR_TERMS: Record<string, string> = {
  preto: "preto", preta: "preta", branco: "branco", branca: "branca",
  azul: "azul", "azul marinho": "azul marinho", vermelho: "vermelho",
  verde: "verde", amarelo: "amarelo", rosa: "rosa", bege: "bege",
  caramelo: "caramelo", marrom: "marrom", cinza: "cinza",
  nude: "nude", borgonha: "vinho", terracota: "terracota",
  mostarda: "mostarda", creme: "creme", off: "off white",
  navy: "azul marinho",
};

function normalize(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCommerceQuery(description: string, category?: string): string {
  const n = normalize(description);
  const parts: string[] = [];

  let type = "";
  for (const key of Object.keys(COMMERCE_TERMS).sort((a, b) => b.length - a.length)) {
    if (n.includes(normalize(key))) { type = COMMERCE_TERMS[key]; break; }
  }
  if (!type) type = category ? `${category} masculino` : "roupa masculina";

  let color = "";
  for (const key of Object.keys(COLOR_TERMS).sort((a, b) => b.length - a.length)) {
    if (n.includes(normalize(key))) { color = COLOR_TERMS[key]; break; }
  }

  parts.push(type);
  if (color) parts.push(color);
  return parts.join(" ").trim();
}

function normalizeKey(description: string, category?: string): string {
  const n = normalize(description);
  let type = "";
  for (const key of Object.keys(COMMERCE_TERMS).sort((a, b) => b.length - a.length)) {
    if (n.includes(normalize(key))) { type = key; break; }
  }
  let color = "";
  for (const key of Object.keys(COLOR_TERMS).sort((a, b) => b.length - a.length)) {
    if (n.includes(normalize(key))) { color = key; break; }
  }
  return [type, color, category]
    .filter(Boolean)
    .join("_")
    .replace(/\s+/g, "_") || n.replace(/\s+/g, "_");
}

// ─────────────────────── Providers ───────────────────────

/**
 * Shopee Affiliate provider.
 * Reference: https://open.shopee.com/documents (Affiliate → productOfferV2).
 *
 * We call the public affiliate GraphQL endpoint using an app-id + secret
 * signed request. Missing credentials → isConfigured() false → provider
 * skipped silently. Any runtime error returns an empty array so the
 * caller keeps working with the remaining providers.
 */
class ShopeeProvider implements AffiliateProvider {
  name = "shopee" as const;
  private appId: string;
  private appSecret: string;
  private affiliateId: string;
  constructor(creds: Record<string, string>) {
    this.appId = creds["SHOPEE_APP_ID"] || "";
    this.appSecret = creds["SHOPEE_APP_SECRET"] || "";
    this.affiliateId = creds["SHOPEE_AFFILIATE_ID"] || "";
  }

  isConfigured(): boolean {
    return !!(this.appId && this.appSecret && this.affiliateId);
  }

  async search(query: string, limit: number): Promise<AffiliateProduct[]> {
    if (!this.isConfigured()) return [];
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const payload = JSON.stringify({
        query: `{ productOfferV2(keyword:"${query.replace(/"/g, '')}", limit:${limit}, sortType:2){ nodes{ productName price imageUrl productLink offerLink shopName commissionRate } } }`,
      });
      const raw = `${this.appId}${timestamp}${payload}${this.appSecret}`;
      const signatureBuf = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(raw),
      );
      const signature = Array.from(new Uint8Array(signatureBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const res = await fetch("https://open-api.affiliate.shopee.com.br/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `SHA256 Credential=${this.appId}, Timestamp=${timestamp}, Signature=${signature}`,
        },
        body: payload,
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        console.log(`[shopee] status ${res.status}`);
        return [];
      }

      const data = await res.json();
      const nodes: any[] = data?.data?.productOfferV2?.nodes || [];
      return nodes.slice(0, limit).map((n, i): AffiliateProduct => ({
        platform: "shopee",
        product_title: String(n.productName || "").slice(0, 200),
        product_price: n.price != null ? Number(n.price) : null,
        product_currency: "BRL",
        product_image_url: n.imageUrl || null,
        product_url: n.productLink || "",
        affiliate_url: n.offerLink || n.productLink || "",
        rank: i,
      })).filter((p) => p.affiliate_url);
    } catch (e) {
      console.error("[shopee] search error", e);
      return [];
    }
  }
}

/**
 * Shein via affiliate network (Awin / CJ / Admitad). Stub: returns [] until
 * the customer tells us which network they contracted; the concrete client
 * for each network is a straightforward HTTP call once we know that.
 * We keep the shape so wiring/UI/persistence are already validated.
 */
class SheinProvider implements AffiliateProvider {
  name = "shein" as const;
  private network: string;
  private apiKey: string;
  private publisherId: string;
  constructor(creds: Record<string, string>) {
    this.network = (creds["SHEIN_AFFILIATE_NETWORK"] || "").toLowerCase();
    this.apiKey = creds["SHEIN_AFFILIATE_API_KEY"] || "";
    this.publisherId = creds["SHEIN_AFFILIATE_PUBLISHER_ID"] || "";
  }

  isConfigured(): boolean {
    return !!(this.network && this.apiKey && this.publisherId);
  }

  async search(_query: string, _limit: number): Promise<AffiliateProduct[]> {
    if (!this.isConfigured()) return [];
    // Concrete network integration (awin/cj/admitad) to be implemented once
    // the customer confirms the network. Failing soft keeps the feature safe.
    console.log(`[shein] network=${this.network} — client not implemented yet`);
    return [];
  }
}

function getProviders(creds: Record<string, string>): AffiliateProvider[] {
  return [new ShopeeProvider(creds), new SheinProvider(creds)];
}

// ────────────────────────── Handler ──────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authResult = await authenticateUserRequest(req, "find-affiliate-products");
    if (!authResult.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: authResult.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = authResult.user;

    const admin = createClient(supabaseUrl, serviceKey);

    const creds = await getCredentials(admin, [
      "SHOPEE_APP_ID", "SHOPEE_APP_SECRET", "SHOPEE_AFFILIATE_ID",
      "SHEIN_AFFILIATE_NETWORK", "SHEIN_AFFILIATE_API_KEY", "SHEIN_AFFILIATE_PUBLISHER_ID",
    ]);

    const body = await req.json().catch(() => ({}));
    const {
      diagnosisId,
      description,
      category,
      look_recommendation_id = null,
      dryRun = false,
    } = body || {};

    // Global on/off switch (site_settings).
    const { data: setting } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", "affiliate_products_enabled")
      .maybeSingle();
    const enabledFlag = (setting?.value as unknown) === true
      || setting?.value === "true"
      || JSON.stringify(setting?.value) === "true";

    const providers = getProviders(creds).filter((p) => p.isConfigured());
    const featureEnabled = enabledFlag && providers.length > 0;

    if (!featureEnabled) {
      return new Response(
        JSON.stringify({
          enabled: false,
          reason: !enabledFlag ? "flag_off" : "no_provider_configured",
          matches: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Admin dry-run: skip DB, just probe providers.
    if (dryRun) {
      const q = description || "camisa branca masculina";
      const results = await Promise.all(providers.map(async (p) => {
        const items = await p.search(q, 1);
        return { platform: p.name, ok: items.length > 0, sample: items[0] || null };
      }));
      return new Response(JSON.stringify({ enabled: true, dryRun: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!diagnosisId || !description) {
      return new Response(
        JSON.stringify({ error: "diagnosisId and description are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Confirm caller owns the diagnosis (defense in depth on top of RLS).
    const { data: diag } = await admin
      .from("diagnoses")
      .select("id, user_id")
      .eq("id", diagnosisId)
      .maybeSingle();
    if (!diag || diag.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nkey = normalizeKey(description, category);

    // Cache-first: if we already resolved this (diagnosis, piece), return it.
    const { data: cached } = await admin
      .from("affiliate_product_matches")
      .select("*")
      .eq("diagnosis_id", diagnosisId)
      .eq("normalized_key", nkey)
      .order("rank", { ascending: true });

    if (cached && cached.length > 0) {
      return new Response(
        JSON.stringify({ enabled: true, cached: true, matches: cached }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Read max per piece.
    const { data: maxSetting } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", "affiliate_max_matches_per_piece")
      .maybeSingle();
    const maxPerPiece = Math.max(1, Math.min(5, Number(maxSetting?.value ?? 3) || 3));

    const query = buildCommerceQuery(description, category);
    console.log(`[find-affiliate-products] query="${query}" providers=${providers.map(p => p.name).join(',')}`);

    const settled = await Promise.allSettled(
      providers.map((p) => p.search(query, maxPerPiece)),
    );

    const merged: AffiliateProduct[] = [];
    settled.forEach((r) => {
      if (r.status === "fulfilled") merged.push(...r.value);
    });

    // Interleave platforms so the UI shows variety.
    merged.sort((a, b) => a.rank - b.rank);
    const finalList = merged.slice(0, maxPerPiece);

    if (finalList.length === 0) {
      return new Response(
        JSON.stringify({ enabled: true, cached: false, matches: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rows = finalList.map((p, i) => ({
      diagnosis_id: diagnosisId,
      look_recommendation_id,
      normalized_key: nkey,
      platform: p.platform,
      product_title: p.product_title,
      product_price: p.product_price,
      product_currency: p.product_currency,
      product_image_url: p.product_image_url,
      product_url: p.product_url,
      affiliate_url: p.affiliate_url,
      rank: i,
    }));

    const { data: inserted, error: insErr } = await admin
      .from("affiliate_product_matches")
      .insert(rows)
      .select("*");

    if (insErr) {
      console.error("[find-affiliate-products] insert error", insErr);
      return new Response(
        JSON.stringify({ enabled: true, cached: false, matches: finalList }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ enabled: true, cached: false, matches: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[find-affiliate-products] fatal", e);
    return new Response(
      JSON.stringify({ enabled: false, error: (e as Error).message, matches: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});