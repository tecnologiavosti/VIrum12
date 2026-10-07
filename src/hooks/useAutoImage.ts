import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { ImagesMap } from './useDiagnosisImages';
import { getStaticDiagnosticImage, setStaticDiagnosticImage } from '@/lib/diagnosticImageLoader';
import { useSectionImagesContext } from '@/contexts/SectionImagesContext';
import type { DiagnosticData } from '@/types/diagnostic';
import { generateImagePrompt } from '@/lib/promptBuilder';
import { STYLE_EN, SEASON_FOR_TONE } from '@/lib/imageTranslations';
import { searchEditorialImage } from '@/lib/imageFetchService';

/** Build an editorial English query enriched with diagnosis context. */
function buildEditorialQuery(
  pieceName: string,
  category: string | undefined,
  color: string | undefined,
  diagnostic: DiagnosticData | null | undefined,
): string {
  const parts: string[] = ['editorial menswear', 'men fashion', 'no woman', 'no face', 'no portrait'];
  if (diagnostic) {
    const style = STYLE_EN[diagnostic.estiloPersonalidade];
    const season = SEASON_FOR_TONE[diagnostic.tomDePele];
    if (style) parts.push(style);
    if (season) parts.push(`${season} palette`);
    if (diagnostic.profissao) parts.push(String(diagnostic.profissao).toLowerCase());
  }
  if (color) parts.push(color);
  parts.push(pieceName);
  if (category) parts.push(category);
  parts.push('male model from the neck down, premium studio background');
  return parts.join(' ');
}

// ─── Category detection: accessory vs full clothing/look ───
const ACCESSORY_REGEX = /\b(rel[oó]gio|watch|anel|ring|brinco|earring|pulseira|bracelet|colar|necklace|[oó]culos|sunglasses|eyewear|gravata|tie|lenço|lencco|cinto|belt|abotoadura|cufflink|chap[eé]u|hat|boné|bone|carteira|wallet)\b/i;

function isAccessoryPiece(name?: string, category?: string): boolean {
  if (category && /acess[oó]rio|accessory|jewel|jewelry|watch|relogio/i.test(category)) return true;
  if (name && ACCESSORY_REGEX.test(name)) return true;
  return false;
}

function buildPiecePrompt(params: {
  pieceName: string;
  pieceColor?: string;
  category?: string;
  diagnostic?: DiagnosticData | null;
}): string {
  const { pieceName, pieceColor, category, diagnostic } = params;
  if (!diagnostic) {
    // Minimal safe prompt when there is no full profile yet — adult man, from the neck down.
    return `Editorial premium menswear photograph of an adult man wearing ${pieceName}${pieceColor ? ` in ${pieceColor}` : ''}, framed strictly from below the neck, head and face completely out of frame, fully clothed, studio lighting, photorealistic. NO face, NO head, NO hair, NO woman, NO child, NO couple, NO shirtless, NO nudity, NO text, NO logo.`;
  }
  const imageType = isAccessoryPiece(pieceName, category) ? 'wardrobe_accessory' : 'wardrobe';
  return generateImagePrompt(diagnostic, imageType, {
    piece: pieceName,
    color: pieceColor,
    category,
  });
}



function normalizeToken(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function fetchClothingImage(
  pieceName: string,
  diagnosisId: string,
  category?: string,
  nonce?: number,
  color?: string,
  _customPrompt?: string,
  searchQuery?: string,
): Promise<string | null> {
  const cacheKey = `${diagnosisId}:${normalizeToken(pieceName)}:${normalizeToken(category)}:${normalizeToken(color)}:${nonce ?? 0}`;

  // Only path now: real photo search (Pexels → Unsplash) via search-clothing-image.
  // No AI image generation anywhere in the client pipeline.
  const q = searchQuery || (category ? `${pieceName} ${category}` : pieceName);
  const found = await searchEditorialImage({
    query: q,
    diagnosisId,
    timeoutMs: 8000,
    cacheKey: `search:${cacheKey}`,
    logTag: '[useAutoImage.search]',
  });
  return found ? found.url : null;
}



/**
 * Resolves a clothing image for a piece scoped to a diagnosis.
 * - 15s hard timeout per request (no infinite loading).
 * - Exposes `retry()` so the UI can let the user retry manually.
 */
export function useAutoImage(
  pieceName: string | undefined,
  imagesMap?: ImagesMap,
  diagnosisId?: string,
  category?: string,
  color?: string,
) {
  const normalizedName = useMemo(() => normalizeToken(pieceName), [pieceName]);
  const { diagnostic } = useSectionImagesContext();
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const fetchedRef = useRef<string | null>(null);

  const staticUrl = useMemo(() => {
    if (!diagnosisId || !normalizedName) return null;
    return getStaticDiagnosticImage(`${diagnosisId}:piece:${normalizedName}`);
  }, [diagnosisId, normalizedName]);

  const cachedUrl = useMemo(() => {
    if (staticUrl) return staticUrl;
    if (!normalizedName || !imagesMap || imagesMap.size === 0) return null;
    // Exact match only. Substring matching caused cross-contamination between
    // pieces (e.g. an "overshirt de flanela..." inheriting the image of a
    // short-keyed accessory like "cinto" or "relogio" because the short key
    // was contained in the longer piece name).
    return imagesMap.get(normalizedName) || null;
  }, [staticUrl, normalizedName, imagesMap]);

  useEffect(() => {
    if (!diagnosisId || !normalizedName || !cachedUrl) return;
    setStaticDiagnosticImage(`${diagnosisId}:piece:${normalizedName}`, cachedUrl);
  }, [diagnosisId, normalizedName, cachedUrl]);

  useEffect(() => {
    setFallbackUrl(null);
    setHasFailed(false);
    fetchedRef.current = null;
  }, [normalizedName, diagnosisId]);

  useEffect(() => {
    if (!normalizedName || !pieceName || !diagnosisId || cachedUrl) return;
    const key = `${diagnosisId}:${normalizedName}:${normalizeToken(category)}:${normalizeToken(color)}:${attempt}`;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;

    // Build conditional prompt on the FRONTEND (accessory close-up vs full lookbook)
    const customPrompt = buildPiecePrompt({ pieceName, pieceColor: color, category, diagnostic });
    const editorialQuery = buildEditorialQuery(pieceName, category, color, diagnostic);

    let cancelled = false;
    setIsFetching(true);
    setHasFailed(false);
    // Pass attempt as nonce so retries bypass server cache
    fetchClothingImage(
      pieceName,
      diagnosisId,
      category,
      attempt > 0 ? attempt : undefined,
      color,
      customPrompt,
      editorialQuery,
    ).then((url) => {
      if (cancelled) return;
      console.log('[VIRUM IMG AUDIT] STEP 7 - Imagem de peça resolvida', { pieceName, diagnosisId, url });
      if (url) {
        setStaticDiagnosticImage(`${diagnosisId}:piece:${normalizedName}`, url);
        setFallbackUrl(url);
        setHasFailed(false);
      } else {
        console.warn('[VIRUM IMG AUDIT] STEP 7 - Nenhuma imagem encontrada em Pexels/Unsplash', { pieceName, category });
        setFallbackUrl(null);
        setHasFailed(true);
      }
      setIsFetching(false);
    });
    return () => { cancelled = true; };
  }, [pieceName, normalizedName, cachedUrl, diagnosisId, category, color, attempt, diagnostic]);

  const retry = useCallback(() => {
    fetchedRef.current = null;
    setFallbackUrl(null);
    setHasFailed(false);
    setAttempt((v) => v + 1);
  }, []);

  return {
    imageUrl: cachedUrl || fallbackUrl,
    isLoading: isFetching,
    hasFailed,
    retry,
  };
}
