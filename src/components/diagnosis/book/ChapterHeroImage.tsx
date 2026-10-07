import { useSectionInternetImage } from '@/hooks/useSectionInternetImage';
import { useSectionImagesContext } from '@/contexts/SectionImagesContext';
import type { SectionId } from '@/lib/imageService';

export function ChapterHeroImage({
  section,
  variant = 'primary',
  aspect = 'aspect-[4/5]',
}: {
  section: SectionId;
  variant?: 'primary' | 'secondary';
  aspect?: string;
}) {
  const { diagnostic } = useSectionImagesContext();
  const { url, loading } = useSectionInternetImage(section, variant, diagnostic ?? null);

  if (!url && !loading) return null;

  return (
    <figure className={`my-8 overflow-hidden rounded-md border border-border bg-muted ${aspect}`}>
      {url ? (
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full animate-pulse bg-muted" />
      )}
    </figure>
  );
}