import { obj, firstText, getClientName } from '../fallbacks';
import type { DiagnosisRecord } from '../types';

export function ClosingQuoteBlock({ d }: { d: DiagnosisRecord }) {
  const fd = obj(d.final_diagnosis);
  const primary = firstText(fd.mensagem_final);
  const name = getClientName(d);
  const st = obj(d.style_analysis);
  const style = firstText(st.estilo_predominante);
  const text = primary || (
    name || style
      ? `${name ? `${name}, ` : ''}sua imagem não é sobre roupa — é sobre a coerência entre quem você é e como o mundo te lê. Cada escolha ${style ? `dentro do universo ${style.toLowerCase()} ` : ''}é um voto de intenção. Vista com propósito.`
      : 'Sua imagem não é sobre roupa — é sobre a coerência entre quem você é e como o mundo te lê. Vista com propósito.'
  );
  return (
    <blockquote className="my-8 border-l-2 border-foreground pl-6 py-2">
      <p className="font-serif italic text-lg text-foreground leading-relaxed">{text}</p>
      <footer className="mt-4 text-xs font-sans uppercase tracking-widest text-muted-foreground">— VIRUM</footer>
    </blockquote>
  );
}