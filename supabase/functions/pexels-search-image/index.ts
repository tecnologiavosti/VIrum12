import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const query = body.query;
    const orientation = body.orientation; // 'landscape' | 'portrait' | 'square'
    const size = body.size; // 'large' | 'medium' | 'small'
    const perPage = Math.max(1, Math.min(Number(body.per_page) || 1, 15));
    if (!query) return new Response(JSON.stringify({ error: "Missing query" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const apiKey = Deno.env.get("PEXELS_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "PEXELS_API_KEY not set" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const params = new URLSearchParams({ query, per_page: String(perPage) });
    if (orientation) params.set("orientation", orientation);
    if (size) params.set("size", size);
    const pexelsRes = await fetch(`https://api.pexels.com/v1/search?${params.toString()}`, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!pexelsRes.ok) {
      const text = await pexelsRes.text();
      return new Response(JSON.stringify({ error: `Pexels API error: ${pexelsRes.status} ${text}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await pexelsRes.json();
    const first = data.photos?.[0];
    const imageUrl = first?.src?.large2x || first?.src?.large || first?.src?.medium || null;
    const photographer = first?.photographer || null;
    const alt = first?.alt || null;
    const photos = (data.photos || []).map((p: { src?: Record<string, string>; photographer?: string; alt?: string; width?: number; height?: number }) => ({
      url: p.src?.large2x || p.src?.large || p.src?.medium,
      photographer: p.photographer,
      alt: p.alt,
      width: p.width,
      height: p.height,
    }));

    return new Response(JSON.stringify({ imageUrl, photographer, alt, photos }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
