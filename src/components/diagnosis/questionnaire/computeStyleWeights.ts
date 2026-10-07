import { QUESTIONS, STYLE_TAGS, type StyleTag, type Weights } from "./questions";

export type Answers = Record<string, string | string[] | number | undefined>;

export interface StyleWeightsResult {
  scores: Record<StyleTag, number>;
  predominant: StyleTag;
  secondary: StyleTag[];
  reasoning: string;
}

export function computeStyleWeights(answers: Answers): StyleWeightsResult {
  const scores: Record<StyleTag, number> = Object.fromEntries(
    STYLE_TAGS.map((s) => [s, 0]),
  ) as Record<StyleTag, number>;

  for (const q of QUESTIONS) {
    if (!q.options) continue;
    const raw = answers[q.id];
    const selected: string[] = Array.isArray(raw)
      ? (raw as string[])
      : raw != null
      ? [String(raw)]
      : [];
    if (selected.length === 0) continue;

    for (const optId of selected) {
      const opt = q.options.find((o) => o.id === optId);
      if (!opt?.weights) continue;
      addWeights(scores, opt.weights);
    }
  }

  // Slider comfort bumps Natural / Minimalista slightly.
  const comfort = Number(answers["comfort_priority"] ?? 0);
  if (comfort >= 4) { scores.Natural += 2; scores.Minimalista += 1; }
  else if (comfort <= 2) { scores.Elegante += 1; scores.Refinado += 1; }

  const sorted = [...STYLE_TAGS].sort((a, b) => scores[b] - scores[a]);
  const predominant = sorted[0];
  const secondary = sorted.slice(1, 3);
  const top = sorted.slice(0, 5).map((s) => `${s}(${scores[s].toFixed(1)})`).join(" · ");

  return {
    scores,
    predominant,
    secondary,
    reasoning: `Pesos calculados a partir das respostas do formulário premium masculino. Top 5: ${top}.`,
  };
}

function addWeights(target: Record<StyleTag, number>, add: Weights) {
  for (const [k, v] of Object.entries(add)) {
    target[k as StyleTag] = (target[k as StyleTag] || 0) + (v || 0);
  }
}

export function labelFromStyleTag(tag: StyleTag): string {
  const map: Record<StyleTag, string> = {
    Classico: "Clássico",
    Contemporaneo: "Contemporâneo",
    Natural: "Natural",
    Elegante: "Elegante",
    Minimalista: "Minimalista",
    Urbano: "Urbano",
    Criativo: "Criativo",
    SmartCasual: "Smart Casual",
    Executivo: "Executivo",
    Refinado: "Refinado",
  };
  return map[tag];
}