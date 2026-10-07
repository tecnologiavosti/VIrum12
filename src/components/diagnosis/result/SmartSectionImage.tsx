import { useState } from 'react';
import { useSectionImagesContext } from '@/contexts/SectionImagesContext';
import { type SectionId } from '@/lib/imageService';
import { useSectionInternetImage } from '@/hooks/useSectionInternetImage';

interface SmartSectionImageProps {
  section: SectionId;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  variant?: 'primary' | 'secondary';
}

/**
 * Renders the editorial image for a diagnosis section.
 * Priority:
 *   1. Server-generated image from the controlled Edge Function pipeline.
 *   2. DiagnosticImage fallback using the same centralized prompt only.
 * Legacy generated_images URLs are not used for completed diagnostics because
 * they may have been created by older prompt/fallback paths.
 */
export function SmartSectionImage({
  section, alt, className, width, height, variant = 'primary',
}: SmartSectionImageProps) {
  void width;
  void height;
  const { imagesMap, diagnostic } = useSectionImagesContext();
  const { url: internetUrl, loading: internetLoading } = useSectionInternetImage(section, variant, diagnostic ?? null);
  const [imgFailed, setImgFailed] = useState(false);
  const hasPositionClass = /\b(absolute|fixed|relative|sticky)\b/.test(className ?? '');
  const frameClassName = `${hasPositionClass ? '' : 'relative'} block overflow-hidden max-w-full max-h-full isolate [contain:layout_paint] ${className ?? ''}`;

  // 1. Internet image wins
  if (internetUrl && !imgFailed) {
    console.log(`[VIRUM IMG AUDIT] STEP 7 - Imagem exibida (${section}/${variant})`, internetUrl);
    return (
      <div className={frameClassName}>
        <img
          src={internetUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
          className="block w-full h-full max-w-full max-h-full object-contain object-top transition-opacity duration-300"
        />
      </div>
    );
  }

  // 2. Still generating server-side → skeleton
  if (internetLoading && diagnostic) {
    return (
      <div className={frameClassName}>
        <div className="absolute inset-0 bg-gradient-to-br from-card via-muted/20 to-card animate-pulse" aria-hidden />
        <p className="absolute inset-0 flex items-center justify-center text-[10px] font-sans uppercase tracking-widest text-muted-foreground/70 px-3 text-center">
          Gerando recomendação visual…
        </p>
      </div>
    );
  }

  // 3. Fallback path (no diagnostic, or internet returned nothing)
  if (!diagnostic) {
    const stored = imagesMap?.[section];
    if (stored) {
      return (
        <div className={frameClassName}>
          <img src={stored} alt={alt} className="block w-full h-full max-w-full max-h-full object-contain object-top" loading="lazy" />
        </div>
      );
    }
    return <div className={`${frameClassName} bg-muted/20 animate-pulse`} aria-hidden />;
  }

  console.warn(`[VIRUM IMG AUDIT] STEP 7 - Sem imagem segura para exibir; fallback Pollinations direto desativado (${section}/${variant})`, {
    hasLegacy: Boolean(imagesMap?.[`${section}_${variant}`] || imagesMap?.[`${section}:${variant}`] || imagesMap?.[section]),
  });
  return (
    <div className={`${frameClassName} bg-muted/20`} aria-label={alt}>
      <div className="absolute inset-0 bg-gradient-to-br from-card via-muted/20 to-card" aria-hidden />
    </div>
  );
}
