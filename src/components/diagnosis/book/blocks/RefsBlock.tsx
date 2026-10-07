import { ChapterHeroImage } from '../ChapterHeroImage';
import type { SectionId } from '@/lib/imageService';

// Referências Visuais: uses the gender-filtered section-image pipeline
// (search-style-image) instead of `generated_images`, which historically
// contained unfiltered / off-gender assets.
const REF_SLOTS: Array<{ section: SectionId; variant: 'primary' | 'secondary' }> = [
  { section: 'estilo', variant: 'primary' },
  { section: 'estilo', variant: 'secondary' },
  { section: 'capsula', variant: 'primary' },
];

export function RefsBlock(_: { images?: Record<string, unknown> | null }) {
  return (
    <div className="my-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
      {REF_SLOTS.map((slot, i) => (
        <ChapterHeroImage
          key={`${slot.section}-${slot.variant}-${i}`}
          section={slot.section}
          variant={slot.variant}
          aspect="aspect-[3/4]"
        />
      ))}
    </div>
  );
}