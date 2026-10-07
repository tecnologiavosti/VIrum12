import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const cache = new Map<string, string>();

export function useVisualAsset(category: string, value: string | undefined): string {
  const [url, setUrl] = useState<string>('/assets/default.jpg');

  useEffect(() => {
    if (!value) { setUrl('/assets/default.jpg'); return; }
    const key = `${category}:${value}`;
    if (cache.has(key)) { setUrl(cache.get(key)!); return; }

    let cancelled = false;
    supabase
      .from('analysis_visual_assets')
      .select('image_url')
      .eq('category', category)
      .eq('value', value)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const resolved = data?.image_url || '/assets/default.jpg';
        cache.set(key, resolved);
        setUrl(resolved);
      });
    return () => { cancelled = true; };
  }, [category, value]);

  return url;
}
