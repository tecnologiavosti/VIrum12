import { SmartSectionImage } from '@/components/diagnosis/result/SmartSectionImage';
import { useAutoImage } from '@/hooks/useAutoImage';
import type { ImagesMap } from '@/hooks/useDiagnosisImages';
import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { AffiliateProductsBlock } from '@/components/diagnosis/result/AffiliateProductsBlock';

interface EssentialItem {
  peca?: string;
  cor?: string;
  ocasiao?: string;
  prioridade?: string;
  descricao?: string;
  [key: string]: unknown;
}

interface EssentialsData {
  tops_essenciais?: EssentialItem[];
  bottoms_essenciais?: EssentialItem[];
  vestidos_essenciais?: EssentialItem[];
  tercas_pecas?: EssentialItem[];
  calcados_essenciais?: EssentialItem[];
  acessorios_essenciais?: EssentialItem[];
  total_pecas?: string | number;
  investimento_sugerido?: string;
  [key: string]: unknown;
}

const categoryConfig: Record<string, { label: string }> = {
  tops_essenciais: { label: 'Camisaria & Malhas' },
  bottoms_essenciais: { label: 'Calças & Bermudas' },
  vestidos_essenciais: { label: 'Conjuntos & Ternos' },
  tercas_pecas: { label: 'Sobreposições' },
  calcados_essenciais: { label: 'Calçados' },
  acessorios_essenciais: { label: 'Acessórios' },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } }),
};

function EssentialItemCard({ item, imagesMap, imagesLoading, diagnosisId, categoryKey }: { item: EssentialItem; imagesMap?: ImagesMap; imagesLoading?: boolean; diagnosisId?: string; categoryKey?: string }) {
  const name = item.peca || item.descricao || '';
  const { imageUrl, isLoading, hasFailed } = useAutoImage(name, imagesMap, diagnosisId, categoryKey, item.cor);
  const justification = item.porque || item.motivo;

  const details: string[] = [];
  if (item.cor) details.push(String(item.cor));
  if (item.fit) details.push(String(item.fit));
  if (item.material) details.push(String(item.material));
  if (item.prioridade) details.push(`prioridade ${String(item.prioridade).toLowerCase()}`);

  return (
    <div className="flex gap-2.5 items-start">
      <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-border/30 bg-muted/20 flex items-center justify-center">
        {imagesLoading || isLoading ? (
          <div className="w-full h-full bg-muted animate-pulse rounded-lg" />
        ) : imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-muted/40 rounded-lg" aria-label={hasFailed ? 'Imagem indisponível' : 'Aguardando imagem'} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-sans text-foreground leading-snug">{name}</p>
        {details.length > 0 && (
          <p className="text-[11px] font-sans text-muted-foreground">{details.join(' · ')}</p>
        )}
        {justification && (
          <p className="text-[10px] font-serif italic text-primary/70 mt-1 leading-tight">
            {String(justification)}
          </p>
        )}
        <AffiliateProductsBlock
          diagnosisId={diagnosisId}
          description={name}
          category={categoryKey}
        />
      </div>
    </div>
  );
}

export function EssentialsSection({ data, diagnosisId, imagesMap, imagesLoading }: { data: Record<string, unknown>; diagnosisId?: string; imagesMap?: ImagesMap; imagesLoading?: boolean }) {
  const d = data as EssentialsData;

  const categories = Object.entries(categoryConfig)
    .map(([key, config]) => {
      const items = d[key] as EssentialItem[] | undefined;
      if (!items || !Array.isArray(items) || items.length === 0) return null;
      return { key, ...config, items };
    })
    .filter(Boolean) as { key: string; label: string; items: EssentialItem[] }[];

  if (categories.length === 0) {
    const arrayEntries = Object.entries(d).filter(([k, v]) => Array.isArray(v) && (v as unknown[]).length > 0 && k !== 'total_pecas');
    if (arrayEntries.length > 0) {
      arrayEntries.forEach(([key, items]) => {
        categories.push({
          key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          items: (items as unknown[]).map(item =>
            typeof item === 'object' && item !== null ? item as EssentialItem : { peca: String(item) }
          ),
        });
      });
    }
  }

  const totalPieces = d.total_pecas || categories.reduce((sum, c) => sum + c.items.length, 0);
  const firstHalf = categories.slice(0, Math.ceil(categories.length / 2));
  const secondHalf = categories.slice(Math.ceil(categories.length / 2));

  return (
    <div className="space-y-10">
      {/* ── Header ── */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h2 className="font-serif font-bold text-foreground text-2xl md:text-3xl">Peças Essenciais</h2>
        <p className="text-xs font-sans text-muted-foreground mt-1.5">
          {totalPieces} peças recomendadas
          {d.investimento_sugerido && <> · {d.investimento_sugerido}</>}
        </p>
      </motion.div>

      {/* ── First block: Image + Categories ── */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}
          className="relative z-0 w-full min-w-0 self-start rounded-2xl overflow-hidden border border-border/20 aspect-[3/4] bg-muted/20 isolate [contain:layout_paint]"
        >
          <SmartSectionImage section="essenciais" alt="Peças essenciais" className="absolute inset-0 w-full h-full object-contain object-top" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/15 via-transparent to-transparent" />
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="relative z-10 flex min-w-0 flex-col justify-center space-y-6">
          {firstHalf.map(({ key, label, items }) => (
            <div key={key}>
              <h3 className="text-sm font-serif font-bold text-foreground mb-2">{label}</h3>
              <div className="space-y-2.5">
                {items.map((item, i) => (
                  <EssentialItemCard key={i} item={item} imagesMap={imagesMap} imagesLoading={imagesLoading} diagnosisId={diagnosisId} categoryKey={key} />
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Second block ── */}
      {secondHalf.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="relative z-10 flex min-w-0 flex-col justify-center space-y-6">
            {secondHalf.map(({ key, label, items }) => (
              <div key={key}>
                <h3 className="text-sm font-serif font-bold text-foreground mb-2">{label}</h3>
                <div className="space-y-2.5">
                  {items.map((item, i) => (
                    <EssentialItemCard key={i} item={item} imagesMap={imagesMap} imagesLoading={imagesLoading} diagnosisId={diagnosisId} categoryKey={key} />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}
            className="relative z-0 w-full min-w-0 self-start rounded-2xl overflow-hidden border border-border/20 aspect-[4/3] isolate [contain:layout_paint]"
          >
            <SmartSectionImage section="essenciais" variant="secondary" alt="Detalhe das peças" className="absolute inset-0 w-full h-full object-contain object-top" />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/15 via-transparent to-transparent" />
          </motion.div>
        </div>
      )}

      {/* ── Investment ── */}
      {d.investimento_sugerido && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}
          className="rounded-xl px-5 py-3 border border-primary/10 bg-card/40 inline-flex items-center gap-3">
          <ShoppingBag className="w-4 h-4 text-primary/50" />
          <span className="text-sm font-sans text-muted-foreground">Investimento: <span className="text-foreground font-semibold">{d.investimento_sugerido}</span></span>
        </motion.div>
      )}
    </div>
  );
}
