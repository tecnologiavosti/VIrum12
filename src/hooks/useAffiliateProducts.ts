import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { invokeAuthenticatedFunction } from '@/lib/authenticatedFunctions';


export interface AffiliateProduct {
  id: string;
  name: string;
  store: string;
  category: string;
  subcategory: string | null;
  affiliate_url: string;
  image_url: string | null;
  price: number;
  price_range: string | null;
  description: string | null;
  styles: string[];
  body_types: string[];
  colors: string[];
  sizes: string[];
  audience: string | null;
  status: 'active' | 'inactive';
  click_count: number;
  created_at: string;
  updated_at: string;
}

// Legacy structure for existing component compatibility
export interface LegacyAffiliateProduct {
  id?: string;
  platform: 'shopee' | 'shein';
  product_title: string | null;
  product_price: number | null;
  product_currency: string | null;
  product_image_url: string | null;
  product_url: string | null;
  affiliate_url: string;
  rank: number;
  normalized_key: string;
}


export type AffiliateProductInsert = Omit<AffiliateProduct, 'id' | 'click_count' | 'created_at' | 'updated_at'>;

export function useAdminAffiliateProducts() {
  const queryClient = useQueryClient();

  const products = useQuery({
    queryKey: ['admin_affiliate_products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AffiliateProduct[];
    },
  });

  const saveProduct = useMutation({
    mutationFn: async (product: Partial<AffiliateProduct>) => {
      const { data, error } = await supabase
        .from('affiliate_products')
        .upsert(product)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_affiliate_products'] });
      toast.success('Produto salvo com sucesso');
    },
    onError: (error) => {
      console.error('Error saving product:', error);
      toast.error('Erro ao salvar produto');
    }
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('affiliate_products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_affiliate_products'] });
      toast.success('Produto excluído com sucesso');
    },
    onError: (error) => {
      console.error('Error deleting product:', error);
      toast.error('Erro ao excluir produto');
    }
  });

  const stats = useQuery({
    queryKey: ['admin_affiliate_stats'],
    queryFn: async () => {
      const { data: productsData, error: productsError } = await supabase
        .from('affiliate_products')
        .select('status, click_count, store');
      
      if (productsError) throw productsError;

      const { data: clicksData, error: clicksError } = await supabase
        .from('affiliate_product_clicks')
        .select('clicked_at');
      
      if (clicksError) throw clicksError;

      const totalProducts = productsData.length;
      const activeProducts = productsData.filter(p => p.status === 'active').length;
      const totalClicks = productsData.reduce((acc, p) => acc + (p.click_count || 0), 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const clicksToday = clicksData.filter(c => new Date(c.clicked_at) >= today).length;

      const storeClicks: Record<string, number> = {};
      productsData.forEach(p => {
        storeClicks[p.store] = (storeClicks[p.store] || 0) + (p.click_count || 0);
      });
      
      const topStore = Object.entries(storeClicks).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

      return {
        totalProducts,
        activeProducts,
        totalClicks,
        clicksToday,
        topStore
      };
    }
  });

  return {
    products,
    saveProduct,
    deleteProduct,
    stats
  };
}

export function useTrackAffiliateClick() {
  return useMutation({
    mutationFn: async ({ productId, store, url, source }: { productId: string, store: string, url: string, source: string }) => {
      const { error } = await supabase
        .from('affiliate_product_clicks')
        .insert({
          product_id: productId,
          store,
          destination_url: url,
          source
        });
      
      if (error) throw error;
    }
  });
}

export function useAffiliateProducts(diagnosisId?: string, description?: string, category?: string) {
  const [products, setProducts] = useState<LegacyAffiliateProduct[]>([]);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    async function fetchMatches() {
      if (!diagnosisId && !description) return;
      
      setLoading(true);
      try {
        const { data, error } = await invokeAuthenticatedFunction<{ products: LegacyAffiliateProduct[] }>('library-generate-batch', {
          diagnosis_id: diagnosisId,
          description: description,
          category: category,
          limit: 4
        });

        if (error) throw error;
        setProducts(data?.products || []);
      } catch (err) {
        console.error('Error fetching affiliate matches:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, [diagnosisId, description, category]);

  return { products, loading };
}


