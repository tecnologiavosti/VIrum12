import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SeoCategory =
  | 'general'
  | 'open_graph'
  | 'twitter'
  | 'favicons'
  | 'google'
  | 'microsoft'
  | 'pixels'
  | 'schema'
  | 'sitemap_config'
  | 'robots_txt';

export interface SeoPage {
  id?: string;
  path: string;
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  canonical?: string | null;
  og_image?: string | null;
  robots?: string | null;
  priority?: number | null;
  changefreq?: string | null;
  enabled?: boolean;
}

export function useSeoSettingsAll() {
  return useQuery({
    queryKey: ['seo_settings_all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('seo_settings').select('category,data');
      if (error) throw error;
      const map: Record<string, any> = {};
      (data ?? []).forEach((r: any) => { map[r.category] = r.data; });
      return map as Record<SeoCategory, any>;
    },
    staleTime: 60_000,
  });
}

export function useSaveSeoSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ category, data }: { category: SeoCategory; data: any }) => {
      const { error } = await supabase.from('seo_settings').upsert(
        { category, data, updated_at: new Date().toISOString() },
        { onConflict: 'category' },
      );
      if (error) throw error;
      // Snapshot history
      await supabase.from('seo_history').insert({ snapshot: { category, data }, note: `save:${category}` });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seo_settings_all'] }); toast.success('Configuração salva'); },
    onError: (e: any) => toast.error(e.message ?? 'Falha ao salvar'),
  });
}

export function useSeoPages() {
  return useQuery({
    queryKey: ['seo_pages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('seo_pages').select('*').order('path');
      if (error) throw error;
      return (data ?? []) as SeoPage[];
    },
    staleTime: 60_000,
  });
}

export function useSaveSeoPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (page: SeoPage) => {
      const { error } = await supabase.from('seo_pages').upsert(page, { onConflict: 'path' });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seo_pages'] }); toast.success('Página salva'); },
    onError: (e: any) => toast.error(e.message ?? 'Falha ao salvar página'),
  });
}

export function useDeleteSeoPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('seo_pages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seo_pages'] }); toast.success('Página removida'); },
  });
}

export function useSeoPageForPath(path: string) {
  return useQuery({
    queryKey: ['seo_page', path],
    queryFn: async () => {
      const { data } = await supabase.from('seo_pages').select('*').eq('path', path).maybeSingle();
      return (data ?? null) as SeoPage | null;
    },
    staleTime: 5 * 60_000,
  });
}
