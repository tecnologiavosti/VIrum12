import type { QuestionnaireData } from "@/pages/NewDiagnosis";
import type { Answers } from "./computeStyleWeights";
import { computeStyleWeights, labelFromStyleTag } from "./computeStyleWeights";

// Mapeia as novas respostas para o formato legado que process-diagnosis já consome,
// SEM alterar o contrato do backend. styleWeights é anexado como campo extra.
export function mapToLegacyQuestionnaire(
  answers: Answers,
  base: QuestionnaireData,
): QuestionnaireData & { styleWeights?: unknown } {
  const arr = (id: string) => (Array.isArray(answers[id]) ? (answers[id] as string[]) : []);
  const val = (id: string) => (answers[id] != null ? String(answers[id]) : "");

  // occasions (legacy uses ids like work/casual/events/formal/sports/travel)
  const occasionsSource = arr("well_dressed_places");
  const occasionsMap: Record<string, string> = {
    work: "work", meetings: "work", speaking: "work",
    events: "events", restaurants: "events", church: "formal",
    social_media: "events", travel: "travel", dates: "casual",
  };
  const occasions = Array.from(
    new Set(occasionsSource.map((o) => occasionsMap[o] || "casual")),
  );

  // Preferences (map to legacy 6-way palette)
  const clothes = val("clothes_pref");
  const prefMap: Record<string, string> = {
    classic: "classic", timeless: "elegant", modern: "modern",
    fashion: "bold", unknown: "modern",
  };
  const prefs: string[] = [];
  if (clothes && prefMap[clothes]) prefs.push(prefMap[clothes]);
  const desired = arr("desired_words");
  if (desired.includes("elegant") && !prefs.includes("elegant")) prefs.push("elegant");
  if (desired.includes("creative") && !prefs.includes("bold")) prefs.push("bold");

  // Formality from routine + weekly dress
  const weekly = val("weekly_dress");
  const formalityMap: Record<string, string> = {
    social: "business_casual",
    social_casual: "smart_casual",
    sport_fino: "smart_casual",
    casual: "casual",
    jeans_tshirt: "casual",
    variable: "smart_casual",
    uniform: "casual",
  };
  const formalityLevel = formalityMap[weekly] || base.formalityLevel || "smart_casual";

  // Budget
  const budgetMap: Record<string, string> = {
    low: "low", medium: "medium", high: "high", premium: "premium",
  };
  const budget = budgetMap[val("monthly_budget")] || base.budget || "medium";

  // Lifestyle prose derived from answers
  const routineLabel: Record<string, string> = {
    office: "escritório", public: "atendimento ao público", home: "home office",
    hybrid: "trabalho híbrido", events: "eventos", travel: "viagens",
    commercial: "comercial", other: "rotina variada",
  };
  const workEnvLabel: Record<string, string> = {
    formal: "Formal (Terno/Gravata)", business: "Corporativo (Camisa/Chino)",
    creative: "Criativo/Casual", home: "Home Office/Remoto", operational: "Operacional/Uniforme",
  };
  const weeklyLabel: Record<string, string> = {
    social: "social", social_casual: "social casual", sport_fino: "esporte fino",
    casual: "casual", jeans_tshirt: "jeans e camiseta", uniform: "uniforme",
    variable: "muito variado",
  };
  const lifestyle = [
    `Rotina: ${routineLabel[val("routine_type")] || "não informada"}.`,
    `Ambiente de trabalho: ${workEnvLabel[val("work_environment")] || "não informado"}.`,
    `Vestimenta semanal: ${weeklyLabel[val("weekly_dress")] || "não informada"}.`,
    `Conforto (1-5): ${val("comfort_priority") || "3"}.`,
  ].join(" ");

  // Profession — prioritized from explicit question, then fallback to life moment
  const momentLabel: Record<string, string> = {
    growth: "profissional em crescimento",
    leadership: "liderança executiva",
    entrepreneur: "empreendedor",
    career_shift: "profissional em transição de carreira",
    academic: "vida acadêmica",
    biz_expansion: "empresário em expansão",
    social: "vida social ativa",
    relationship: "vida pessoal em novo capítulo",
    other: "profissional",
  };
  const profession = val("profession_detail") || momentLabel[val("life_moment")] || base.profession || "profissional";

  const goals = arr("image_goals").length
    ? `Deseja transmitir: ${arr("image_goals").join(", ")}.`
    : base.goals || "";

  const challenges = arr("pain_points").length
    ? `Dificuldades: ${arr("pain_points").join(", ")}.`
    : base.challenges || "";

  // Climate now comes from the questionnaire question "climate_region"; fall
  // back to the profile default or a safe "subtropical" bucket.
  const climateMap: Record<string, string> = {
    cold: "cold",
    temperate: "subtropical",
    tropical: "tropical",
    very_hot: "tropical",
  };
  const climate = climateMap[val("climate_region")] || base.climate || "subtropical";

  // Age range (new question)
  const ageMap: Record<string, string> = {
    "18_24": "18-24 anos",
    "25_34": "25-34 anos",
    "35_44": "35-44 anos",
    "45_54": "45-54 anos",
    "55_plus": "55+ anos",
  };
  const ageRange = ageMap[val("age_range")] || "";

  // Free-text expectations (new question)
  const expectations = val("expectations").trim();

  // ── ETAPA 7 — Guarda-roupa & restrições de alta prioridade ────────────
  const wardrobeOwned = arr("wardrobe_owned");
  const wardrobeAvoided = arr("wardrobe_avoided");
  const renewalIntensityMap: Record<string, string> = {
    small_adjust: "apenas pequenos ajustes",
    strategic: "comprar algumas peças estratégicas",
    renew_most: "renovar boa parte do guarda-roupa",
    transform: "transformar completamente o estilo",
  };
  const renewalIntensity = renewalIntensityMap[val("renewal_intensity")] || "";
  const alterationsMap: Record<string, string> = {
    yes: "aceita ajustes em qualquer peça",
    special: "aceita ajustes apenas em peças especiais",
    no: "não aceita ajustes em roupas",
  };
  const alterationsOk = alterationsMap[val("alterations_ok")] || "";
  const featuresToEnhance = val("features_to_enhance").trim();
  const insecurities = val("insecurities").trim();
  const identityPieces = val("identity_pieces").trim();
  const personalRules = val("personal_rules").trim();

  const clothingLabels: Record<string, string> = {
    camisas_sociais: "camisas sociais",
    polos: "polos",
    camisetas_lisas: "camisetas lisas",
    jeans: "jeans",
    chinos: "chinos",
    calcas_alfaiataria: "calças de alfaiataria",
    blazers: "blazers",
    jaquetas: "jaquetas",
    sueters: "suéteres",
    tenis: "tênis",
    mocassins: "mocassins",
    oxfords: "oxfords",
    botas: "botas",
  };
  const labelIds = (ids: string[]) => ids.map((i) => clothingLabels[i] || i);

  // Style weights + IA-facing summary
  const sw = computeStyleWeights(answers);
  const styleWeights = {
    predominant: sw.predominant,
    predominant_label: labelFromStyleTag(sw.predominant),
    secondary: sw.secondary,
    secondary_labels: sw.secondary.map(labelFromStyleTag),
    scores: sw.scores,
    reasoning: sw.reasoning,
    // Raw answers to allow the AI to justify/validate.
    raw_answers: answers,
  };

  return {
    ...base,
    lifestyle,
    profession,
    occasions,
    preferences: prefs.length ? prefs : base.preferences,
    budget,
    climate,
    goals,
    challenges,
    formalityLevel,
    ageRange,
    expectations,
    wardrobeOwned: labelIds(wardrobeOwned),
    wardrobeAvoided: labelIds(wardrobeAvoided),
    renewalIntensity,
    alterationsOk,
    featuresToEnhance,
    insecurities,
    identityPieces,
    personalRules,
    colorsAvoided: arr("colors_avoided"),
    fabricsAvoided: arr("fabrics_avoided"),
    notTransmit: arr("not_transmit"),
    // styleWeights is appended as an extra field — QuestionnaireData is a
    // record type consumed as `Record<string, unknown>` on the backend.
    styleWeights,
  } as QuestionnaireData & { styleWeights?: unknown };
}