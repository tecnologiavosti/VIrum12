import { toStringList, obj } from '../fallbacks';

function nameToHex(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  const hue = h % 360;
  return `hsl(${hue}, 22%, 42%)`;
}

function Swatch({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="w-full aspect-square rounded-md border border-border" style={{ background: nameToHex(label) }} aria-hidden />
      <span className="text-xs font-sans text-muted-foreground leading-tight">{label}</span>
    </div>
  );
}

function Group({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="text-xs font-sans uppercase tracking-wider text-muted-foreground mb-3">{title}</h4>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {items.map((it) => <Swatch key={it} label={it} />)}
      </div>
    </div>
  );
}

export function ColorPaletteBlock({ color }: { color: Record<string, unknown> | null }) {
  const c = obj(color);
  const paleta = obj(c.paleta_cores_ideais);
  const neutros = toStringList(paleta.neutros || paleta.cores_base, 8);
  const principais = toStringList(paleta.cores_base || paleta.cores_destaque, 8);
  const acentos = toStringList(paleta.cores_destaque || paleta.cores_acessorios, 8);
  const evitar = toStringList(c.cores_evitar, 6);
  return (
    <div className="space-y-8 my-6">
      <Group title="Neutros" items={neutros} />
      <Group title="Cores principais" items={principais} />
      <Group title="Acentos" items={acentos} />
      <Group title="Cores a evitar" items={evitar} />
    </div>
  );
}