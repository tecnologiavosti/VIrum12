import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type LookImagesMap = Record<string, string>;

/**
 * Loads all look_images for a diagnosis in a single query.
 * Returns a map of look_name → image_url.
 */
export function useLookImages(
  diagnosisId: string | undefined,
  refreshKey?: unknown,
  shareToken?: string,
): { lookImagesMap: LookImagesMap; isLoading: boolean } {
  const [lookImagesMap, setLookImagesMap] = useState<LookImagesMap>({});
  const [isLoading, setIsLoading] = useState(Boolean(diagnosisId));
  const lastFetchedId = useRef<string | null>(null);

  useEffect(() => {
    const fetchKey = diagnosisId ? `${diagnosisId}:${String(refreshKey ?? 'initial')}:${shareToken ?? ''}` : null;
    if (!diagnosisId || !fetchKey || lastFetchedId.current === fetchKey) return;
    lastFetchedId.current = fetchKey;

    setIsLoading(true);

    const query = shareToken
      ? supabase.rpc('get_shared_look_images', { _token: shareToken })
      : supabase.from('look_images').select('look_name, image_url').eq('diagnosis_id', diagnosisId);

    (query as unknown as Promise<{ data: Array<{ look_name: string; image_url: string }> | null; error: unknown }>)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error loading look images:', error);
          setIsLoading(false);
          return;
        }

        const map: LookImagesMap = {};
        for (const row of data || []) {
          map[row.look_name] = row.image_url;
        }
        setLookImagesMap(map);
        setIsLoading(false);
      });
  }, [diagnosisId, refreshKey, shareToken]);

  return { lookImagesMap, isLoading };
}
