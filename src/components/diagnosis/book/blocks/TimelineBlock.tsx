import { obj, toStringList, s } from '../fallbacks';
import type { DiagnosisRecord } from '../types';

export function TimelineBlock({ d }: { d: DiagnosisRecord }) {
  const fd = obj(d.final_diagnosis);
  const passos = toStringList(fd.proximos_passos, 9);
  
  // Garantir que o plano 30/60/90 esteja sempre completo com ações concretas
  const phases = [
    { 
      label: '0–30 dias: Impacto Imediato', 
      items: passos.slice(0, 3) 
    },
    { 
      label: '31–60 dias: Construção do Repertório', 
      items: passos.slice(3, 6) 
    },
    { 
      label: '61–90 dias: Refinamento e Consolidação', 
      items: passos.slice(6, 9) 
    },
  ];

  return (
    <div className="my-8 space-y-8">
      {phases.map((phase, i) => (
        <div key={i} className="relative pl-12">
          <div className="absolute left-0 top-0 w-8 h-8 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center text-xs font-sans font-bold text-primary shadow-sm">
            {i + 1}
          </div>
          <div className="mb-3">
            <h4 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-muted-foreground">{phase.label}</h4>
          </div>
          <ul className="space-y-3">
            {phase.items.map((it, j) => (
              <li key={j} className="text-sm font-sans text-foreground leading-relaxed border-l-2 border-primary/20 pl-5">{s(it)}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}