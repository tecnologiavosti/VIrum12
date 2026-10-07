import { useEffect, useMemo, useState } from 'react';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { Chapter, DiagnosisRecord } from './types';
import { visibleChapters } from './chapters';
import { BookSidebar } from './BookSidebar';
import { CoverSection } from './CoverSection';
import { ChapterSection } from './ChapterSection';
import { ColorPaletteBlock } from './blocks/ColorPaletteBlock';
import { BodyTypeBlock } from './blocks/BodyTypeBlock';
import { WardrobeGridBlock } from './blocks/WardrobeGridBlock';
import { CapsuleLookBlock } from './blocks/CapsuleLookBlock';
import { TimelineBlock } from './blocks/TimelineBlock';
import { RefsBlock } from './blocks/RefsBlock';
import { ClosingQuoteBlock } from './blocks/ClosingQuoteBlock';
import { ChapterHeroImage } from './ChapterHeroImage';
import type { SectionId } from '@/lib/imageService';

// Chapter → editorial section image mapping (drives useSectionInternetImage).
// Different keys/variants ensure each chapter gets a distinct image.
// Imagens apenas em capítulos-chave de cada Parte, para dar respiro visual.
// Os demais capítulos ficam só com texto/blocos especializados.
const CHAPTER_IMAGE: Record<string, { section: SectionId; variant: 'primary' | 'secondary'; aspect?: string } | null> = {
  'capitulo-02': { section: 'resumo', variant: 'secondary', aspect: 'aspect-[16/10]' }, // Parte I
  'capitulo-05': { section: 'estilo', variant: 'primary' },                              // Parte II
  'capitulo-10': { section: 'corpo', variant: 'primary' },                               // Parte III
  'capitulo-17': { section: 'capsula', variant: 'secondary', aspect: 'aspect-[16/10]' }, // Parte IV
  'capitulo-23': { section: 'resumo', variant: 'primary' },                              // Parte V
};

function renderChapterBody(chapter: Chapter, d: DiagnosisRecord) {
  const content = chapter.resolve(d);

  if (content.block === 'palette') return <ColorPaletteBlock color={d.color_analysis} />;
  if (content.block === 'body') return <BodyTypeBlock body={d.body_analysis} modeling={d.modeling_analysis} />;
  if (content.block === 'wardrobe') return <WardrobeGridBlock essentials={d.wardrobe_essentials} />;
  if (content.block === 'capsule') return <CapsuleLookBlock capsule={d.capsule_wardrobe} essentials={d.wardrobe_essentials} />;
  if (content.block === 'timeline') return <TimelineBlock d={d} />;
  if (content.block === 'refs') return <RefsBlock images={d.generated_images ?? null} />;
  if (content.block === 'quote') return <ClosingQuoteBlock d={d} />;

  if (content.empty) {
    return <p className="text-sm font-sans italic text-muted-foreground">Conteúdo em consolidação.</p>;
  }

  return (
    <>
      {content.paragraphs?.map((p, i) => (
        <p key={i} className="text-base font-sans text-foreground leading-relaxed text-justify hyphens-auto">{p}</p>
      ))}
      {content.bullets && (
        <ul className="space-y-2 mt-2">
          {content.bullets.map((b, i) => (
            <li key={i} className="text-base font-sans text-foreground leading-relaxed border-l-2 border-border pl-4">{b}</li>
          ))}
        </ul>
      )}
    </>
  );
}

export function BookLayout({ diagnosis }: { diagnosis: DiagnosisRecord }) {
  const chapters = useMemo(() => visibleChapters(diagnosis), [diagnosis]);
  const [activeId, setActiveId] = useState<string>('capa');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const ids = ['capa', ...chapters.map((c) => c.id)];
    const targets = ids
      .map((id) => document.querySelector<HTMLElement>(`[data-chapter-id="${id}"]`))
      .filter((el): el is HTMLElement => el !== null);
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const id = visible[0].target.getAttribute('data-chapter-id');
          if (id) {
            setActiveId(id);
            if (typeof window !== 'undefined' && window.history?.replaceState) {
              window.history.replaceState(null, '', `#${id}`);
            }
          }
        }
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [chapters]);

  const navigate = (id: string) => {
    const el = document.querySelector<HTMLElement>(`[data-chapter-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
      setMobileOpen(false);
    }
  };

  return (
    <div className="relative">
      <div className="lg:hidden sticky top-[64px] z-20 -mx-4 sm:-mx-6 mb-4 border-b border-border bg-background/95 backdrop-blur">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-sans text-foreground"
            >
              <Menu className="w-4 h-4" />
              <span>Sumário</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] overflow-y-auto">
            <SheetTitle className="sr-only">Sumário</SheetTitle>
            <div className="pt-8">
              <BookSidebar chapters={chapters} activeId={activeId} onNavigate={navigate} d={diagnosis} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-4">
            <BookSidebar chapters={chapters} activeId={activeId} onNavigate={navigate} d={diagnosis} />
          </div>
        </aside>

        <article className="max-w-2xl" data-pdf-source="virum-book">
          <CoverSection d={diagnosis} />
          {chapters.map((c) => {
            const img = CHAPTER_IMAGE[c.id];
            return (
              <ChapterSection key={c.id} chapter={c}>
                {img && <ChapterHeroImage section={img.section} variant={img.variant} aspect={img.aspect} />}
                {renderChapterBody(c, diagnosis)}
              </ChapterSection>
            );
          })}
        </article>
      </div>
    </div>
  );
}