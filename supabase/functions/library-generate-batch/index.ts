// Generate a batch of pending library_assets. Admin-only.
// Pulls up to `batchSize` pending rows, generates via gpt-image-2 with concurrency,
// uploads to storage, and marks each row done/failed.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUCKET = "library-assets";
const DEFAULT_BATCH = 10;
const MAX_BATCH = 30;
const CONCURRENCY = 5;
const MAX_ATTEMPTS = 4;

type Row = {
  id: string;
  category: string;
  style: string;
  body_type: string;
  color_season: string;
  variant_index: number;
  prompt: string;
  attempts: number;
};

// Image acquisition via Pexels (primary) → Unsplash (fallback). We no longer
// generate images; we search a real-photo library and download the chosen URL.
async function fetchStockImage(prompt: string): Promise<{ bytes: Uint8Array; source: string }> {
  const query = prompt.slice(0, 200);

  const tryDownload = async (url: string, source: string) => {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength < 5000) return null;
    return { bytes, source };
  };

  // 1) Pexels
  const pexelsKey = Deno.env.get("PEXELS_API_KEY")?.trim();
  if (pexelsKey) {
    try {
      const r = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=portrait`,
        { headers: { Authorization: pexelsKey } },
      );
      if (r.status === 429) throw new Error("RATE_LIMIT_EXCEEDED");
      if (r.ok) {
        const j = await r.json();
        const first = (j?.photos || [])[0];
        const url = first?.src?.large2x || first?.src?.large || first?.src?.original;
        if (url) {
          const dl = await tryDownload(url, "pexels");
          if (dl) return dl;
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message === "RATE_LIMIT_EXCEEDED") throw err;
      console.warn("[lib] pexels lookup failed:", err instanceof Error ? err.message : err);
    }
  }

  // 2) Unsplash
  const unsplashKey = Deno.env.get("UNSPLASH_ACCESS_KEY")?.trim();
  if (unsplashKey) {
    const r = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=portrait`,
      { headers: { Authorization: `Client-ID ${unsplashKey}` } },
    );
    if (r.status === 429) throw new Error("RATE_LIMIT_EXCEEDED");
    if (r.ok) {
      const j = await r.json();
      const first = (j?.results || [])[0];
      const url = first?.urls?.regular || first?.urls?.small;
      if (url) {
        const dl = await tryDownload(url, "unsplash");
        if (dl) return dl;
      }
    }
  }

  throw new Error("NO_STOCK_IMAGE_FOUND");
}

async function processOne(row: Row, admin: ReturnType<typeof createClient>): Promise<{ ok: boolean; error?: string; source?: string }> {
  const t0 = Date.now();
  try {
    const { bytes, source } = await fetchStockImage(row.prompt);
    if (bytes.byteLength < 10_000) throw new Error("Image too small");

    const path = `${row.category}/${row.style}/${row.body_type}/${row.color_season}/${row.id}-${row.variant_index}.jpg`;
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (upErr) throw new Error(`upload: ${upErr.message}`);
    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    const imageUrl = pub.publicUrl;

    await admin
      .from("library_assets")
      .update({ status: "done", image_url: imageUrl, source, attempts: row.attempts + 1, last_error: null })
      .eq("id", row.id);

    console.log(`[lib] ok ${row.id} (${row.category}/${row.style}) via ${source} in ${Date.now() - t0}ms`);
    return { ok: true, source };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const newAttempts = row.attempts + 1;
    const finalFailed = newAttempts >= MAX_ATTEMPTS;
    await admin
      .from("library_assets")
      .update({
        status: finalFailed ? "failed" : "pending",
        attempts: newAttempts,
        last_error: msg.slice(0, 500),
      })
      .eq("id", row.id);
    console.warn(`[lib] fail ${row.id} attempt ${newAttempts}/${MAX_ATTEMPTS}: ${msg}`);
    return { ok: false, error: msg };
  }
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let idx = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const my = idx++;
      results[my] = await worker(items[my]);
    }
  });
  await Promise.all(runners);
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const requested = Number(body?.batchSize) || DEFAULT_BATCH;
    const batchSize = Math.max(1, Math.min(MAX_BATCH, requested));
    const includeFailed = Boolean(body?.includeFailed);

    // Claim pending rows: select + set status to 'processing' atomically per row would need rpc.
    // Simpler: select then update by id with the previous status filter to avoid double-claim.
    const statusFilter = includeFailed ? ["pending", "failed"] : ["pending"];
    const { data: pending, error: selErr } = await admin
      .from("library_assets")
      .select("id,category,style,body_type,color_season,variant_index,prompt,attempts")
      .in("status", statusFilter)
      .lt("attempts", MAX_ATTEMPTS)
      .order("attempts", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(batchSize);
    if (selErr) throw new Error(`select: ${selErr.message}`);

    const rows = (pending || []) as Row[];
    if (rows.length === 0) {
      return new Response(JSON.stringify({ processed: 0, ok: 0, failed: 0, message: "no pending rows" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await runWithConcurrency(rows, CONCURRENCY, (r) => processOne(r, admin));
    const okCount = results.filter((r) => r.ok).length;
    const failCount = results.length - okCount;

    return new Response(JSON.stringify({ processed: results.length, ok: okCount, failed: failCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("library-generate-batch error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg === "RATE_LIMIT_EXCEEDED" ? 429 : msg === "AI_CREDITS_EXHAUSTED" ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
