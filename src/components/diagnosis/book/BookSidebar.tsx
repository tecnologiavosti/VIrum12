import type { Chapter, DiagnosisRecord } from './types';
import { PART_LABELS } from './types';
import { getReportId } from './fallbacks';
import { cn } from '@/lib/utils';

interface Props {
  chapters: Chapter[];
  activeId: string;
  onNavigate: (id: string) => void;
  d: DiagnosisRecord;
}

export function BookSidebar({ chapters, activeId, onNavigate, d }: Props) {
  const grouped = ([1, 2, 3, 4, 5] as const).map((part) => ({
    part,
    label: PART_LABELS[part],
    items: chapters.filter((c) => c.part === part),
  }));
  return (
    <nav aria-label="Sumário" className="text-sm">
      <div className="mb-8">
        <p className="font-serif text-xs tracking-[0.4em] text-muted-foreground">VIRUM</p>
        <p className="mt-2 text-xs font-sans text-muted-foreground">Relatório #{getReportId(d)}</p>
      </div>
      <button
        type="button"
        onClick={() => onNavigate('capa')}
        className={cn(
          'block w-full text-left mb-6 text-xs font-sans uppercase tracking-wider transition-colors',
          activeId === 'capa' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Capa
      </button>
      <div className="space-y-6">
        {grouped.map(({ part, label, items }) => {
          if (!items.length) return null;
          return (
            <div key={part}>
              <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-muted-foreground mb-2">{label}</p>
              <ul className="space-y-1">
                {items.map((c) => {
                  const active = activeId === c.id;
                  return (
                    <li key={c.id} className="relative">
                      {active && <span aria-hidden className="absolute -left-3 top-1.5 bottom-1.5 w-0.5 bg-foreground" />}
                      <button
                        type="button"
                        onClick={() => onNavigate(c.id)}
                        className={cn(
                          'block w-full text-left py-1 leading-snug transition-colors',
                          active ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <span className="font-serif mr-2">{c.numeral}.</span>
                        <span className="font-sans">{c.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}