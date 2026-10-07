import type { DiagnosisRecord } from './types';

type Rec = Record<string, unknown>;

export const s = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

function buildColorApplications(color: Rec): Rec[] {
  const palette = (color.paleta_cores_ideais && typeof color.paleta_cores_ideais === 'object')
    ? color.paleta_cores_ideais as Rec
    : {};
  const list = (value: unknown, max = 8): string[] => {
    if (typeof value === 'string') return [value.trim()].filter(Boolean);
    if (!Array.isArray(value)) return [];
    return value.map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const o = item as Rec;
        return s(o.nome || o.cor || o.name || o.descricao);
      }
      return '';
    }).filter(Boolean).slice(0, max);
  };
  const base = list(palette.base || palette.neutros || palette.cores_base, 8);
  const support = list(palette.suporte || palette.principais || palette.cores_base, 8);
  const highlights = list(palette.destaque || palette.acentos || palette.cores_destaque, 8);
  const pool = Array.from(new Set([...base, ...support, ...highlights])).slice(0, 8);
  const uses = ['camisas e polos', 'blazers e terceiras peças', 'calças e bermudas', 'malhas e sobreposições', 'acessórios e detalhes', 'looks de destaque'];
  const pieces = [['camisa ou polo', 'calça'], ['blazer', 'camisa'], ['calça chino', 'bermuda'], ['suéter', 'jaqueta'], ['cinto', 'relógio'], ['peça principal', 'acessório']];
  const out: Rec[] = [];
  pool.forEach((cor, i) => out.push({
    cor,
    uso: uses[i] || 'peças do guarda-roupa',
    pecas: pieces[i] || ['peça principal', 'peça complementar'],
    motivo: 'Aplicação da cor para manter harmonia cromática, profundidade e coerência com a assinatura visual.',
  }));
  while (out.length < 6) {
    const cor = pool[out.length % Math.max(pool.length, 1)] || 'Azul-marinho';
    out.push({
      cor,
      uso: 'combinações recorrentes',
      pecas: ['peça principal', 'peça complementar'],
      motivo: 'Mantém continuidade cromática entre diferentes ocasiões.',
    });
  }
  return out;
}

/** Normaliza respostas de diferentes versões do gerador para o contrato dos capítulos. */
export const obj = (v: unknown): Rec => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const source = v as Rec;
  const normalized: Rec = { ...source };

  // Looks/ocasiões: aceita versões antigas e novas.
  if (!normalized.look_name) normalized.look_name = source.name || source.nome || '';
  if (!normalized.occasion) normalized.occasion = source.occasion || source.ocasiao || source.occasions || '';
  if (!normalized.pieces) normalized.pieces = source.pieces || source.pecas || source.itens || [];
  if (!normalized.shoes) normalized.shoes = source.shoes || source.calcados || source.calçado || source.sapatos || '';

  // Estratégia: garante que o renderer encontre rótulo e direção.
  if (!normalized.eixo) normalized.eixo = source.eixo || source.axis || source.nome || '';
  if (!normalized.direcao) normalized.direcao = source.direcao || source.direction || source.recomendacao || source.diagnostico || source.objetivo || '';
  if (!normalized.prioridade) normalized.prioridade = source.prioridade || source.priority || 'média';

  // Cor aplicada: aliases comuns.
  if (!normalized.cor) normalized.cor = source.cor || source.name || source.nome || '';
  if (!normalized.uso) normalized.uso = source.uso || source.application || source.aplicacao || source.pecas || '';
  if (!normalized.motivo) normalized.motivo = source.motivo || source.why || source.reason || '';

  // Se o diagnóstico trouxe paleta mas não trouxe aplicação, cria uma aplicação
  // renderizável para que a aba IX nunca fique vazia.
  const hasPalette = source.paleta_cores_ideais && typeof source.paleta_cores_ideais === 'object';
  const hasApplication = Array.isArray(source.aplicacao) && source.aplicacao.length > 0;
  if (hasPalette && !hasApplication && !normalized.__colorApplicationNormalized) {
    normalized.aplicacao = buildColorApplications(source);
    normalized.__colorApplicationNormalized = true;
  }

  return normalized;
};

export const arr = (v: unknown): unknown[] => {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') {
    const o = v as Rec;
    if (Array.isArray(o.items)) return o.items;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o.looks)) return o.looks;
  }
  return [];
};

export const nonEmpty = (v: unknown): boolean => {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v as Rec).length > 0;
  return true;
};

export function firstText(...values: unknown[]): string {
  for (const v of values) {
    const t = s(v);
    if (t) return t;
  }
  return '';
}

/**
 * Converte listas vindas da IA em texto legível.
 * Em especial, acessórios chegam como objetos estruturados; não devemos
 * deixar JSON bruto escapar para a interface do diagnóstico.
 */
function formatListObject(item: Rec): string {
  const description = firstText(item.descricao, item.description, item.nome, item.titulo, item.peca, item.look_name);
  const type = firstText(item.tipo, item.type, item.acessorio, item.accessory);
  const color = firstText(item.cor, item.color);
  const material = firstText(item.material, item.tecido, item.fabric);
  const reason = firstText(item.motivo, item.porque, item.reason, item.why);

  if (type) {
    const details = [color, material].filter(Boolean).join(' · ');
    return `${type}${details ? ` — ${details}` : ''}${reason ? `. ${reason}` : ''}`.trim();
  }

  if (description) return description;

  return '';
}

export function toStringList(v: unknown, max = 8): string[] {
  if (!v) return [];
  if (typeof v === 'string') return [v.trim()].filter(Boolean);
  if (Array.isArray(v)) {
    return v
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const o = obj(item);
          return formatListObject(o) || String(o.descricao || o.nome || o.direcao || o.peca || o.look_name || o.titulo || '');
        }
        return String(item);
      })
      .filter(Boolean)
      .slice(0, max);
  }
  if (typeof v === 'object') {
    return Object.values(v as Rec).flatMap((x) => toStringList(x, max)).slice(0, max);
  }
  return [];
}

const STYLE_TO_ARCHETYPE: Record<string, string[]> = {
  classico: ['Estrategista', 'Provedor moderno'],
  contemporaneo: ['Curador', 'Estrategista'],
  minimalista: ['Curador', 'Construtor'],
  workwear: ['Construtor', 'Explorador'],
  esportivo: ['Explorador', 'Provedor moderno'],
  boemio: ['Explorador', 'Curador'],
  urbano: ['Construtor', 'Curador'],
  formal: ['Estrategista', 'Provedor moderno'],
  casual: ['Explorador', 'Provedor moderno'],
};

export function deriveArchetypes(style: string, goal: string): { nome: string; descricao: string }[] {
  const key = style.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/)[0] || 'classico';
  const pair = STYLE_TO_ARCHETYPE[key] || ['Estrategista', 'Curador'];
  return pair.map((nome) => ({
    nome,
    descricao: goal
      ? `Perfil ${nome.toLowerCase()} ajustado ao objetivo de ${goal.toLowerCase()}.`
      : `Perfil ${nome.toLowerCase()} — base de leitura da imagem pessoal.`,
  }));
}

export function deriveSignature(style: string, secondary: string[]): string {
  const secTxt = secondary.length ? ` com nuances de ${secondary.slice(0, 2).join(' e ').toLowerCase()}` : '';
  return `Sua assinatura visual é baseada em uma interpretação estratégica e personalizada do estilo ${style.toLowerCase()}${secTxt}. O foco não é apenas a vestimenta, mas a construção de uma narrativa de autoridade, intenção e impacto, garantindo que sua imagem projete seus objetivos pessoais e profissionais de forma autêntica em qualquer ambiente.`;
}

export function deriveDna(fabrics: string[], metal: string): { silhueta: string; texturas: string; cores: string; detalhes: string } {
  return {
    silhueta: 'Silhueta limpa, com volume calibrado nos ombros e caimento reto no tronco.',
    texturas: fabrics.length ? `Texturas centradas em ${fabrics.slice(0, 3).join(', ').toLowerCase()}.` : 'Texturas de tecido nobre com toque seco e caimento estável.',
    cores: 'Base neutra profunda com um ponto de cor controlado por look.',
    detalhes: metal ? `Metais em ${metal.toLowerCase()} nos acessórios de leitura próxima.` : 'Acessórios discretos com acabamento fosco.',
  };
}

export function deriveStrategy(style: string, goal: string): Array<{ eixo: string; direcao: string; prioridade: string }> {
  const identity = style || 'estilo próprio';
  const objective = goal || 'reforçar presença, coerência e intenção visual';
  return [
    { eixo: 'Presença profissional', direcao: `Usar a identidade ${identity.toLowerCase()} com peças estruturadas e acabamento consistente para comunicar ${objective.toLowerCase()}.`, prioridade: 'alta' },
    { eixo: 'Silhueta e caimento', direcao: 'Priorizar proporções equilibradas, barras limpas e modelagens que organizem visualmente a silhueta.', prioridade: 'alta' },
    { eixo: 'Paleta e contraste', direcao: 'Construir looks a partir de uma base neutra estável e inserir pontos de cor controlados para profundidade.', prioridade: 'média' },
    { eixo: 'Materiais e acabamento', direcao: 'Preferir tecidos respiráveis, textura controlada e acabamentos discretos que sustentem uma aparência premium.', prioridade: 'média' },
    { eixo: 'Dress code e ocasiões', direcao: 'Criar combinações que mudem de casual sofisticado para profissional sem perder a mesma assinatura visual.', prioridade: 'alta' },
    { eixo: 'Consistência pessoal', direcao: 'Repetir cores, silhuetas, materiais e detalhes-chave para tornar a imagem reconhecível e coerente.', prioridade: 'alta' },
  ];
}

export function deriveColorApplication(color: Rec): { neutros: string; principais: string; acentos: string; combinacoes_recomendadas: string[] } {
  const paleta = obj(color.paleta_cores_ideais);
  const neutros = toStringList(paleta.neutros || paleta.base || paleta.cores_base, 4);
  const principais = toStringList(paleta.cores_base || paleta.suporte || paleta.cores_destaque, 4);
  const acentos = toStringList(paleta.cores_destaque || paleta.destaque || paleta.cores_acessorios, 4);
  const combos: string[] = [];
  if (neutros[0] && principais[0]) combos.push(`${neutros[0]} + ${principais[0]}`);
  if (neutros[1] && acentos[0]) combos.push(`${neutros[1]} + ${acentos[0]}`);
  if (principais[1] && neutros[0]) combos.push(`${principais[1]} + ${neutros[0]}`);
  if (acentos[1] && neutros[1]) combos.push(`${acentos[1]} + ${neutros[1]}`);
  if (principais[2] && acentos[0]) combos.push(`${principais[2]} + ${acentos[0]}`);
  return {
    neutros: neutros.length ? neutros.join(', ') : '',
    principais: principais.length ? principais.join(', ') : '',
    acentos: acentos.length ? acentos.join(', ') : '',
    combinacoes_recomendadas: combos,
  };
}

export function deriveReforcar(body: Rec, style: Rec): string[] {
  const list = [...toStringList(body.pontos_fortes, 4), ...toStringList(style.elementos_essenciais, 3)];
  return list.length ? list.slice(0, 6) : ['Linhas verticais para alongar silhueta', 'Estrutura de ombros bem definida', 'Caimento ajustado, sem excesso de tecido'];
}

export function deriveEvitar(body: Rec, color: Rec, modeling: Rec): string[] {
  const list = [...toStringList(modeling.tecidos_evitar, 3), ...toStringList(body.pontos_de_atencao, 2), ...toStringList(color.cores_evitar, 2)];
  return list.length ? list.slice(0, 6) : ['Excesso de volume desestruturado', 'Tecidos com brilho excessivo', 'Modelagens que interrompem a linha visual'];
}

export function deriveImagemDigital(color: Rec): { videochamada: string; foto_perfil: string; redes_sociais: string } {
  const metal = s(color.metais_ideais);
  return {
    videochamada: `Para videochamadas, sua imagem deve ser clara e contrastada. Use tons da sua base neutra${metal ? ` com acessórios em ${metal.toLowerCase()}` : ''}. Iluminação frontal é essencial para transmitir energia e profissionalismo.`,
    foto_perfil: 'Sua foto de perfil deve projetar a tese central deste diagnóstico. Enquadramento de busto, fundo neutro e vestimenta que reforce seu arquétipo principal.',
    redes_sociais: 'Mantenha consistência visual. A repetição da sua paleta e estilo em seu feed constrói autoridade de forma silenciosa e poderosa.',
  };
}

export function getQuestionnaire(d: DiagnosisRecord): Rec { return obj(d.questionnaire); }
export function getDossier(d: DiagnosisRecord): Rec { return obj(d.dossier_content); }
export function getClientName(d: DiagnosisRecord): string { const q = getQuestionnaire(d); return firstText(q.nome, q.name, q.full_name); }
export function getReportId(d: DiagnosisRecord): string { return String(d.id || '').slice(0, 8).toUpperCase(); }
