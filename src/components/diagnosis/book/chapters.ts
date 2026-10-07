import type { Chapter, ChapterContent, DiagnosisRecord } from './types';
import {
  s, obj, arr, firstText, toStringList, nonEmpty,
  deriveArchetypes, deriveSignature, deriveDna, deriveStrategy,
  deriveColorApplication, deriveReforcar, deriveEvitar, deriveImagemDigital,
  getQuestionnaire, getDossier,
} from './fallbacks';

function paragraphs(...parts: unknown[]): ChapterContent {
  const paragraphs = parts.map((p) => s(p)).filter(Boolean);
  return paragraphs.length ? { paragraphs } : { empty: true };
}

function bulletsOnly(list: string[], intro?: string): ChapterContent {
  const clean = list.filter(Boolean);
  if (!clean.length) return { empty: true };
  return { paragraphs: intro ? [intro] : undefined, bullets: clean };
}

export const CHAPTERS: Chapter[] = [
  // ── Parte I · Base ──
  {
    id: 'capitulo-02', numeral: 'I', part: 1,
    title: 'Seu perfil de imagem', kicker: 'A tese central da sua identidade visual',
    resolve: (d) => {
      const fd = obj(d.final_diagnosis);
      const primary = firstText(fd.perfil_cliente);
      
      if (primary && !primary.match(/^(profiss[aã]o|estilo de vida|biotipo|clima|objetivo):/i)) {
        return paragraphs(primary);
      }
      
      const st = obj(d.style_analysis);
      const styleDesc = firstText(st.descricao_estilo, st.estilo_predominante);
      return paragraphs(styleDesc || deriveSignature(s(st.estilo_predominante) || 'estilo próprio', toStringList(st.estilos_secundarios, 3)));
    },
  },
  {
    id: 'capitulo-01', numeral: 'II', part: 1,
    title: 'Estrutura e Momento', kicker: 'O diagnóstico do seu principal desafio e oportunidade atual',
    resolve: (d) => {
      const fd = obj(d.final_diagnosis);
      const summary = firstText(fd.summary);
      const discoveries = toStringList(fd.principais_descobertas, 4);
      
      if (summary && summary.length > 20 && !summary.match(/^(profiss[aã]o|estilo de vida|biotipo|clima|objetivo):/i)) {
        return {
          paragraphs: [summary],
          bullets: discoveries.length ? discoveries : undefined
        };
      }

      const style = s(obj(d.style_analysis).estilo_predominante) || 'estilo próprio';
      const goal = firstText(getQuestionnaire(d).objetivo_percepcao, getQuestionnaire(d).objetivo, 'evolução de imagem');
      return paragraphs(`O diagnóstico identifica uma oportunidade estratégica de alinhar sua identidade visual à sua rotina e objetivos de ${goal.toLowerCase()}. A VIRUM propõe uma transição para uma imagem que projete autoridade sem sacrificar sua essência ${style.toLowerCase()}.`);
    },
  },
  {
    id: 'capitulo-03', numeral: 'III', part: 1,
    title: 'Arquétipos Pessoais', kicker: 'Os dois papéis que moldam sua imagem',
    resolve: (d) => {
      const st = obj(d.style_analysis);
      const primary = arr(st.arquetipos);
      if (primary.length) {
        return bulletsOnly(
          primary.map((a) => {
            const o = obj(a);
            return `${s(o.nome)}${o.descricao ? ` — ${s(o.descricao)}` : ''}`;
          }),
          'Dois arquétipos organizam sua leitura pessoal:',
        );
      }
      const q = getQuestionnaire(d);
      const derived = deriveArchetypes(s(st.estilo_predominante), firstText(q.objetivo_percepcao, q.objetivo));
      return bulletsOnly(
        derived.map((a) => `${a.nome} — ${a.descricao}`),
        'Dois arquétipos organizam sua leitura pessoal:',
      );
    },
  },
  {
    id: 'capitulo-04', numeral: 'IV', part: 1,
    title: 'Diretrizes de Evolução', kicker: 'A síntese objetiva da transformação proposta',
    resolve: (d) => {
      const fd = obj(d.final_diagnosis);
      const trans = firstText(fd.transformacao_proposta);
      if (trans) return paragraphs(trans);
      return { empty: true };
    },
  },
  // ── Parte II · Código ──
  {
    id: 'capitulo-05', numeral: 'V', part: 2,
    title: 'Assinatura Visual', kicker: 'O que sua imagem comunica antes de você falar',
    resolve: (d) => {
      const st = obj(d.style_analysis);
      const primary = firstText(st.assinatura_visual);
      if (primary) return paragraphs(primary);
      return paragraphs(deriveSignature(s(st.estilo_predominante) || 'estilo próprio', toStringList(st.estilos_secundarios, 3)));
    },
  },
  {
    id: 'capitulo-06', numeral: 'VI', part: 2,
    title: 'Estratégia de Imagem', kicker: 'Seis eixos para calibrar sua presença',
    resolve: (d) => {
      // Prioridade 1: strategy_analysis (novo campo estruturado)
      const st = obj(d.strategy_analysis);
      const axis = arr(st.eixos || st.axis || st.estrategia);
      if (axis.length) {
        return bulletsOnly(
          axis.map(e => {
            const o = obj(e);
            const label = s(o.eixo || o.axis || o.nome);
            const prio = s(o.prioridade || o.priority);
            const dir = s(o.direcao || o.direction || o.recomendacao);
            return `${label}${prio ? ` (${prio})` : ''}: ${dir}`;
          }),
          'Os eixos que sua imagem deve equilibrar:'
        );
      }

      // Prioridade 2: final_diagnosis.estrategia_imagem (legado)
      const fd = obj(d.final_diagnosis);
      const primary = arr(fd.estrategia_imagem);
      const source = primary.length
        ? primary.map((e) => {
            const o = obj(e);
            return `${s(o.eixo)}${o.prioridade ? ` (${s(o.prioridade)})` : ''}: ${s(o.direcao)}`;
          })
        : deriveStrategy(
            s(obj(d.style_analysis).estilo_predominante),
            firstText(getQuestionnaire(d).objetivo_percepcao),
          ).map((e) => `${e.eixo} (${e.prioridade}): ${e.direcao}`);
      return bulletsOnly(source, 'Os eixos que sua imagem deve equilibrar:');
    },
  },
  {
    id: 'capitulo-07', numeral: 'VII', part: 2,
    title: 'DNA Visual', kicker: 'Silhueta, textura, cor e detalhe que se repetem',
    resolve: (d) => {
      const st = obj(d.style_analysis);
      const primary = obj(st.dna_visual);
      const dna = nonEmpty(primary)
        ? primary
        : deriveDna(toStringList(getDossier(d).tecidos, 3), s(obj(d.color_analysis).metais_ideais));
      return bulletsOnly([
        `Silhueta — ${s((dna as Record<string, unknown>).silhueta)}`,
        `Texturas — ${s((dna as Record<string, unknown>).texturas)}`,
        `Cores — ${s((dna as Record<string, unknown>).cores)}`,
        `Detalhes — ${s((dna as Record<string, unknown>).detalhes)}`,
      ]);
    },
  },
  // ── Parte III · Estética ──
  {
    id: 'capitulo-08', numeral: 'VIII', part: 3,
    title: 'Paleta Estratégica', kicker: 'A cartela cromática que sustenta cada look',
    resolve: () => ({ block: 'palette' }),
  },
  {
    id: 'capitulo-09', numeral: 'IX', part: 3,
    title: 'Cor Aplicada', kicker: 'Como a paleta se traduz em peças reais',
    resolve: (d) => {
      const color = obj(d.color_analysis);
      const app = arr(color.aplicacao);
      if (app.length) {
        return bulletsOnly(app.map(a => {
          const o = obj(a);
          return `${s(o.cor || o.name)}${o.uso ? ` em ${s(o.uso).toLowerCase()}` : ''}${o.motivo ? ` — ${s(o.motivo)}` : ''}`;
        }));
      }
      const oldApp = obj(color.aplicacao);
      return paragraphs(
        s((oldApp as Record<string, unknown>).neutros),
        s((oldApp as Record<string, unknown>).principais),
        s((oldApp as Record<string, unknown>).acentos),
      );
    },
  },
  {
    id: 'capitulo-10', numeral: 'X', part: 3,
    title: 'Guia de Estrutura Corporal', kicker: 'Como vestir o seu biotipo',
    resolve: () => ({ block: 'body' }),
  },
  {
    id: 'capitulo-11', numeral: 'XI', part: 3,
    title: 'Tecidos e Materiais', kicker: 'A matéria-prima que trabalha a seu favor',
    resolve: (d) => {
      const primary = toStringList(getDossier(d).tecidos, 8);
      if (primary.length) return bulletsOnly(primary);
      const modeling = obj(d.modeling_analysis);
      return bulletsOnly([
        ...toStringList(modeling.tecidos_recomendados, 6),
        ...toStringList(modeling.tecidos_evitar, 2).map((t) => `Evitar: ${t}`),
      ]);
    },
  },
  {
    id: 'capitulo-12', numeral: 'XII', part: 3,
    title: 'Acessórios e Detalhes', kicker: 'Os pontos que assinam o look',
    resolve: (d) => {
      const dossier = getDossier(d);
      const primary = toStringList(dossier.acessorios, 8);
      if (primary.length) return bulletsOnly(primary);
      const metal = s(obj(d.color_analysis).metais_ideais);
      return bulletsOnly([
        `Relógio — caixa clássica, mostrador limpo${metal ? `, acabamento em ${metal.toLowerCase()}` : ''}.`,
        'Cinto — couro liso de tom coordenado ao calçado.',
        'Óculos — armação estruturada, proporcional ao rosto.',
        'Meias — sempre acima do tornozelo em cor coordenada.',
      ]);
    },
  },
  {
    id: 'capitulo-13', numeral: 'XIII', part: 3,
    title: 'Grooming e Presença', kicker: 'Cabelo, barba, pele e postura como parte da imagem',
    resolve: (d) => {
      const primary = toStringList(getDossier(d).cuidados_imagem, 8);
      if (primary.length) return bulletsOnly(primary);
      return bulletsOnly([
        'Cabelo — corte revisto a cada 4–5 semanas para manter forma.',
        'Barba — desenho consistente com o formato do rosto.',
        'Pele — rotina básica de limpeza e hidratação diária.',
        'Postura — ombros abertos, queixo paralelo ao chão.',
        'Fragrância — uma assinatura olfativa fixa para leitura próxima.',
      ]);
    },
  },
  // ── Parte IV · Prática ──
  {
    id: 'capitulo-14', numeral: 'XIV', part: 4,
    title: 'Guarda-Roupa Estratégico', kicker: 'As peças-chave que sustentam a rotina',
    resolve: (d) => {
      const ess = obj(d.wardrobe_essentials);
      const list = arr(ess.pecas_essenciais || ess.pecas || ess.items);
      if (!list.length) {
        return paragraphs('Definindo as peças-chave que sustentarão sua nova imagem estratégica.');
      }
      return { block: 'wardrobe' };
    },
  },
  {
    id: 'capitulo-15', numeral: 'XV', part: 4,
    title: 'O Que Reforçar', kicker: 'Elementos que amplificam sua leitura',
    resolve: (d) => {
      const modeling = obj(d.modeling_analysis);
      const primary = toStringList(modeling.reforcar, 7);
      if (primary.length) return bulletsOnly(primary);
      return bulletsOnly(deriveReforcar(obj(d.body_analysis), obj(d.style_analysis)));
    },
  },
  {
    id: 'capitulo-16', numeral: 'XVI', part: 4,
    title: 'O Que Evitar', kicker: 'Escolhas que enfraquecem a imagem',
    resolve: (d) => {
      const modeling = obj(d.modeling_analysis);
      const primary = toStringList(modeling.evitar, 7);
      if (primary.length) return bulletsOnly(primary);
      return bulletsOnly(deriveEvitar(obj(d.body_analysis), obj(d.color_analysis), modeling));
    },
  },
  {
    id: 'capitulo-17', numeral: 'XVII', part: 4,
    title: 'Guarda-Roupa Cápsula', kicker: 'Combinações prontas para sua rotina',
    resolve: () => ({ block: 'capsule' }),
  },
  {
    id: 'capitulo-18', numeral: 'XVIII', part: 4,
    title: 'Ocasiões e Contextos', kicker: 'Como vestir para cada situação',
    resolve: (d) => {
      const cap = obj(d.capsule_wardrobe);
      const looks = arr(cap.looks);
      if (looks.length) {
        return bulletsOnly(looks.map(l => {
          const o = obj(l);
          const p = arr(o.pieces).join(', ');
          return `${s(o.look_name)} (${s(o.occasion)}): ${p}${o.shoes ? ` + ${s(o.shoes)}` : ''}`;
        }));
      }
      const occ = obj(getDossier(d).recomendacoes_ocasioes);
      if (nonEmpty(occ)) {
        return bulletsOnly([
          occ.trabalho ? `Trabalho — ${s(occ.trabalho)}` : '',
          occ.eventos ? `Eventos — ${s(occ.eventos)}` : '',
          occ.lazer ? `Lazer — ${s(occ.lazer)}` : '',
          occ.viagens ? `Viagens — ${s(occ.viagens)}` : '',
        ].filter(Boolean));
      }
      return paragraphs('Para sua rotina, priorize peças que sustentam contextos formal e informal sem quebra de coerência.');
    },
  },
  {
    id: 'capitulo-19', numeral: 'XIX', part: 4,
    title: 'Imagem Digital', kicker: 'Como você é lido em tela',
    resolve: (d) => {
      const dossier = getDossier(d);
      const primary = obj(dossier.imagem_digital);
      const img = nonEmpty(primary) ? primary : deriveImagemDigital(obj(d.color_analysis));
      return paragraphs(
        s((img as Record<string, unknown>).videochamada),
        s((img as Record<string, unknown>).foto_perfil),
        s((img as Record<string, unknown>).redes_sociais),
      );
    },
  },
  {
    id: 'capitulo-20', numeral: 'XX', part: 4,
    title: 'Viagens e Deslocamento', kicker: 'Estratégia de mala e coringas',
    resolve: (d) => {
      const via = s(obj(getDossier(d).recomendacoes_ocasioes).viagens);
      if (via) return paragraphs(via);
      const coringas = toStringList(obj(d.wardrobe_essentials).pecas_essenciais, 4);
      return paragraphs(
        'Monte a mala em torno de uma paleta reduzida (2 neutros + 1 cor de destaque) para maximizar combinações.',
        coringas.length ? `Coringas do seu guarda-roupa que viajam bem: ${coringas.join(', ')}.` : 'Priorize peças com pouca ruga e tecidos de gramatura média.',
      );
    },
  },
  {
    id: 'capitulo-21', numeral: 'XXI', part: 4,
    title: 'Sazonalidade', kicker: 'Adaptações ao clima do seu contexto',
    resolve: (d) => {
      const clima = firstText(getQuestionnaire(d).clima, getQuestionnaire(d).climate, 'temperado');
      return paragraphs(
        `Adaptação sazonal orientada por clima ${clima.toLowerCase()}: escolha de gramatura, sobreposição e trama.`,
        'Regra prática: mantenha a paleta estável ao longo do ano e varie apenas materiais e gramaturas.',
      );
    },
  },
  {
    id: 'capitulo-22', numeral: 'XXII', part: 4,
    title: 'Investimento e Prioridades', kicker: 'A ordem inteligente de compra',
    resolve: (d) => {
      const fd = obj(d.final_diagnosis);
      const shopping = obj(fd.shopping_list);
      if (nonEmpty(shopping)) {
        const items = [
          ...arr(shopping.buy_now).map(i => `COMPRE AGORA: ${s(i)}`),
          ...arr(shopping.buy_later).map(i => `COMPRE DEPOIS: ${s(i)}`),
          ...arr(shopping.refinement).map(i => `REFINAMENTO: ${s(i)}`),
        ];
        if (items.length) return bulletsOnly(items, 'Lista de compras estratégica priorizada:');
      }
      const priorityHigh = arr(obj(d.wardrobe_essentials).pecas_essenciais)
        .filter((p) => s(obj(p).priority || obj(p).prioridade) === 'alta')
        .map((p) => s(obj(p).name || obj(p).peca))
        .filter(Boolean);
      return bulletsOnly(priorityHigh.length ? priorityHigh : ['Iniciar por peças de alta prioridade do guarda-roupa estratégico.'], 'Ordem sugerida das próximas aquisições:');
    },
  },
  // ── Parte V · Caminho ──
  {
    id: 'capitulo-23', numeral: 'XXIII', part: 5,
    title: 'Plano de Evolução', kicker: 'Trinta, sessenta, noventa dias',
    resolve: () => ({ block: 'timeline' }),
  },
  {
    id: 'capitulo-24', numeral: 'XXIV', part: 5,
    title: 'Referências Visuais', kicker: 'Imagens que traduzem sua direção',
    resolve: () => ({ block: 'refs' }),
  },
  {
    id: 'capitulo-25', numeral: 'XXV', part: 5,
    title: 'Nota Final', kicker: 'Uma palavra pessoal para fechar',
    resolve: () => ({ block: 'quote' }),
  },
];

export function isChapterAvailable(d: DiagnosisRecord, chapter: Chapter): boolean {
  if (chapter.id === 'capitulo-24') {
    const imgs = obj(d.generated_images);
    return Object.keys(imgs).length > 0;
  }
  return true;
}

export function visibleChapters(d: DiagnosisRecord): Chapter[] {
  return CHAPTERS.filter((c) => isChapterAvailable(d, c));
}
