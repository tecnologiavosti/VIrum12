/**
 * Centralized image fetch service. Only path in use: `search-clothing-image`
 * (Pexels → Unsplash editorial/product search). The previous FLUX/HuggingFace
 * generation fallback has been removed — no external image generator runs
 * anywhere in the client pipeline.
 */
import { supabase } from '@/integrations/supabase/client';

const inflight = new Map<string, Promise<unknown>>();

// ─────────── Query bias helpers ───────────
// Pexels/Unsplash don't run through the promptBuilder, so any face bias in the
// query itself must be pushed here. We steer the search toward product/flat-lay
// menswear frames and away from portraits/faces. The `search-clothing-image`
// edge function still runs an AI validator that hard-rejects any face that
// slips through — this is the FIRST line of defense (cheap keyword bias).
const PRODUCT_POSITIVE = 'menswear product flat lay catalog no model';
const FACE_NEGATIVE = '-portrait -face -selfie -headshot -model -people -person -woman -women -female';

function biasProductQuery(query: string): string {
  const q = (query || '').trim();
  if (!q) return q;
  // Avoid double-appending when hook already added the same bias.
  const hasPositive = /menswear|flat\s*lay|product|catalog/i.test(q);
  const hasNegative = /-portrait|-face|-selfie|-model/i.test(q);
  const positive = hasPositive ? '' : ` ${PRODUCT_POSITIVE}`;
  const negative = hasNegative ? '' : ` ${FACE_NEGATIVE}`;
  return `${q}${positive}${negative}`.replace(/\s+/g, ' ').trim();
}

/** De-duplicates concurrent calls sharing the same logical key. */
function withInflight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const promise = fn().finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

/** Race a promise against a timeout. Returns `null` on timeout. */
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => void,
): Promise<T | null> {
  const TIMEOUT = Symbol('timeout');
  const result = await Promise.race<T | typeof TIMEOUT>([
    promise,
    new Promise<typeof TIMEOUT>((resolve) => setTimeout(() => resolve(TIMEOUT), ms)),
  ]);
  if (result === TIMEOUT) {
    onTimeout();
    return null;
  }
  return result;
}

// ─────────── Editorial search (Pexels → Unsplash) ───────────

export interface EditorialSearchParams {
  query: string;
  fallbackQueries?: string[];
  section?: string;
  mode?: 'editorial' | 'product';
  diagnosisId: string;
  seed?: number;
  timeoutMs?: number;
  /** Optional explicit cache key. Defaults to the full query payload. */
  cacheKey?: string;
  /** Tag prefix used in console logs. */
  logTag?: string;
}

export interface EditorialSearchResult {
  url: string;
  source?: string;
  score?: number;
}

/** Calls the `search-clothing-image` edge function. Returns `null` if no result. */
export async function searchEditorialImage(
  params: EditorialSearchParams,
): Promise<EditorialSearchResult | null> {
  const {
    query,
    fallbackQueries,
    section,
    mode,
    diagnosisId,
    seed,
    timeoutMs = 8000,
    cacheKey,
    logTag = '[imageFetch.search]',
  } = params;

  const key = cacheKey ?? `search:${section ?? 'piece'}:${seed ?? 0}:${query}`;
  return withInflight(key, async () => {
    const startedAt = Date.now();
    try {
      // Default to product-biased search so Pexels/Unsplash don't return
      // face-heavy portraits. Editorial mode keeps the raw query (the edge
      // function's SECTION_SPECS validator handles composition rules there).
      const effectiveMode = mode ?? 'product';
      const biasedQuery = effectiveMode === 'editorial' ? query : biasProductQuery(query);
      const biasedFallbacks = effectiveMode === 'editorial'
        ? fallbackQueries
        : fallbackQueries?.map((q) => biasProductQuery(q));

      const body: Record<string, unknown> = { query: biasedQuery, count: 1, diagnosisId };
      if (biasedFallbacks?.length) body.fallbackQueries = biasedFallbacks;
      if (section) body.section = section;
      body.mode = effectiveMode;
      if (typeof seed === 'number') body.seed = seed;

      console.log(`${logTag} [VIRUM IMG AUDIT] STEP 1 - Frontend → search-clothing-image`, {
        mode: effectiveMode,
        section,
        diagnosisId,
        query: biasedQuery,
        fallbackQueries: biasedFallbacks,
      });

      const response = await withTimeout(
        supabase.functions.invoke('search-clothing-image', { body }) as Promise<{
          data: { results?: Array<{ url?: string; source?: string; score?: number }> } | null;
          error: unknown;
        }>,
        timeoutMs,
        () => console.warn(`${logTag} timeout "${query}"`),
      );
      if (!response) return null;

      const first = response.data?.results?.[0];
      if (!first?.url) {
        console.warn(`${logTag} empty "${query}" in ${Date.now() - startedAt}ms`);
        return null;
      }
      console.log(
        `${logTag} ok "${query}" src=${first.source ?? 'n/a'} score=${first.score ?? 'n/a'} in ${Date.now() - startedAt}ms`,
      );
      console.log(`${logTag} [VIRUM IMG AUDIT] STEP 5 - URL retornada por busca`, first.url);
      return { url: first.url, source: first.source, score: first.score };
    } catch (err) {
      console.warn(`${logTag} error "${query}"`, err);
      return null;
    }
  });
}

// The FLUX/HuggingFace generation fallback has been removed. `search-clothing-image`
// (Pexels → Unsplash) is now the single source of imagery.