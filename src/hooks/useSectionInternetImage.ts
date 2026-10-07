import { useEffect, useMemo, useState } from 'react';
import { getStaticDiagnosticImage, setStaticDiagnosticImage } from '@/lib/diagnosticImageLoader';
import type { DiagnosticData } from '@/types/diagnostic';
import type { SectionId } from '@/lib/imageService';
import { supabase } from '@/integrations/supabase/client';

const SECTION_IMAGE_CACHE_VERSION = 'pexels-style-v1';

/** Stable 32-bit hash so the same diagnosis always picks the same image,
 *  but two different diagnoses get different picks. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function diagnosisFingerprint(d: DiagnosticData): string {
  return [
    d.userId,
    d.tipoCorporal,
    d.tomDePele,
    d.corCabelo,
    d.corOlhos,
    d.estiloPersonalidade,
    d.caimento,
    d.formalidade,
    d.ocasiao,
    d.clima,
    d.profissao,
    d.orcamento,
    d.altura,
    d.peso,
    d.imageContext?.style,
    d.imageContext?.season,
    d.imageContext?.occasion,
    ...(d.imageContext?.palette || []),
    ...(d.imageContext?.recommendedPieces || []),
    ...(d.imageContext?.lookPieces || []),
    ...(d.imageContext?.accessories || []),
  ].map((v) => String(v ?? '')).join('|');
}

/**
 * Fetches an illustrative menswear stock photo (Pexels → Unsplash) matching the
 * calculated style. The image never identifies specific pieces — it is a purely
 * visual mood reference. Text sections must remain fully self-contained.
 */
async function fetchStockStyleImage(
  section: SectionId,
  variant: 'primary' | 'secondary',
  diagnostic: DiagnosticData,
): Promise<string | null> {
  const style = String(diagnostic.imageContext?.style || diagnostic.estiloPersonalidade || '');
  const secondaryStyles = Array.isArray((diagnostic as unknown as { estilosSecundarios?: string[] }).estilosSecundarios)
    ? (diagnostic as unknown as { estilosSecundarios: string[] }).estilosSecundarios
    : [];
  const tags = Array.from(new Set([
    style,
    ...(secondaryStyles || []),
    ...(diagnostic.imageContext?.palette || []),
    diagnostic.formalidade,
    diagnostic.imageContext?.season,
  ].filter(Boolean) as string[]));
  const orientation = variant === 'secondary' ? 'landscape' : 'portrait';
  console.log(`[VIRUM IMG AUDIT] STEP 2 - search-style-image (${section}/${variant})`, { style, tags, orientation });
  try {
    const { data, error } = await supabase.functions.invoke('search-style-image', {
      body: { style, secondaryStyles, tags, variant, orientation, section },
    }) as { data: { url?: string | null; query?: string; provider?: string } | null; error: unknown };
    if (error || !data?.url) {
      console.warn(`[VIRUM IMG AUDIT] STEP 5 - search-style-image sem URL (${section}/${variant})`, error);
      return null;
    }
    console.log(`[VIRUM IMG AUDIT] STEP 5 - URL (${section}/${variant}) via ${data.provider} q="${data.query}"`, data.url);
    return data.url;
  } catch (err) {
    console.warn(`[VIRUM IMG AUDIT] STEP 5 - erro search-style-image (${section}/${variant})`, err);
    return null;
  }
}

/**
 * Resolves a dynamic section image through the controlled generation pipeline.
 * The previous Pexels/Unsplash editorial search path is intentionally bypassed
 * because it could return unvalidated portraits that never used promptBuilder.
 */
export function useSectionInternetImage(
  section: SectionId,
  variant: 'primary' | 'secondary',
  diagnostic: DiagnosticData | null | undefined,
) {
  const fingerprint = useMemo(() => (diagnostic ? diagnosisFingerprint(diagnostic) : ''), [diagnostic]);
  const diagHash = useMemo(() => (fingerprint ? hashString(fingerprint) : 0), [fingerprint]);
  const seed = useMemo(
    () => (diagHash ? (diagHash ^ hashString(`${section}:${variant}`)) >>> 0 : 0),
    [diagHash, section, variant],
  );
  const cacheKey = diagnostic
    ? `${diagnostic.userId}:section_server:${section}:${variant}:${diagHash}:${SECTION_IMAGE_CACHE_VERSION}`
    : null;
  const initial = useMemo(() => (cacheKey ? getStaticDiagnosticImage(cacheKey) : null), [cacheKey]);
  const [url, setUrl] = useState<string | null>(initial);
  const [loading, setLoading] = useState(!initial && !!diagnostic);

  useEffect(() => {
    if (!diagnostic || !cacheKey) return;
    const cached = getStaticDiagnosticImage(cacheKey);
    if (cached) {
      console.log(`[VIRUM IMG AUDIT] STEP 6 - Cache local HIT (${section}/${variant})`, cached);
      setUrl(cached);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      console.log(`[VIRUM IMG AUDIT] STEP 1 - Frontend solicitou imagem de seção (${section}/${variant})`, { diagnosisId: diagnostic.userId, seed });
      const found = await fetchStockStyleImage(section, variant, diagnostic);
      if (cancelled) return;
      if (found) {
        console.log(`[VIRUM IMG AUDIT] STEP 5 - URL retornada para seção (${section}/${variant})`, found);
        setStaticDiagnosticImage(cacheKey, found);
        setUrl(found);
      } else {
        console.warn(`[VIRUM IMG AUDIT] STEP 5 - Nenhuma URL segura retornada para seção (${section}/${variant})`);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [cacheKey, section, variant, diagnostic, seed]);

  return { url, loading };
}

