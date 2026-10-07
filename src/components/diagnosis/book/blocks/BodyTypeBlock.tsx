import { obj, toStringList, s } from '../fallbacks';

function Column({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="text-xs font-sans uppercase tracking-wider text-muted-foreground mb-3">{title}</h4>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="text-sm font-sans text-foreground leading-relaxed border-l-2 border-border pl-3">{it}</li>
        ))}
      </ul>
    </div>
  );
}

export function BodyTypeBlock({ body, modeling }: { body: Record<string, unknown> | null; modeling: Record<string, unknown> | null }) {
  const b = obj(body);
  const m = obj(modeling);
  const tipo = s(b.tipo_corporal) || 'Estruturado';
  const desc = s(b.descricao_tipo) || s(b.silhueta_ideal);
  return (
    <div className="my-6 rounded-lg border border-border bg-card p-6 space-y-6">
      <div>
        <p className="text-xs font-sans uppercase tracking-wider text-muted-foreground">Biotipo</p>
        <h3 className="font-serif text-2xl text-foreground mt-1">{tipo}</h3>
        {desc && <p className="text-sm font-sans text-muted-foreground mt-2 leading-relaxed">{desc}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Column title="Valorizar" items={toStringList(b.pontos_fortes, 6)} />
        <Column title="Equilibrar" items={toStringList(b.pontos_de_atencao, 6)} />
        <Column title="Tecidos recomendados" items={toStringList(m.tecidos_recomendados, 6)} />
        <Column title="Tecidos a evitar" items={toStringList(m.tecidos_evitar, 6)} />
      </div>
    </div>
  );
}