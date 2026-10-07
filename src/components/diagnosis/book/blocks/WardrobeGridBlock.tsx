import { obj, arr, s } from '../fallbacks';

type Piece = { 
  name?: string; 
  peca?: string; 
  color?: string; 
  cor?: string; 
  occasions?: string[]; 
  ocasiao?: string; 
  priority?: string; 
  prioridade?: string; 
  why?: string; 
  porque?: string; 
  category?: string;
  fit?: string;
  material?: string;
  combinations?: string[];
};

export function WardrobeGridBlock({ essentials }: { essentials: Record<string, unknown> | null }) {
  const list = arr(obj(essentials).pecas_essenciais)
    .map((p) => obj(p) as Piece)
    .filter((p) => p.name || p.peca);
  if (!list.length) return null;
  return (
    <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {list.map((p, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h4 className="font-serif text-lg text-foreground leading-snug">{p.name || p.peca}</h4>
            {(p.priority || p.prioridade) && (
              <span className="text-[10px] font-sans uppercase tracking-wider text-muted-foreground border border-border rounded px-2 py-0.5 shrink-0">
                {p.priority || p.prioridade}
              </span>
            )}
          </div>
          <div className="text-xs font-sans text-muted-foreground grid grid-cols-2 gap-2 border-y border-border/50 py-2">
            <div>
              <span className="block text-[9px] uppercase tracking-tighter opacity-70">Cor</span>
              <span className="font-medium text-foreground">{p.color || p.cor || ''}</span>
            </div>
            {p.fit && (
              <div>
                <span className="block text-[9px] uppercase tracking-tighter opacity-70">Corte</span>
                <span className="font-medium text-foreground">{p.fit}</span>
              </div>
            )}
            {p.material && (
              <div>
                <span className="block text-[9px] uppercase tracking-tighter opacity-70">Material</span>
                <span className="font-medium text-foreground">{p.material}</span>
              </div>
            )}
            {p.category && (
              <div>
                <span className="block text-[9px] uppercase tracking-tighter opacity-70">Categoria</span>
                <span className="font-medium text-foreground">{p.category}</span>
              </div>
            )}
          </div>
          {(p.why || p.porque) && (
            <p className="text-xs font-sans text-muted-foreground leading-relaxed italic">{p.why || p.porque}</p>
          )}
          {(arr(p.combinations).length > 0) && (
            <div className="pt-1">
              <span className="block text-[9px] uppercase tracking-tighter opacity-70 mb-1">Combina com:</span>
              <div className="flex flex-wrap gap-1">
                {arr(p.combinations).map((c, idx) => (
                  <span key={idx} className="bg-muted px-2 py-0.5 rounded text-[10px] text-foreground">{s(c)}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
