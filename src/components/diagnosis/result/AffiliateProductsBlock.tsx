import { useAffiliateProducts } from '@/hooks/useAffiliateProducts';
import { ExternalLink } from 'lucide-react';

interface Props {
  diagnosisId?: string;
  description?: string;
  category?: string;
}

function formatBRL(value: number | null, currency: string | null) {
  if (value == null) return '';
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
    }).format(value);
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
}

const platformBadge: Record<'shopee' | 'shein', { label: string; className: string }> = {
  shopee: { label: 'Shopee', className: 'bg-[#EE4D2D]/15 text-[#EE4D2D] border-[#EE4D2D]/30' },
  shein: { label: 'Shein', className: 'bg-foreground/10 text-foreground border-foreground/20' },
};

/**
 * Shows real, purchasable pieces with affiliate links.
 * Renders nothing when the feature is disabled or no match was found —
 * silently invisible when secrets are absent.
 */
export function AffiliateProductsBlock({ diagnosisId, description, category }: Props) {
  const { products } = useAffiliateProducts(diagnosisId, description, category);
  if (!products || products.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
        Onde encontrar peças parecidas
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {products.map((p) => {
          const badge = platformBadge[p.platform];
          return (
            <a
              key={(p.id ?? p.affiliate_url) + p.rank}
              href={p.affiliate_url}
              target="_blank"
              rel="noopener noreferrer sponsored nofollow"
              className="flex gap-2 items-center rounded-lg border border-border/30 bg-card/40 hover:bg-card/70 transition-colors p-1.5 group"
            >
              {p.product_image_url ? (
                <img
                  src={p.product_image_url}
                  alt={p.product_title ?? ''}
                  loading="lazy"
                  className="w-10 h-10 rounded-md object-cover shrink-0 border border-border/20"
                />
              ) : (
                <div className="w-10 h-10 rounded-md bg-muted/40 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] leading-snug line-clamp-2 text-foreground">
                  {p.product_title || 'Produto'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${badge.className}`}>
                    {badge.label}
                  </span>
                  {p.product_price != null && (
                    <span className="text-[11px] font-medium text-foreground">
                      {formatBRL(p.product_price, p.product_currency)}
                    </span>
                  )}
                </div>
              </div>
              <ExternalLink className="w-3 h-3 text-muted-foreground/60 group-hover:text-foreground shrink-0" />
            </a>
          );
        })}
      </div>
      <p className="text-[9px] text-muted-foreground/60">Contém link de afiliado</p>
    </div>
  );
}