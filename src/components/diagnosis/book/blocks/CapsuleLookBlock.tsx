import { obj, arr, s } from '../fallbacks';

type Look = {
  look_name?: string;
  nome?: string;
  occasion?: string;
  contexto?: string;
  pieces?: string[];
  pecas?: string[];
  shoes?: string;
  accessories?: string[];
  why_it_works?: string;
};

export function CapsuleLookBlock({ capsule, essentials }: { capsule: Record<string, unknown> | null; essentials: Record<string, unknown> | null }) {
  const cap = obj(capsule);
  // Support both old "looks_trabalho/casual/eventos" and new "looks" array
  const allLooks = [
    ...arr(cap.looks).map(l => obj(l) as Look),
    ...['looks_trabalho', 'looks_casual', 'looks_eventos']
      .flatMap((key) => arr(cap[key]).map((l) => obj(l) as Look))
  ];

  if (!allLooks.length) return null;

  return (
    <div className="my-8 space-y-8">
      {allLooks.map((look, idx) => {
        const name = look.look_name || look.nome || `Look ${idx + 1}`;
        const pieces = arr(look.pieces || look.pecas).map(s).filter(Boolean);
        
        if (!pieces.length && idx > 0) return null; // Only show if has data

        return (
          <div key={idx} className="rounded-xl border border-border bg-card/50 p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl text-foreground tracking-tight">{name}</h3>
              <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
                {look.occasion || look.contexto || 'Geral'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-3">
                <h4 className="text-[10px] font-sans font-bold uppercase tracking-tighter text-muted-foreground/60 border-b border-border/50 pb-1">Composição</h4>
                <ul className="space-y-2">
                  {pieces.map((p, i) => (
                    <li key={i} className="text-sm font-sans text-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                      {p}
                    </li>
                  ))}
                  {look.shoes && (
                    <li className="text-sm font-sans text-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500/40 shrink-0" />
                      <span className="italic">{look.shoes}</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="space-y-4">
                {arr(look.accessories).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-sans font-bold uppercase tracking-tighter text-muted-foreground/60">Acessórios</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {arr(look.accessories).map((acc, i) => (
                        <span key={i} className="text-[11px] font-sans bg-muted/80 px-2 py-0.5 rounded border border-border/50">{s(acc)}</span>
                      ))}
                    </div>
                  </div>
                )}
                {look.why_it_works && (
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-sans font-bold uppercase tracking-tighter text-muted-foreground/60">Estratégia</h4>
                    <p className="text-xs font-sans text-muted-foreground leading-relaxed">{look.why_it_works}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
