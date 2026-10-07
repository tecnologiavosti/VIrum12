import type { DiagnosisRecord } from './types';
import { getClientName, getReportId, obj, firstText, getQuestionnaire } from './fallbacks';

export function CoverSection({ d }: { d: DiagnosisRecord }) {
  const name = getClientName(d);
  const reportId = getReportId(d);
  const date = d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
  const perfil = firstText(obj(d.final_diagnosis).perfil_cliente);
  const opening = (perfil && !perfil.match(/^(profiss[aã]o|estilo de vida|biotipo|clima|objetivo):/i)) 
    ? perfil 
    : 'Sua imagem, decifrada com método e intenção por meio de uma estratégia que une técnica e identidade.';
  
  const q = getQuestionnaire(d);
  
  // Fotos reais enviadas pelo cliente
  const photos = [
    ['Frente', d.photo_front_url],
    ['Lateral', d.photo_side_url],
    ['Costas', d.photo_back_url],
    ['Rosto', d.photo_face_url],
  ].filter(([, url]) => !!url) as [string, string][];

  // Visual composition for premium presentation
  return (
    <section id="capa" data-chapter-id="capa" className="scroll-mt-24 pt-8 pb-16 border-b border-border">
      <div className="flex flex-col items-start">
        <p className="font-serif text-xs tracking-[0.4em] text-muted-foreground uppercase">VIRUM · RELATÓRIO #{reportId}</p>
        
        <h1 className="mt-8 font-serif text-4xl md:text-6xl text-foreground leading-tight tracking-tight uppercase">
          {name ? `Perfil de ${name}` : 'Seu perfil de imagem'}
        </h1>
        {date && <p className="mt-4 text-sm font-sans tracking-widest text-muted-foreground uppercase">{date}</p>}

        {/* Fotos reais enviadas pelo cliente — frente, lateral, costas e rosto */}
        {photos.length > 0 && (
          <div className="mt-12 w-full grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {photos.map(([label, url]) => (
              <figure
                key={label}
                className="vr-photo relative overflow-hidden rounded-sm border border-border/60 bg-muted/20"
              >
                <img
                  src={url}
                  alt={`Foto do cliente — ${label}`}
                  crossOrigin="anonymous"
                  loading="lazy"
                  className="w-full aspect-[3/4] object-cover"
                />
                <figcaption className="absolute bottom-0 left-0 right-0 bg-background/80 px-2 py-1 text-[10px] font-sans tracking-[0.25em] text-muted-foreground uppercase">
                  {label}
                </figcaption>
              </figure>
            ))}
          </div>
        )}


        <div className="mt-16 max-w-xl">
          <p className="font-serif text-lg md:text-xl text-foreground leading-relaxed text-justify hyphens-auto">
            {opening}
          </p>
        </div>
      </div>
    </section>
  );
}