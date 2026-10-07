import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ImagesMap = Map<string, string>;

function normalizeToken(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Loads clothing_images for THIS diagnosis only.
 * Images are no longer shared globally — each diagnosis gets its own set.
 */
export function useDiagnosisImages(
  diagnosisId: string | undefined,
  _pieceNames?: string[],
  refreshKey?: unknown,
  shareToken?: string,
): { imagesMap: ImagesMap; isLoading: boolean } {
  const [imagesMap, setImagesMap] = useState<ImagesMap>(new Map());
  const [isLoading, setIsLoading] = useState(Boolean(diagnosisId));
  const lastFetchedId = useRef<string | null>(null);

  useEffect(() => {
    const fetchKey = diagnosisId ? `${diagnosisId}:${String(refreshKey ?? 'initial')}:${shareToken ?? ''}` : null;
    if (!diagnosisId || !fetchKey || lastFetchedId.current === fetchKey) return;
    lastFetchedId.current = fetchKey;

    setIsLoading(true);

    // Snapshot table is the source of truth per diagnosis — it locks in every
    // image the user originally saw. We fall back to the legacy per-diagnosis
    // rows on `clothing_images` for diagnoses created before the snapshot flow.
    (async () => {
      const map = new Map<string, string>();

      const { data: snap, error: snapErr } = await supabase
        .from('diagnosis_images')
        .select('normalized_key, image_url')
        .eq('diagnosis_id', diagnosisId);
      if (snapErr) console.warn('diagnosis_images load error:', snapErr.message);
      for (const row of snap || []) {
        if (!row.image_url) continue;
        const k = normalizeToken(row.normalized_key);
        if (k) map.set(k, row.image_url);
      }

      // Legacy fallback (won't override snapshot keys).
      const { data: legacy, error: legacyErr } = shareToken
        ? await supabase.rpc('get_shared_clothing_images', { _token: shareToken })
        : await supabase
            .from('clothing_images')
            .select('piece_key, normalized_key, image_url, needs_regen')
            .eq('diagnosis_id', diagnosisId);
      if (legacyErr) console.warn('clothing_images legacy load error:', legacyErr.message);
      for (const row of legacy || []) {
        if ((row as { needs_regen?: boolean }).needs_regen) continue;
        if (!row.image_url) continue;
        for (const value of [row.normalized_key, row.piece_key]) {
          const k = normalizeToken(value);
          if (k && !map.has(k)) map.set(k, row.image_url);
        }
        const prefixKey = normalizeToken(String(row.piece_key || '').split('__')[0]);
        if (prefixKey && !map.has(prefixKey)) map.set(prefixKey, row.image_url);
      }

      setImagesMap(map);
      setIsLoading(false);
    })();
  }, [diagnosisId, refreshKey, shareToken]);

  return { imagesMap, isLoading };
}
