// Definição declarativa das 25 perguntas do formulário premium masculino.
// Cada opção carrega pesos internos por estilo (usados invisivelmente pela IA).

export type StyleTag =
  | "Classico" | "Contemporaneo" | "Natural" | "Elegante" | "Minimalista"
  | "Urbano" | "Criativo" | "SmartCasual" | "Executivo" | "Refinado";

export const STYLE_TAGS: StyleTag[] = [
  "Classico","Contemporaneo","Natural","Elegante","Minimalista",
  "Urbano","Criativo","SmartCasual","Executivo","Refinado",
];

export type Weights = Partial<Record<StyleTag, number>>;

export interface Option {
  id: string;
  label: string;
  weights?: Weights;
}

export type QuestionType = "single" | "multi" | "slider" | "image-single" | "text";

export interface Question {
  id: string;
  step: number;
  type: QuestionType;
  title: string;
  helper?: string;
  options?: Option[];
  max?: number; // for multi / slider
  min?: number; // slider
  imageCategory?: string; // for image-single
  placeholder?: string; // for text
  minLength?: number;   // for text (validation)
  maxLength?: number;   // for text
}

// helper for terser weight blocks
const w = (o: Weights): Weights => o;

export const QUESTIONS: Question[] = [
  // ETAPA 1 — OBJETIVOS
  {
    id: "age_range", step: 1, type: "single",
    title: "Qual sua faixa etária?",
    options: [
      { id: "18_24", label: "18-24 anos" },
      { id: "25_34", label: "25-34 anos" },
      { id: "35_44", label: "35-44 anos" },
      { id: "45_54", label: "45-54 anos" },
      { id: "55_plus", label: "55+ anos" },
    ],
  },
  {
    id: "life_moment", step: 1, type: "single",
    title: "Qual é seu principal momento de vida?",
    options: [
      { id: "growth",       label: "Crescimento profissional", weights: w({ Executivo: 2, Contemporaneo: 1, SmartCasual: 1 }) },
      { id: "leadership",   label: "Liderança",                weights: w({ Executivo: 3, Refinado: 2, Classico: 1 }) },
      { id: "entrepreneur", label: "Empreendedorismo",         weights: w({ Contemporaneo: 2, Urbano: 1, Executivo: 1 }) },
      { id: "career_shift", label: "Mudança de carreira",      weights: w({ Contemporaneo: 2, SmartCasual: 1 }) },
      { id: "academic",     label: "Vida acadêmica",           weights: w({ Natural: 2, Minimalista: 1 }) },
      { id: "biz_expansion",label: "Expansão dos negócios",    weights: w({ Executivo: 2, Refinado: 2 }) },
      { id: "social",       label: "Vida social",              weights: w({ Elegante: 2, Urbano: 1, Refinado: 1 }) },
      { id: "relationship", label: "Novo relacionamento",      weights: w({ Elegante: 2, Refinado: 1 }) },
      { id: "other",        label: "Outro" },
    ],
  },
  {
    id: "image_goals", step: 1, type: "multi", max: 3,
    title: "O que deseja conquistar através da sua imagem?",
    helper: "Selecione até 3.",
    options: [
      { id: "authority",     label: "Autoridade",     weights: w({ Executivo: 3, Classico: 2, Refinado: 1 }) },
      { id: "credibility",   label: "Credibilidade",  weights: w({ Executivo: 2, Classico: 2, Minimalista: 1 }) },
      { id: "elegance",      label: "Elegância",      weights: w({ Elegante: 3, Refinado: 2, Classico: 1 }) },
      { id: "sophistication",label: "Sofisticação",   weights: w({ Refinado: 3, Elegante: 2, Minimalista: 1 }) },
      { id: "masculinity",   label: "Masculinidade",  weights: w({ Classico: 2, Executivo: 1, Urbano: 1 }) },
      { id: "leadership_p",  label: "Liderança",      weights: w({ Executivo: 3, Refinado: 1 }) },
      { id: "confidence",    label: "Confiança",      weights: w({ Contemporaneo: 2, Executivo: 1 }) },
      { id: "respect",       label: "Respeito",       weights: w({ Classico: 2, Executivo: 2 }) },
      { id: "visibility",    label: "Visibilidade",   weights: w({ Urbano: 2, Criativo: 2, Contemporaneo: 1 }) },
      { id: "security",      label: "Segurança",      weights: w({ Classico: 2, Minimalista: 1 }) },
      { id: "approach",      label: "Aproximação",    weights: w({ SmartCasual: 2, Natural: 2 }) },
    ],
  },
  {
    id: "perceived_as", step: 1, type: "multi", max: 3,
    title: "Como acredita que as pessoas enxergam você hoje?",
    helper: "Selecione até 3.",
    options: [
      { id: "too_serious",  label: "Muito sério",         weights: w({ Classico: 1 }) },
      { id: "too_simple",   label: "Simples demais",      weights: w({ SmartCasual: 1, Natural: 1 }) },
      { id: "informal",     label: "Informal",            weights: w({ Natural: 2, SmartCasual: 1 }) },
      { id: "elegant_now",  label: "Elegante",            weights: w({ Elegante: 2, Refinado: 1 }) },
      { id: "authoritative",label: "Autoritário",         weights: w({ Executivo: 2, Classico: 1 }) },
      { id: "approachable", label: "Acessível",           weights: w({ SmartCasual: 2, Natural: 1 }) },
      { id: "no_identity",  label: "Sem personalidade",   weights: w({ Contemporaneo: 1, Criativo: 1 }) },
      { id: "modern_now",   label: "Moderno",             weights: w({ Contemporaneo: 2, Urbano: 1 }) },
      { id: "traditional",  label: "Tradicional",         weights: w({ Classico: 2 }) },
      { id: "stylish",      label: "Estiloso",            weights: w({ Criativo: 2, Urbano: 1 }) },
      { id: "not_sure",     label: "Não sei" },
    ],
  },

  // ETAPA 2 — ROTINA
  {
    id: "work_environment", step: 2, type: "single",
    title: "Como é o seu ambiente de trabalho predominante?",
    options: [
      { id: "formal",     label: "Formal (Terno/Gravata)",  weights: w({ Executivo: 3, Classico: 2, Refinado: 1 }) },
      { id: "business",   label: "Corporativo (Camisa/Chino)", weights: w({ SmartCasual: 2, Executivo: 1, Contemporaneo: 1 }) },
      { id: "creative",   label: "Criativo/Casual",        weights: w({ Criativo: 2, Urbano: 2, Contemporaneo: 1 }) },
      { id: "home",       label: "Home Office/Remoto",     weights: w({ Natural: 3, Minimalista: 2 }) },
      { id: "operational",label: "Operacional/Uniforme",    weights: w({ Natural: 2 }) },
    ],
  },
  {
    id: "profession_detail", step: 2, type: "text",
    title: "Qual a sua profissão ou cargo?",
    helper: "Isso ajuda a IA a entender o nível de autoridade e o contexto social do seu trabalho.",
    placeholder: "Ex.: Diretor Comercial, Desenvolvedor, Advogado, Médico...",
    minLength: 3,
    maxLength: 100,
  },
  {
    id: "routine_type", step: 2, type: "single",
    title: "Sua rotina é predominantemente:",
    options: [
      { id: "office",     label: "Escritório",           weights: w({ Executivo: 3, Classico: 2 }) },
      { id: "public",     label: "Atendimento ao público",weights: w({ SmartCasual: 2, Contemporaneo: 1 }) },
      { id: "home",       label: "Home office",          weights: w({ Natural: 2, Minimalista: 1 }) },
      { id: "hybrid",     label: "Trabalho híbrido",     weights: w({ SmartCasual: 2, Contemporaneo: 1 }) },
      { id: "events",     label: "Eventos",              weights: w({ Elegante: 2, Refinado: 2 }) },
      { id: "travel",     label: "Viagens",              weights: w({ Contemporaneo: 2, Urbano: 1 }) },
      { id: "commercial", label: "Comercial",            weights: w({ SmartCasual: 2, Executivo: 1 }) },
      { id: "other",      label: "Outro" },
    ],
  },
  {
    id: "weekly_dress", step: 2, type: "single",
    title: "Como costuma se vestir durante a semana?",
    options: [
      { id: "social",       label: "Social",         weights: w({ Executivo: 3, Classico: 2, Refinado: 1 }) },
      { id: "social_casual",label: "Social casual",  weights: w({ SmartCasual: 3, Elegante: 1 }) },
      { id: "sport_fino",   label: "Esporte fino",   weights: w({ SmartCasual: 2, Contemporaneo: 2 }) },
      { id: "casual",       label: "Casual",         weights: w({ Natural: 2, Urbano: 1 }) },
      { id: "jeans_tshirt", label: "Jeans e camiseta",weights: w({ Natural: 2, Urbano: 2 }) },
      { id: "uniform",      label: "Uniforme" },
      { id: "variable",     label: "Muito variado",  weights: w({ Contemporaneo: 1, Criativo: 1 }) },
    ],
  },
  {
    id: "well_dressed_places", step: 2, type: "multi", max: 3,
    title: "Onde mais precisa estar bem vestido?",
    helper: "Selecione até 3.",
    options: [
      { id: "work",       label: "Trabalho",     weights: w({ Executivo: 2, SmartCasual: 1 }) },
      { id: "meetings",   label: "Reuniões",     weights: w({ Executivo: 2, Classico: 1 }) },
      { id: "events",     label: "Eventos",      weights: w({ Elegante: 2, Refinado: 1 }) },
      { id: "restaurants",label: "Restaurantes", weights: w({ Elegante: 2, Refinado: 1 }) },
      { id: "social_media",label:"Redes sociais",weights: w({ Criativo: 2, Urbano: 1 }) },
      { id: "church",     label: "Igreja",       weights: w({ Classico: 2 }) },
      { id: "travel",     label: "Viagens",      weights: w({ Contemporaneo: 2 }) },
      { id: "dates",      label: "Encontros",    weights: w({ Elegante: 1, SmartCasual: 1 }) },
      { id: "speaking",   label: "Palestras",    weights: w({ Executivo: 2, Refinado: 2 }) },
    ],
  },
  {
    id: "comfort_priority", step: 2, type: "slider", min: 1, max: 5,
    title: "Quanto conforto é prioridade?",
    helper: "1 = pouco prioritário · 5 = altíssima prioridade",
  },

  // ETAPA 3 — DIFICULDADES
  {
    id: "pain_points", step: 3, type: "multi", max: 5,
    title: "O que mais incomoda você?",
    helper: "Selecione até 5.",
    options: [
      { id: "cant_combine",  label: "Não sei combinar roupas",       weights: w({ SmartCasual: 1 }) },
      { id: "no_style",      label: "Não conheço meu estilo",        weights: w({ Contemporaneo: 1 }) },
      { id: "buy_wrong",     label: "Sempre compro errado",          weights: w({ Minimalista: 1 }) },
      { id: "no_match",      label: "Meu guarda-roupa não combina",  weights: w({ Minimalista: 1 }) },
      { id: "no_body_value", label: "Não valorizo meu corpo",        weights: w({ Contemporaneo: 1 }) },
      { id: "only_neutrals", label: "Só uso cores neutras",          weights: w({ Minimalista: 2, Classico: 1 }) },
      { id: "no_accessories",label: "Não sei usar acessórios",       weights: w({ Refinado: 1 }) },
      { id: "no_shoes",      label: "Não sei escolher sapatos",      weights: w({ Elegante: 1 }) },
      { id: "always_same",   label: "Me visto sempre igual",         weights: w({ Criativo: 1 }) },
      { id: "no_personality",label: "Falta personalidade",           weights: w({ Criativo: 2, Urbano: 1 }) },
    ],
  },
  {
    id: "shopping_ease", step: 3, type: "single",
    title: "Comprar roupas costuma ser:",
    options: [
      { id: "very_easy", label: "Muito fácil" },
      { id: "easy",      label: "Fácil" },
      { id: "medium",    label: "Médio" },
      { id: "hard",      label: "Difícil" },
      { id: "very_hard", label: "Muito difícil" },
    ],
  },
  {
    id: "closet_usage_low", step: 3, type: "single",
    title: "Você utiliza menos de 30% do guarda-roupa?",
    options: [
      { id: "yes",     label: "Sim" },
      { id: "no",      label: "Não" },
      { id: "no_idea", label: "Não sei" },
    ],
  },
  {
    id: "frequent_situation", step: 3, type: "single",
    title: "Qual situação acontece com mais frequência?",
    options: [
      { id: "buy_no_use",    label: "Compro e não uso" },
      { id: "similar_pieces",label: "Sempre compro peças parecidas" },
      { id: "never_find",    label: "Nunca encontro o que quero" },
      { id: "disorganized",  label: "Guarda-roupa desorganizado" },
      { id: "none",          label: "Não tenho esse problema" },
    ],
  },

  // ETAPA 4 — PREFERÊNCIAS VISUAIS (imagens fixas do Pexels)
  { id: "visual_env",     step: 4, type: "image-single", title: "Qual ambiente combina mais com você?", imageCategory: "ambiente" },
  { id: "visual_cafe",    step: 4, type: "image-single", title: "Qual cafeteria escolheria?",           imageCategory: "cafeteria" },
  { id: "visual_look",    step: 4, type: "image-single", title: "Qual look usaria?",                    imageCategory: "look" },
  { id: "visual_shoe",    step: 4, type: "image-single", title: "Qual sapato escolheria?",              imageCategory: "sapato" },
  { id: "visual_watch",   step: 4, type: "image-single", title: "Qual relógio combina mais com você?",  imageCategory: "relogio" },
  { id: "visual_palette", step: 4, type: "image-single", title: "Qual paleta representa você?",         imageCategory: "paleta" },
  { id: "visual_arch",    step: 4, type: "image-single", title: "Com qual homem você mais se identifica?",imageCategory: "arquetipo" },

  // ETAPA 5 — COMUNICAÇÃO
  {
    id: "desired_words", step: 5, type: "multi", max: 5,
    title: "Quais palavras gostaria que associassem à sua imagem?",
    helper: "Selecione até 5.",
    options: [
      { id: "elegant",   label: "Elegante",     weights: w({ Elegante: 3, Refinado: 1 }) },
      { id: "strong",    label: "Forte",        weights: w({ Executivo: 2, Classico: 1 }) },
      { id: "smart",     label: "Inteligente",  weights: w({ Minimalista: 2, Contemporaneo: 1 }) },
      { id: "reliable",  label: "Confiável",    weights: w({ Classico: 2, Executivo: 1 }) },
      { id: "sophist",   label: "Sofisticado",  weights: w({ Refinado: 3 }) },
      { id: "modern",    label: "Moderno",      weights: w({ Contemporaneo: 3, Urbano: 1 }) },
      { id: "masculine", label: "Masculino",    weights: w({ Classico: 2 }) },
      { id: "secure",    label: "Seguro",       weights: w({ Executivo: 1, Classico: 1 }) },
      { id: "inspiring", label: "Inspirador",   weights: w({ Criativo: 2, Refinado: 1 }) },
      { id: "discipl",   label: "Disciplinado", weights: w({ Minimalista: 2 }) },
      { id: "creative",  label: "Criativo",     weights: w({ Criativo: 3, Urbano: 1 }) },
      { id: "successful",label: "Bem-sucedido", weights: w({ Executivo: 2, Refinado: 1 }) },
    ],
  },
  {
    id: "not_transmit", step: 5, type: "multi", max: 3,
    title: "O que NÃO deseja transmitir?",
    helper: "Selecione até 3.",
    options: [
      { id: "arrogance",     label: "Arrogância" },
      { id: "stiffness",     label: "Rigidez" },
      { id: "disorg",        label: "Desorganização" },
      { id: "childish",      label: "Infantilidade" },
      { id: "too_informal",  label: "Excesso de informalidade" },
      { id: "too_vain",      label: "Vaidade excessiva" },
      { id: "shy",           label: "Timidez" },
    ],
  },
  {
    id: "attention", step: 5, type: "single",
    title: "Você gosta de chamar atenção?",
    options: [
      { id: "much",       label: "Muito",                    weights: w({ Criativo: 3, Urbano: 2 }) },
      { id: "some",       label: "Um pouco",                 weights: w({ Contemporaneo: 2 }) },
      { id: "when_needed",label: "Apenas quando necessário", weights: w({ Elegante: 2, Refinado: 1 }) },
      { id: "discreet",   label: "Prefiro discrição",        weights: w({ Minimalista: 3, Classico: 1 }) },
    ],
  },
  {
    id: "clothes_pref", step: 5, type: "single",
    title: "Você prefere roupas:",
    options: [
      { id: "classic",     label: "Clássicas",     weights: w({ Classico: 3, Executivo: 1 }) },
      { id: "timeless",    label: "Atemporais",    weights: w({ Refinado: 2, Minimalista: 2 }) },
      { id: "modern",      label: "Modernas",      weights: w({ Contemporaneo: 3 }) },
      { id: "fashion",     label: "Fashionistas",  weights: w({ Criativo: 3, Urbano: 2 }) },
      { id: "unknown",     label: "Ainda não sei" },
    ],
  },

  // ETAPA 6 — HÁBITOS DE COMPRA
  {
    id: "shop_priority", step: 6, type: "single",
    title: "Quando compra roupas você prioriza:",
    options: [
      { id: "quality",   label: "Qualidade",   weights: w({ Refinado: 2, Elegante: 1 }) },
      { id: "durability",label: "Durabilidade",weights: w({ Classico: 2, Minimalista: 1 }) },
      { id: "brand",     label: "Marca",       weights: w({ Executivo: 1, Refinado: 1 }) },
      { id: "price",     label: "Preço" },
      { id: "trend",     label: "Tendências",  weights: w({ Criativo: 2, Urbano: 1 }) },
    ],
  },
  {
    id: "monthly_budget", step: 6, type: "single",
    title: "Qual sua faixa de investimento mensal em roupas?",
    options: [
      { id: "low",     label: "Até R$ 500" },
      { id: "medium",  label: "R$ 500 – R$ 1.500" },
      { id: "high",    label: "R$ 1.500 – R$ 3.000" },
      { id: "premium", label: "Acima de R$ 3.000", weights: w({ Refinado: 2, Elegante: 1 }) },
    ],
  },
  {
    id: "closet_size", step: 6, type: "single",
    title: "Você prefere um guarda-roupa:",
    options: [
      { id: "lean",       label: "Enxuto e estratégico", weights: w({ Minimalista: 3, Refinado: 1 }) },
      { id: "balanced",   label: "Equilibrado",          weights: w({ SmartCasual: 2 }) },
      { id: "large",      label: "Grande e variado",     weights: w({ Criativo: 2 }) },
    ],
  },
  {
    id: "climate_region", step: 6, type: "single",
    title: "Como é o clima da região onde você mora?",
    helper: "Isso ajusta tecidos, camadas e cores recomendadas.",
    options: [
      { id: "cold",        label: "Frio (Abaixo de 15°C)" },
      { id: "temperate",   label: "Subtropical (15°C a 25°C)" },
      { id: "tropical",    label: "Quente (Acima de 25°C)" },
      { id: "very_hot",    label: "Muito Quente/Tropical" },
    ],
  },
  {
    id: "expectations", step: 6, type: "text",
    title: "O que você espera desse diagnóstico?",
    helper: "Descreva com suas palavras (ex.: parecer mais confiante no trabalho, aprender a combinar cores, modernizar sem perder a personalidade).",
    placeholder: "Escreva sua expectativa em poucas linhas...",
    minLength: 10,
    maxLength: 300,
  },

  // ETAPA 7 — GUARDA-ROUPA & RESTRIÇÕES (alta prioridade para a IA)
  {
    id: "wardrobe_owned", step: 7, type: "multi", max: 20,
    title: "O que existe hoje no seu guarda-roupa?",
    helper: "Selecione tudo que realmente faz parte da sua rotina — a IA priorizará montar looks com o que você já tem.",
    options: [
      { id: "camisas_sociais", label: "Camisas sociais" },
      { id: "polos", label: "Polos" },
      { id: "camisetas_lisas", label: "Camisetas lisas" },
      { id: "jeans", label: "Jeans" },
      { id: "chinos", label: "Chinos" },
      { id: "calcas_alfaiataria", label: "Calças de alfaiataria" },
      { id: "blazers", label: "Blazers" },
      { id: "jaquetas", label: "Jaquetas" },
      { id: "sueters", label: "Suéteres" },
      { id: "tenis", label: "Tênis" },
      { id: "mocassins", label: "Mocassins" },
      { id: "oxfords", label: "Oxfords" },
      { id: "botas", label: "Botas" },
    ],
  },
  {
    id: "wardrobe_avoided", step: 7, type: "multi", max: 20,
    title: "Quais peças você praticamente nunca usa?",
    helper: "Essas peças ganham peso negativo nas recomendações.",
    options: [
      { id: "camisas_sociais", label: "Camisas sociais" },
      { id: "polos", label: "Polos" },
      { id: "camisetas_lisas", label: "Camisetas lisas" },
      { id: "jeans", label: "Jeans" },
      { id: "chinos", label: "Chinos" },
      { id: "calcas_alfaiataria", label: "Calças de alfaiataria" },
      { id: "blazers", label: "Blazers" },
      { id: "jaquetas", label: "Jaquetas" },
      { id: "sueters", label: "Suéteres" },
      { id: "tenis", label: "Tênis" },
      { id: "mocassins", label: "Mocassins" },
      { id: "oxfords", label: "Oxfords" },
      { id: "botas", label: "Botas" },
    ],
  },
  {
    id: "colors_avoided", step: 7, type: "multi", max: 10,
    title: "Quais cores você prefere EVITAR no seu guarda-roupa?",
    helper: "Selecione as cores que você não gosta ou não se sente bem usando.",
    options: [
      { id: "preto", label: "Preto" },
      { id: "branco", label: "Branco" },
      { id: "cinza", label: "Cinza" },
      { id: "marrom", label: "Marrom" },
      { id: "azul_marinho", label: "Azul Marinho" },
      { id: "vermelho", label: "Vermelho" },
      { id: "amarelo", label: "Amarelo" },
      { id: "verde", label: "Verde" },
      { id: "rosa", label: "Rosa" },
      { id: "laranja", label: "Laranja" },
      { id: "roxo", label: "Roxo" },
      { id: "bege", label: "Bege/Creme" },
    ],
  },
  {
    id: "fabrics_avoided", step: 7, type: "multi", max: 5,
    title: "Quais tecidos você prefere EVITAR?",
    helper: "Por desconforto, alergia ou estética.",
    options: [
      { id: "linho", label: "Linho (por amassar)" },
      { id: "la", label: "Lã (por pinicar)" },
      { id: "sinteticos", label: "Sintéticos (poliéster/nylon)" },
      { id: "couro", label: "Couro" },
      { id: "veludo", label: "Veludo" },
      { id: "jeans", label: "Jeans pesado" },
    ],
  },
  {
    id: "renewal_intensity", step: 7, type: "single",
    title: "Você pretende renovar seu guarda-roupa em qual intensidade?",
    helper: "Isso muda completamente o plano de compras.",
    options: [
      { id: "small_adjust", label: "Apenas pequenos ajustes" },
      { id: "strategic",    label: "Comprar algumas peças estratégicas" },
      { id: "renew_most",   label: "Renovar boa parte" },
      { id: "transform",    label: "Quero transformar completamente meu estilo" },
    ],
  },
  {
    id: "alterations_ok", step: 7, type: "single",
    title: "Você está disposto a fazer ajustes em roupas (costureira/alfaiate)?",
    helper: "Influencia recomendações de modelagem e caimento.",
    options: [
      { id: "yes",     label: "Sim" },
      { id: "special", label: "Apenas em peças especiais" },
      { id: "no",      label: "Não" },
    ],
  },
  {
    id: "features_to_enhance", step: 7, type: "text",
    title: "Existe alguma característica física que você gostaria de valorizar ou equilibrar?",
    placeholder: "Ombros, cintura, pernas, quadril, altura, pescoço, braços...",
    minLength: 0,
    maxLength: 300,
  },
  {
    id: "insecurities", step: 7, type: "text",
    title: "Existe alguma insegurança que devemos considerar ao montar suas recomendações?",
    helper: "Campo opcional — a IA passa a tratar essas áreas de forma estratégica.",
    placeholder: "Ex.: não gosto dos meus braços, tenho dificuldade com barriga, quero parecer mais alto...",
    minLength: 0,
    maxLength: 300,
  },
  {
    id: "identity_pieces", step: 7, type: "text",
    title: "Há alguma peça que faz parte da sua identidade e você não pretende abandonar?",
    placeholder: "Ex.: relógio, camiseta preta, tênis branco, chapéu, boné, jaqueta jeans...",
    minLength: 0,
    maxLength: 300,
  },
  {
    id: "personal_rules", step: 7, type: "text",
    title: "Existe alguma regra pessoal que devemos respeitar?",
    helper: "Restrições difíceis de inferir — serão tratadas como regras invioláveis.",
    placeholder: "Ex.: não uso couro, não uso estampas, não gosto de roupa justa, só uso manga longa, evito bermuda...",
    minLength: 0,
    maxLength: 300,
  },
];

export const STEPS = [
  { id: 1, name: "Objetivos",     description: "Vamos entender onde você está hoje e como deseja ser percebido." },
  { id: 2, name: "Rotina",        description: "Sua rotina define grande parte do seu guarda-roupa ideal." },
  { id: 3, name: "Dificuldades",  description: "O que trava sua imagem hoje?" },
  { id: 4, name: "Preferências",  description: "Escolha visualmente o que mais combina com você." },
  { id: 5, name: "Comunicação",   description: "Como sua imagem deve falar por você." },
  { id: 6, name: "Compras",       description: "Seu jeito de investir no guarda-roupa." },
  { id: 7, name: "Guarda-roupa",  description: "Os últimos detalhes que fazem tudo caber em você — o que já existe, o que evitar e o que preservar." },
];