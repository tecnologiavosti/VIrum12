import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callAI, SECTION_MAX_TOKENS } from "../_shared/ai-config.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

type Q = Record<string, any>;

type SectionName =
  | "body"
  | "strategy"
  | "color"
  | "style"
  | "modeling"
  | "essentials"
  | "capsule"
  | "final";

const SECTION_ORDER: SectionName[] = [
  "body",
  "strategy",
  "color",
  "style",
  "modeling",
  "essentials",
  "capsule",
  "final",
];

const SECTION_COLUMN: Record<SectionName, string> = {
  body: "body_analysis",
  strategy: "strategy_analysis",
  color: "color_analysis",
  style: "style_analysis",
  modeling: "modeling_analysis",
  essentials: "wardrobe_essentials",
  capsule: "capsule_wardrobe",
  final: "final_diagnosis",
};

const SELECT_COLUMNS = `
  id,
  questionnaire,
  body_analysis,
  strategy_analysis,
  color_analysis,
  style_analysis,
  modeling_analysis,
  wardrobe_essentials,
  capsule_wardrobe,
  final_diagnosis,
  status,
  processing_step
`;

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const text = (value: unknown): string => {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return Object.values(value as Q).map(text).filter(Boolean).join(", ");
  }
  return String(value).trim();
};

const pick = (q: Q, ...keys: string[]): string => {
  for (const key of keys) {
    const value = text(q?.[key]);
    const normalized = value.toLowerCase();

    if (
      value &&
      normalized !== "não informado" &&
      normalized !== "nao informado"
    ) {
      return value;
    }
  }

  return "";
};

const block = (
  title: string,
  rows: Array<[string, string]>,
): string => {
  const filled = rows.filter(([, value]) => value);

  if (!filled.length) return "";

  return [
    title,
    ...filled.map(([k, v]) => `- ${k}: ${v}`),
  ].join("\n");
};

/* ------------------------------------------------------------------ *
 * PARSER ÚNICO E ROBUSTO DAS RESPOSTAS DA IA
 * ------------------------------------------------------------------ */

const isPlainObject = (value: unknown): value is Q =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Remove cercas Markdown (``` ou ```json) preservando o conteúdo interno. */
function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();

  const wholeFence = trimmed.match(
    /^```[a-zA-Z0-9_+-]*[ \t]*\r?\n?([\s\S]*?)\r?\n?[ \t]*```$/,
  );

  if (wholeFence && wholeFence[1].trim()) {
    return wholeFence[1].trim();
  }

  const innerFence = trimmed.match(
    /```[a-zA-Z0-9_+-]*[ \t]*\r?\n?([\s\S]*?)```/,
  );

  if (innerFence && innerFence[1].trim()) {
    return innerFence[1].trim();
  }

  return trimmed;
}

/**
 * Extrai objetos JSON completos balanceando chaves e respeitando
 * strings e caracteres escapados (chaves dentro de strings são ignoradas).
 */
function extractJsonObjectCandidates(source: string): string[] {
  const candidates: string[] = [];

  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) start = i;
      depth++;
      continue;
    }

    if (char === "}") {
      if (depth > 0) {
        depth--;

        if (depth === 0 && start !== -1) {
          candidates.push(source.slice(start, i + 1));
          start = -1;
        }
      }
    }
  }

  return candidates;
}

/** Remove somente vírgulas imediatamente anteriores a "}" ou "]", fora de strings. */
function removeTrailingCommas(candidate: string): string {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < candidate.length; i++) {
    const char = candidate[i];

    if (inString) {
      output += char;

      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }

    if (char === ",") {
      let j = i + 1;

      while (j < candidate.length && /\s/.test(candidate[j])) j++;

      if (candidate[j] === "}" || candidate[j] === "]") {
        continue;
      }
    }

    output += char;
  }

  return output;
}

/**
 * Escapa caracteres de controle literais que estejam DENTRO de strings JSON.
 * Nenhum caractere é removido e nenhum conteúdo textual é alterado
 * semanticamente (apenas representado da forma válida em JSON).
 */
function escapeControlCharsInStrings(candidate: string): string {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < candidate.length; i++) {
    const char = candidate[i];

    if (inString) {
      if (escaped) {
        output += char;
        escaped = false;
        continue;
      }

      if (char === "\\") {
        output += char;
        escaped = true;
        continue;
      }

      if (char === '"') {
        output += char;
        inString = false;
        continue;
      }

      const code = char.charCodeAt(0);

      if (code < 0x20) {
        if (char === "\n") output += "\\n";
        else if (char === "\r") output += "\\r";
        else if (char === "\t") output += "\\t";
        else if (char === "\b") output += "\\b";
        else if (char === "\f") output += "\\f";
        else output += `\\u${code.toString(16).padStart(4, "0")}`;

        continue;
      }

      output += char;
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }

    output += char;
  }

  return output;
}

function tryParseObject(candidate: string): Q | null {
  const attempts = [
    candidate,
    removeTrailingCommas(candidate),
    removeTrailingCommas(escapeControlCharsInStrings(candidate)),
  ];

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);

      if (isPlainObject(parsed)) return parsed;
    } catch {
      // tenta a próxima estratégia conservadora
    }
  }

  return null;
}

/**
 * Parser único usado por TODAS as seções.
 * Aceita JSON puro, JSON com whitespace, JSON em cercas Markdown e texto
 * residual antes/depois de um objeto JSON recuperável com segurança.
 * Rejeita arrays, primitivos, JSON5, comentários e respostas irrecuperáveis.
 */
function parseAIJson(result: unknown): Q {
  if (typeof result !== "string" || !result.trim()) {
    throw new Error("A IA retornou conteúdo que não é JSON válido.");
  }

  const raw = result.trim();

  const direct = tryParseObject(raw);
  if (direct) return direct;

  const stripped = stripCodeFences(raw);

  if (stripped !== raw) {
    const fromFence = tryParseObject(stripped);
    if (fromFence) return fromFence;
  }

  const candidates = extractJsonObjectCandidates(stripped);

  for (const candidate of candidates) {
    const parsed = tryParseObject(candidate);
    if (parsed) return parsed;
  }

  const byLength = [...candidates].sort((a, b) => b.length - a.length);

  for (const candidate of byLength) {
    const parsed = tryParseObject(candidate);
    if (parsed) return parsed;
  }

  console.error(
    `[process-diagnosis] parseAIJson falhou. Prévia da resposta: ${raw.slice(0, 400)}`,
  );

  throw new Error("A IA retornou conteúdo que não é JSON válido.");
}

/* ------------------------------------------------------------------ */

function buildContext(q: Q) {
  const perfil = block("PERFIL", [
    ["Nome", pick(q, "name", "nome")],
    ["Idade", pick(q, "age", "idade")],
    ["Gênero", pick(q, "gender", "genero")],
    ["Profissão", pick(q, "profession", "profissao")],
    ["Altura", pick(q, "heightCm", "height", "altura")],
    ["Peso", pick(q, "weightKg", "weight", "peso")],
    ["Biotipo", pick(q, "bodyType", "biotipo")],
    ["Tom de pele", pick(q, "skinTone", "tomPele")],
    ["Subtom de pele", pick(q, "undertone", "subtone", "subtomPele")],
    ["Cabelo", pick(q, "hair", "hairColor", "cabelo")],
    ["Olhos", pick(q, "eyes", "eyeColor", "olhos")],
    ["Observações corporais", pick(q, "bodyNotes")],
  ]);

  const identidade = block("IDENTIDADE E ESTILO", [
    ["Estilo desejado", pick(q, "style", "estilo", "desiredStyle")],
    ["Estilos preferidos", pick(q, "preferences", "preferredStyles")],
    ["Percepção desejada", pick(q, "desiredPerception")],
    ["Referências", pick(q, "references", "referencias", "inspirations")],
    ["Peças que gosta", pick(q, "likedPieces", "favoritePieces")],
    ["Peças que não gosta", pick(q, "avoids", "dislikedPieces")],
    ["Cores preferidas", pick(q, "preferredColors", "colors")],
    ["Cores que evita", pick(q, "avoidedColors")],
  ]);

  const rotina = block("ROTINA", [
    ["Ambiente profissional", pick(q, "workEnvironment", "dressCode")],
    ["Contexto de trabalho", pick(q, "professionDetail", "work", "workContext")],
    ["Rotina social", pick(q, "socialRoutine", "lifestyle", "routine")],
    ["Frequência de uso", pick(q, "usageFrequency")],
    ["Clima", pick(q, "climate", "clima")],
    ["Cidade/região", pick(q, "city", "region", "location")],
  ]);

  const contexto = block("CONTEXTO DE USO", [
    ["Ocasiões principais", pick(q, "occasions", "ocasioes")],
    ["Formalidade", pick(q, "formality")],
    ["Orçamento", pick(q, "budget")],
    ["Frequência de compras", pick(q, "shoppingFrequency")],
    ["Guarda-roupa atual", pick(q, "currentWardrobe", "wardrobe")],
  ]);

  const objetivos = block("OBJETIVOS", [
    ["Objetivos", pick(q, "goals", "objetivos", "improve")],
    ["Percepção que deseja transmitir", pick(q, "desiredPerception")],
    ["Dificuldades atuais", pick(q, "difficulties", "painPoints")],
    ["Prioridades", pick(q, "priorities")],
  ]);

  const join = (parts: string[]) =>
    parts.filter(Boolean).join("\n\n");

  return {
    full: join([
      perfil,
      identidade,
      rotina,
      contexto,
      objetivos,
    ]),
    physical: join([perfil, rotina, contexto]),
    identity: join([
      perfil,
      identidade,
      rotina,
      contexto,
      objetivos,
    ]),
    shopping: join([
      perfil,
      identidade,
      rotina,
      contexto,
      objetivos,
    ]),
    opening: join([
      perfil,
      identidade,
      rotina,
      contexto,
      objetivos,
    ]),
  };
}

const SYSTEM_PROMPT = `
Você é um consultor sênior de imagem masculina da VIRUM.

Sua função é transformar as respostas reais do cliente em uma
consultoria pessoal de imagem premium, profunda, coerente,
específica e aplicável.

Você NÃO recebe fotografias. Utilize EXCLUSIVAMENTE os dados
textuais fornecidos.

PRINCÍPIO CENTRAL: não copie os dados; interprete-os e
transforme-os em decisões de imagem.

Cada recomendação deve responder, quando aplicável:
1. O que significa?
2. Por que importa?
3. O que fazer?
4. Como aplicar em roupas reais?

REGRAS ABSOLUTAS:
- Português do Brasil.
- Retorne somente JSON válido, sem markdown e sem texto fora do JSON.
- Nunca invente profissão, idade, medidas, cidade, orçamento ou
  características físicas.
- Nunca afirme ter analisado fotografias.
- Nunca mencione IA, sistema, tecnologia, questionário ou formulário.
- Nunca faça psicologia genérica nem frases motivacionais vazias.
- Nunca fale de negócio, marketing, campanha, lançamento, fornecedor,
  MVP, roadmap ou usuários.
- Nunca escreva "Conteúdo em consolidação", "não informado",
  "peça coringa", "camisa versátil" ou "calça elegante".
- Não deixe campos vazios e não use "-" ou "—" como resposta.
- Se um dado não existir, omita o campo opcional em vez de inventar.
- Respeite clima, profissão, rotina, orçamento, formalidade e
  preferências informadas.
- Prefira recomendações específicas (peça + cor + tecido + modelagem)
  a adjetivos genéricos.
- O resultado deve parecer uma consultoria humana premium.
`;

const PROMPTS: Record<SectionName, (ctx: string) => string> = {
  body: (ctx) => `
Escreva a ABERTURA da consultoria e a leitura de silhueta deste cliente.

O campo "summary" é a peça mais importante do diagnóstico inteiro.
Ele deve ter de 3 a 5 parágrafos densos e escritos como um consultor
de imagem experiente falando diretamente com o cliente.

O summary precisa, sem citar rótulos nem listar dados:
- identificar a identidade visual atual e a pretendida;
- nomear a tensão central entre a imagem desejada e a rotina real;
- declarar a direção estratégica recomendada;
- dizer o que deve mudar primeiro e por quê;
- antecipar como as próximas seções resolvem essa tensão.

Proibido: resumir respostas, listar campos, frases genéricas do tipo
"seu estilo é único" ou "vamos descobrir seu estilo".

Depois do summary, faça a leitura prática de silhueta usando apenas
os dados fornecidos (sem análise visual e sem diagnóstico médico).

JSON:
{
  "summary": "3 a 5 parágrafos densos, específicos e estratégicos",
  "tipo_corporal": "somente se houver dado; caso contrário omita o campo",
  "descricao_tipo": "interpretação prática",
  "proporcoes": "orientação baseada nos dados",
  "pontos_fortes": ["mínimo 3"],
  "pontos_de_atencao": ["mínimo 3"],
  "silhueta_ideal": "cortes e proporções",
  "dicas_gerais": ["mínimo 5"],
  "perfil_cliente": "síntese estratégica",
  "principais_descobertas": ["3 a 5"],
  "transformacao_proposta": "mudança concreta"
}

CONTEXTO:
${ctx}
`,

  strategy: (ctx) => `
Construa a ESTRATÉGIA DE IMAGEM com exatamente SEIS eixos, nesta ordem:
1. Presença profissional
2. Silhueta e caimento
3. Paleta e contraste
4. Materiais e acabamento
5. Dress code e ocasiões
6. Consistência pessoal

Cada eixo precisa de diagnóstico específico deste cliente, objetivo
claro, no mínimo 3 aplicações concretas (peça, cor, tecido, corte ou
ação real) e prioridade ("alta", "média" ou "baixa").
Nenhum eixo pode ser genérico ou intercambiável com outro cliente.

JSON:
{
  "titulo": "Estratégia de Imagem",
  "intro": "parágrafo introdutório específico",
  "eixos": [
    {
      "nome": "Presença profissional",
      "diagnostico": "diagnóstico específico",
      "objetivo": "objetivo",
      "aplicacao": ["ação concreta", "ação concreta", "ação concreta"],
      "prioridade": "alta"
    }
  ],
  "regra_central": "uma frase estratégica específica para este cliente"
}

Repita a estrutura acima para os 6 eixos, com os nomes exatos listados.

CONTEXTO:
${ctx}
`,

  color: (ctx) => `
Construa a estratégia cromática pessoal.

FORMATO DE SAÍDA — OBRIGATÓRIO E SEM EXCEÇÃO:
- Responda EXCLUSIVAMENTE com um único objeto JSON válido (RFC 8259).
- O primeiro caractere da resposta deve ser "{" e o último deve ser "}".
- NÃO use Markdown.
- NÃO use blocos de código nem \`\`\`json.
- NÃO escreva nenhum texto, título, comentário ou observação antes do JSON.
- NÃO escreva nenhum texto, resumo ou observação depois do JSON.
- NÃO use comentários (// ou /* */).
- NÃO use JSON5, aspas simples, chaves sem aspas ou valores não citados.
- NÃO use trailing comma antes de "}" ou "]".
- Todas as chaves e todas as strings devem usar aspas duplas JSON válidas.
- Quebras de linha dentro de strings devem ser escritas como \\n.
- Use exatamente o schema abaixo, sem inventar novos campos.

NÃO invente estação nem subtom. Se não houver dados suficientes de
pele, cabelo e olhos, OMITA os campos "estacao", "subtipo" e
"subtom_pele" e construa mesmo assim uma estratégia cromática completa
e utilizável a partir do estilo, rotina, clima e preferências.

A seção nunca pode ficar vazia.

JSON:
{
  "estacao": "somente se houver dados suficientes; senão omita",
  "subtipo": "somente se houver dados suficientes; senão omita",
  "subtom_pele": "somente se informado; senão omita",
  "descricao_coloracao": "interpretação prática",
  "paleta_cores_ideais": {
    "base": ["3 cores"],
    "suporte": ["3 cores"],
    "destaque": ["3 cores"]
  },
  "cores_evitar": ["mínimo 3, com motivo prático embutido"],
  "metais_ideais": "recomendação",
  "contraste_ideal": "baixo, médio ou alto + explicação",
  "aplicacao": [
    {
      "cor": "cor",
      "pecas": ["peça 1", "peça 2"],
      "motivo": "motivo"
    }
  ],
  "combinacoes_reais": ["mínimo 5 combinações completas de look"],
  "dicas_coloracao": "orientação prática"
}

Mínimo 6 itens em "aplicacao".

CONTEXTO:
${ctx}
`,

  style: (ctx) => `
Construa a assinatura visual pessoal. Não entregue apenas nomes de
estilos: explique silhueta, materiais, cores, detalhes e peças que
constroem essa identidade, e o que a enfraquece.

JSON:
{
  "estilo_predominante": "estilo",
  "estilos_secundarios": ["estilo", "estilo"],
  "descricao_estilo": "interpretação",
  "palavras_chave": ["mínimo 5"],
  "referencias_visuais": ["direções concretas"],
  "elementos_essenciais": ["mínimo 6"],
  "elementos_evitar": ["mínimo 4"],
  "assinatura_visual": "frase concreta",
  "dna_visual": {
    "silhueta": "cortes",
    "texturas": "materiais",
    "cores": "direção cromática",
    "detalhes": "acabamentos"
  },
  "dicas_estilo": ["mínimo 6"],
  "ocasioes": [
    {
      "ocasiao": "ocasião",
      "look": ["peça", "peça", "calçado"],
      "observacao": "ajuste"
    }
  ]
}

CONTEXTO:
${ctx}
`,

  modeling: (ctx) => `
Construa um guia técnico de modelagem e tecidos.
Proibidas frases vagas como "use roupas que valorizem seu corpo".

Cada recomendação precisa conter peça, modelagem, comprimento,
estrutura, tecido, motivo e o que evitar.

JSON:
{
  "decotes_ideais": ["mínimo 4"],
  "decotes_evitar": ["mínimo 3"],
  "mangas_ideais": ["mínimo 4"],
  "comprimentos_ideais": ["mínimo 4"],
  "cintura_ideal": "orientação",
  "modelagens_superiores": "orientação",
  "modelagens_inferiores": "orientação",
  "tecidos_recomendados": ["mínimo 5"],
  "tecidos_evitar": ["mínimo 3"],
  "estampas_ideais": ["mínimo 3"],
  "recomendacoes": [
    {
      "peca": "peça específica",
      "modelagem": "modelagem",
      "comprimento": "comprimento",
      "estrutura": "estrutura",
      "tecido": "tecido",
      "motivo": "justificativa",
      "evitar": "o que evitar"
    }
  ],
  "reforcar": ["mínimo 4"],
  "evitar": ["mínimo 4"],
  "sazonalidade": {
    "quente": "orientação",
    "frio": "orientação"
  },
  "dicas_modelagem": "ajustes prioritários"
}

Mínimo 6 recomendações.

CONTEXTO:
${ctx}
`,

  essentials: (ctx) => `
Construa um guarda-roupa estratégico realista com EXATAMENTE 16 peças reais.

Cada peça deve ser nomeada com especificidade, por exemplo
"camisa Oxford branca de corte regular" ou "chino areia de algodão
com leve elastano". Nunca use categorias genéricas.

Você DEVE retornar exatamente 16 objetos na lista "pecas_essenciais".
Considere essas 16 peças como uma lista fechada e completa.
NÃO retorne 8, 9, 10, 11, 17, 18, 19 ou 20 peças.

JSON:
{
  "pecas_essenciais": [
    {
      "peca": "nome específico",
      "nome": "nome específico",
      "cor": "cor",
      "categoria": "categoria",
      "ocasiao": ["ocasião"],
      "occasion": ["ocasião"],
      "prioridade": "alta, média ou baixa",
      "priority": "alta, média ou baixa",
      "fit": "modelagem",
      "material": "material",
      "porque": "motivo",
      "reason": "motivo",
      "combinations": ["combinação 1", "combinação 2"]
    }
  ],
  "acessorios": [
    {
      "tipo": "acessório específico",
      "material": "material",
      "cor": "cor",
      "motivo": "motivo"
    }
  ],
  "prioridades": ["ordem de compra"]
}

REGRAS: exatamente 16 peças; mínimo 5 acessórios; cada peça com 2+ combinações; respeite orçamento, clima,
ocasiões e estilo; não contradiga os dados do cliente.

CONTEXTO:
${ctx}
`,

  capsule: (ctx) => `
Monte a cápsula com 10 a 15 looks completos, coerentes com as peças
do guarda-roupa estratégico, com a formalidade, o clima e as ocasiões
do cliente. Cada look precisa de no mínimo 3 peças e não pode repetir
outro look.

JSON:
{
  "conceito_capsula": "conceito",
  "pecas_capsula": ["peças reais"],
  "looks": [
    {
      "name": "nome",
      "occasion": "ocasião",
      "pieces": ["peça", "peça", "calçado"],
      "colors": ["cor", "cor"],
      "whyItWorks": "explicação"
    }
  ],
  "looks_trabalho": ["looks"],
  "looks_casual": ["looks"],
  "looks_eventos": ["looks"],
  "viagem": {
    "duracao": "somente se aplicável",
    "mala": ["peças"],
    "como_combinar": "estratégia"
  }
}

CONTEXTO:
${ctx}
`,

  final: (ctx) => `
Construa o encerramento estratégico da consultoria. Não faça plano de
negócio e não repita literalmente as seções anteriores: sintetize
decisões e transforme-as em ações de imagem pessoal.

JSON:
{
  "summary": "síntese final",
  "perfil_cliente": "síntese",
  "principais_descobertas": ["mínimo 5"],
  "transformacao_proposta": "transformação concreta",
  "shopping_list": {
    "buy_now": ["mínimo 4"],
    "buy_later": ["mínimo 4"],
    "refinement": ["mínimo 3"]
  },
  "proximos_passos": [
    "0-30 dias: ação",
    "0-30 dias: ação",
    "0-30 dias: ação",
    "31-60 dias: ação",
    "31-60 dias: ação",
    "31-60 dias: ação",
    "61-90 dias: ação",
    "61-90 dias: ação",
    "61-90 dias: ação"
  ],
  "plano_30_60_90": {
    "d30": ["ação", "ação", "ação"],
    "d60": ["ação", "ação", "ação"],
    "d90": ["ação", "ação", "ação"]
  },
  "nota_final": "encerramento pessoal e prático"
}

Exatamente 9 itens em "proximos_passos", com os prefixos exatos.

CONTEXTO:
${ctx}
`,
};

const BANNED_TERMS = [
  "conteúdo em consolidação",
  "conteudo em consolidacao",
  "não informado",
  "nao informado",
  "não foi informado",
  "peça coringa",
  "camisa versátil",
  "calça elegante",
  "campanha",
  "lançamento",
  "fornecedor",
  "protótipo",
  "mvp",
  "roadmap",
  "stakeholder",
  "undefined",
  "lorem ipsum",
];

const isFilledString = (value: unknown): boolean => {
  if (typeof value !== "string") return false;

  const trimmed = value.trim();

  if (!trimmed) return false;

  return ![
    "-",
    "—",
    "n/a",
    "na",
    "null",
  ].includes(trimmed.toLowerCase());
};

const hasContent = (value: unknown): boolean => {
  if (value == null) return false;

  if (typeof value === "string") {
    return isFilledString(value);
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some(hasContent);
  }

  if (typeof value === "object") {
    return Object.values(value as Q).some(hasContent);
  }

  return false;
};

const strList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item) => hasContent(item))
    : [];

function requireFields(
  section: SectionName,
  data: Q,
  fields: string[],
) {
  for (const field of fields) {
    if (!hasContent(data?.[field])) {
      throw new Error(
        `[${section}] campo obrigatório "${field}" vazio ou ausente`,
      );
    }
  }
}

function requireMinList(
  section: SectionName,
  data: Q,
  field: string,
  min: number,
) {
  const list = strList(data?.[field]);

  if (list.length < min) {
    throw new Error(
      `[${section}] "${field}" precisa de ${min}+ itens; recebido ${list.length}`,
    );
  }
}

function validateNoBannedContent(
  section: SectionName,
  value: unknown,
) {
  const serialized = JSON.stringify(value ?? {}).toLowerCase();

  for (const term of BANNED_TERMS) {
    if (serialized.includes(term)) {
      throw new Error(
        `[${section}] conteúdo proibido detectado: "${term}"`,
      );
    }
  }
}

function validateSection(section: SectionName, data: Q) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    throw new Error(
      `[${section}] resposta não é um objeto JSON`,
    );
  }

  if (!hasContent(data)) {
    throw new Error(`[${section}] resposta vazia`);
  }

  validateNoBannedContent(section, data);

  if (section === "body") {
    requireFields(section, data, [
      "summary",
      "proporcoes",
      "silhueta_ideal",
      "perfil_cliente",
      "transformacao_proposta",
    ]);

    if (text(data.summary).length < 600) {
      throw new Error(
        "[body] summary curto demais: escreva de 3 a 5 parágrafos densos",
      );
    }

    requireMinList(section, data, "pontos_fortes", 3);
    requireMinList(section, data, "pontos_de_atencao", 3);
    requireMinList(section, data, "dicas_gerais", 5);
    requireMinList(section, data, "principais_descobertas", 3);

    return;
  }

  if (section === "strategy") {
    const expected = [
      "presença profissional",
      "silhueta e caimento",
      "paleta e contraste",
      "materiais e acabamento",
      "dress code e ocasiões",
      "consistência pessoal",
    ];

    const axes = Array.isArray(data.eixos)
      ? data.eixos
      : [];

    if (axes.length !== 6) {
      throw new Error(
        `[strategy] devem existir exatamente 6 eixos; recebido ${axes.length}`,
      );
    }

    requireFields(section, data, [
      "intro",
      "regra_central",
    ]);

    axes.forEach((axis: Q, index: number) => {
      const label = `eixo ${index + 1}`;

      if (!hasContent(axis?.nome)) {
        throw new Error(`[strategy] ${label} sem nome`);
      }

      if (
        !expected.includes(
          text(axis.nome).toLowerCase(),
        )
      ) {
        throw new Error(
          `[strategy] ${label} com nome inesperado: "${text(axis.nome)}"`,
        );
      }

      if (!hasContent(axis?.diagnostico)) {
        throw new Error(
          `[strategy] ${label} sem diagnóstico`,
        );
      }

      if (!hasContent(axis?.objetivo)) {
        throw new Error(
          `[strategy] ${label} sem objetivo`,
        );
      }

      if (!hasContent(axis?.prioridade)) {
        throw new Error(
          `[strategy] ${label} sem prioridade`,
        );
      }

      if (strList(axis?.aplicacao).length < 3) {
        throw new Error(
          `[strategy] ${label} precisa de 3+ aplicações concretas`,
        );
      }
    });

    return;
  }

  if (section === "color") {
    requireFields(section, data, [
      "descricao_coloracao",
      "contraste_ideal",
      "metais_ideais",
      "dicas_coloracao",
    ]);

    const palette = data.paleta_cores_ideais || {};

    for (const key of [
      "base",
      "suporte",
      "destaque",
    ]) {
      if (strList(palette[key]).length < 3) {
        throw new Error(
          `[color] paleta "${key}" precisa de 3+ cores`,
        );
      }
    }

    requireMinList(section, data, "cores_evitar", 3);
    requireMinList(section, data, "combinacoes_reais", 5);

    const applications = Array.isArray(data.aplicacao)
      ? data.aplicacao
      : [];

    if (applications.length < 6) {
      throw new Error(
        `[color] mínimo de 6 aplicações; recebido ${applications.length}`,
      );
    }

    applications.forEach((item: Q, index: number) => {
      if (!hasContent(item?.cor)) {
        throw new Error(
          `[color] aplicação ${index + 1} sem cor`,
        );
      }

      if (strList(item?.pecas).length < 1) {
        throw new Error(
          `[color] aplicação ${index + 1} sem peças`,
        );
      }

      if (!hasContent(item?.motivo)) {
        throw new Error(
          `[color] aplicação ${index + 1} sem motivo`,
        );
      }
    });

    return;
  }

  if (section === "style") {
    requireFields(section, data, [
      "estilo_predominante",
      "descricao_estilo",
      "assinatura_visual",
      "dna_visual",
    ]);

    const dna = data.dna_visual || {};

    for (const key of [
      "silhueta",
      "texturas",
      "cores",
      "detalhes",
    ]) {
      if (!hasContent(dna[key])) {
        throw new Error(
          `[style] dna_visual.${key} vazio`,
        );
      }
    }

    requireMinList(section, data, "palavras_chave", 5);
    requireMinList(section, data, "elementos_essenciais", 6);
    requireMinList(section, data, "elementos_evitar", 4);
    requireMinList(section, data, "dicas_estilo", 6);

    return;
  }

  if (section === "modeling") {
    requireFields(section, data, [
      "modelagens_superiores",
      "modelagens_inferiores",
      "cintura_ideal",
      "dicas_modelagem",
    ]);

    requireMinList(section, data, "tecidos_recomendados", 5);
    requireMinList(section, data, "tecidos_evitar", 3);
    requireMinList(section, data, "reforcar", 4);
    requireMinList(section, data, "evitar", 4);

    const recommendations = Array.isArray(
      data.recomendacoes,
    )
      ? data.recomendacoes
      : [];

    if (recommendations.length < 6) {
      throw new Error(
        `[modeling] mínimo de 6 recomendações; recebido ${recommendations.length}`,
      );
    }

    recommendations.forEach(
      (item: Q, index: number) => {
        for (const field of [
          "peca",
          "modelagem",
          "tecido",
          "motivo",
          "evitar",
        ]) {
          if (!hasContent(item?.[field])) {
            throw new Error(
              `[modeling] recomendação ${index + 1} sem "${field}"`,
            );
          }
        }
      },
    );

    return;
  }

  if (section === "essentials") {
    const pieces = Array.isArray(
      data.pecas_essenciais,
    )
      ? data.pecas_essenciais
      : [];

    if (pieces.length < 12 || pieces.length > 20) {
      throw new Error(
        `[essentials] esperado entre 12 e 20 peças; recebido ${pieces.length}`,
      );
    }

    pieces.forEach((piece: Q, index: number) => {
      const name = piece?.peca ?? piece?.nome;

      if (!hasContent(name)) {
        throw new Error(
          `[essentials] peça ${index + 1} sem nome`,
        );
      }

      for (const field of [
        "cor",
        "categoria",
        "fit",
        "material",
      ]) {
        if (!hasContent(piece?.[field])) {
          throw new Error(
            `[essentials] peça ${index + 1} sem "${field}"`,
          );
        }
      }

      if (
        !hasContent(
          piece?.prioridade ?? piece?.priority,
        )
      ) {
        throw new Error(
          `[essentials] peça ${index + 1} sem prioridade`,
        );
      }

      if (
        !hasContent(
          piece?.porque ?? piece?.reason,
        )
      ) {
        throw new Error(
          `[essentials] peça ${index + 1} sem motivo`,
        );
      }

      const occasions =
        strList(piece?.ocasiao).length ||
        strList(piece?.occasion).length;

      if (!occasions) {
        throw new Error(
          `[essentials] peça ${index + 1} sem ocasião`,
        );
      }

      if (
        strList(piece?.combinations).length < 2
      ) {
        throw new Error(
          `[essentials] peça ${index + 1} precisa de 2+ combinações`,
        );
      }
    });

    const accessories = Array.isArray(
      data.acessorios,
    )
      ? data.acessorios
      : [];

    if (accessories.length < 5) {
      throw new Error(
        `[essentials] mínimo de 5 acessórios; recebido ${accessories.length}`,
      );
    }

    accessories.forEach(
      (item: Q, index: number) => {
        for (const field of [
          "tipo",
          "material",
          "cor",
          "motivo",
        ]) {
          if (!hasContent(item?.[field])) {
            throw new Error(
              `[essentials] acessório ${index + 1} sem "${field}"`,
            );
          }
        }
      },
    );

    return;
  }

  if (section === "capsule") {
    requireFields(section, data, [
      "conceito_capsula",
    ]);

    const looks = Array.isArray(data.looks)
      ? data.looks
      : [];

    if (looks.length < 10 || looks.length > 15) {
      throw new Error(
        `[capsule] esperado entre 10 e 15 looks; recebido ${looks.length}`,
      );
    }

    const seen = new Set<string>();

    looks.forEach((look: Q, index: number) => {
      if (!hasContent(look?.name)) {
        throw new Error(
          `[capsule] look ${index + 1} sem nome`,
        );
      }

      if (!hasContent(look?.occasion)) {
        throw new Error(
          `[capsule] look ${index + 1} sem ocasião`,
        );
      }

      const pieces = strList(look?.pieces);

      if (pieces.length < 3) {
        throw new Error(
          `[capsule] look ${index + 1} precisa de 3+ peças`,
        );
      }

      if (!hasContent(look?.whyItWorks)) {
        throw new Error(
          `[capsule] look ${index + 1} sem justificativa`,
        );
      }

      const signature = pieces
        .map((p) => p.toLowerCase().trim())
        .sort()
        .join("|");

      if (seen.has(signature)) {
        throw new Error(
          `[capsule] look ${index + 1} é repetição de outro look`,
        );
      }

      seen.add(signature);
    });

    return;
  }

  if (section === "final") {
    requireFields(section, data, [
      "summary",
      "perfil_cliente",
      "transformacao_proposta",
      "nota_final",
    ]);

    requireMinList(
      section,
      data,
      "principais_descobertas",
      5,
    );

    const steps = strList(
      data.proximos_passos,
    );

    if (steps.length !== 9) {
      throw new Error(
        `[final] devem existir exatamente 9 ações; recebido ${steps.length}`,
      );
    }

    const count = (prefix: string) =>
      steps.filter((s) => s.startsWith(prefix)).length;

    if (count("0-30 dias:") !== 3) {
      throw new Error(
        "[final] devem existir 3 ações de 0-30 dias",
      );
    }

    if (count("31-60 dias:") !== 3) {
      throw new Error(
        "[final] devem existir 3 ações de 31-60 dias",
      );
    }

    if (count("61-90 dias:") !== 3) {
      throw new Error(
        "[final] devem existir 3 ações de 61-90 dias",
      );
    }

    const plan = data.plano_30_60_90 || {};

    for (const key of [
      "d30",
      "d60",
      "d90",
    ]) {
      if (strList(plan[key]).length < 3) {
        throw new Error(
          `[final] plano_30_60_90.${key} precisa de 3+ ações`,
        );
      }
    }

    const shopping = data.shopping_list || {};

    if (strList(shopping.buy_now).length < 4) {
      throw new Error(
        "[final] buy_now precisa de 4+ itens",
      );
    }

    if (strList(shopping.buy_later).length < 4) {
      throw new Error(
        "[final] buy_later precisa de 4+ itens",
      );
    }

    if (strList(shopping.refinement).length < 3) {
      throw new Error(
        "[final] refinement precisa de 3+ itens",
      );
    }
  }
}

function isSectionComplete(
  section: SectionName,
  value: unknown,
): boolean {
  if (!hasContent(value)) return false;

  try {
    validateSection(section, value as Q);
    return true;
  } catch {
    return false;
  }
}

function getErrorStatus(
  message: string,
): number | null {
  // Rate limit só é definitivo quando TODOS os provedores estão limitados.
  if (/all_providers_rate_limited/.test(message)) {
    return 429;
  }

  if (
    /\b401\b/.test(message) ||
    /wrong api key/i.test(message) ||
    /API_KEY_INVALID/i.test(message)
  ) {
    return 401;
  }

  if (/\b402\b/.test(message)) {
    return 402;
  }

  return null;
}


function getRetryAfter(message: string): number {
  const match = message.match(
    /(?:retry[_ -]?after[=: ]+|retry in\s+)([\d.]+)s?/i,
  );

  if (match) {
    const seconds = Number(match[1]);

    if (Number.isFinite(seconds)) {
      return Math.ceil(
        Math.min(
          Math.max(seconds, 5),
          60,
        ),
      );
    }
  }

  return 15;
}

async function generateSection(
  diagnosisId: string,
  section: SectionName,
  context: string,
): Promise<Q> {
  await supabase
    .from("diagnoses")
    .update({
      status: "processing",
      processing_step: section,
    })
    .eq("id", diagnosisId);

  let lastError = "";
  const maxAttempts = section === "essentials" ? 3 : 2;

  console.log(`[process-diagnosis] diagnosis=${diagnosisId} section=${section} started`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[process-diagnosis] diagnosis=${diagnosisId} section=${section} attempt=${attempt}`);
      let correction = "";
      if (lastError) {
        if (section === "essentials" && (lastError.includes("pecas_essenciais") || lastError.includes("[essentials] esperado entre 12 e 20 peças"))) {
          const match = lastError.match(/recebido (\d+)/);
          const received = match ? match[1] : "X";
          correction = `
A resposta anterior foi rejeitada porque a lista pecas_essenciais possui menos de 12 itens.

ERRO:
[essentials] esperado entre 12 e 20 peças; recebido ${received}

Gere novamente a seção COMPLETA com EXATAMENTE 16 peças em pecas_essenciais. Não reutilize uma resposta parcial.

OBRIGATÓRIO:
- pecas_essenciais deve conter EXATAMENTE 16 objetos.
- NÃO retorne 8, 9, 10 ou 11 peças.
- Cada objeto precisa conter todos os campos obrigatórios.
- Cada peça precisa ter pelo menos 2 combinações.
- acessórios deve possuir pelo menos 5 objetos.
- Não escreva explicações fora do JSON.
- Retorne SOMENTE JSON válido.`;
        } else {
          correction = `
A tentativa anterior foi rejeitada.

ERRO:
${lastError}

Corrija somente o problema indicado, mantendo JSON válido, todos os
campos obrigatórios, as quantidades mínimas, a especificidade e a
coerência com o contexto. Não reduza a qualidade da resposta.`;
        }
      }

      const result = await callAI({
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content:
              PROMPTS[section](context) +
              correction,
          },
        ],
        responseFormat: "json_object",
        temperature: 0.45,
        maxTokens:
          SECTION_MAX_TOKENS[section],
      });

      const parsed: Q = parseAIJson(result);

      validateSection(section, parsed);

      console.log(
        `[process-diagnosis] diagnosis=${diagnosisId} section=${section} valid=true attempt=${attempt}`,
      );

      return parsed;
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        `[process-diagnosis] diagnosis=${diagnosisId} section=${section} attempt=${attempt} error=${lastError}`,
      );

      const status =
        getErrorStatus(lastError);

      if (status === 401 || status === 402) {
        throw new Error(
          `AI_ERROR_${status}: ${lastError}`,
        );
      }

      if (status === 429) {
        const waitSeconds = getRetryAfter(lastError) || 15;

        // Não mantém a Edge Function aberta durante uma janela longa de rate limit.
        // O frontend preserva a seção, aguarda este intervalo e retoma a mesma chamada.
        throw new Error(
          `AI_RATE_LIMIT:retry_after=${waitSeconds}:${lastError}`,
        );
      }

    }
  }

  throw new Error(
    `AI section "${section}" failed: ${lastError}`,
  );
}

async function saveSection(
  diagnosisId: string,
  section: SectionName,
  result: Q,
) {
  if (
    !isSectionComplete(section, result)
  ) {
    throw new Error(
      `[${section}] recusado: conteúdo inválido não será salvo`,
    );
  }

  const { error } = await supabase
    .from("diagnoses")
    .update({
      [SECTION_COLUMN[section]]: result,
    })
    .eq("id", diagnosisId);

  if (error) {
    throw new Error(
      `Erro ao salvar seção ${section}: ${error.message}`,
    );
  }
}

async function getDiagnosis(
  diagnosisId: string,
) {
  const { data, error } = await supabase
    .from("diagnoses")
    .select(SELECT_COLUMNS)
    .eq("id", diagnosisId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Erro ao buscar diagnóstico: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      `NOT_FOUND: Diagnóstico ${diagnosisId} não encontrado`,
    );
  }

  return data as Q;
}

function getCompletedSections(
  diagnosis: Q,
): SectionName[] {
  return SECTION_ORDER.filter(
    (section) =>
      isSectionComplete(
        section,
        diagnosis[
          SECTION_COLUMN[section]
        ],
      ),
  );
}

function getNextSection(
  diagnosis: Q,
): SectionName | null {
  for (const section of SECTION_ORDER) {
    if (
      !isSectionComplete(
        section,
        diagnosis[
          SECTION_COLUMN[section]
        ],
      )
    ) {
      return section;
    }
  }

  return null;
}

function contextForSection(
  section: SectionName,
  context: ReturnType<typeof buildContext>,
) {
  switch (section) {
    case "body":
      return context.opening;

    case "color":
    case "modeling":
      return context.physical;

    case "strategy":
    case "style":
      return context.identity;

    default:
      return context.shopping;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  let diagnosisId = "";
  let currentSection = "";


  try {
    const body = await req
      .json()
      .catch(() => ({}));

    diagnosisId =
      body?.diagnosisId || "";

    if (!diagnosisId) {
      return jsonResponse(
        {
          success: false,
          error: "diagnosisId is required",
        },
        400,
      );
    }

    const diagnosis =
      await getDiagnosis(diagnosisId);

    const questionnaire =
      diagnosis.questionnaire ||
      body.questionnaire ||
      {};

    const context =
      buildContext(questionnaire);

    if (!context.full.trim()) {
      return jsonResponse(
        {
          success: false,
          retryable: false,
          diagnosisId,
          error:
            "O questionário não possui dados suficientes para gerar o diagnóstico.",
        },
        422,
      );
    }

    let section =
      body?.section as
        | SectionName
        | undefined;

    if (
      section &&
      !SECTION_ORDER.includes(section)
    ) {
      return jsonResponse(
        {
          success: false,
          diagnosisId,
          error: `Seção inválida: ${section}`,
          allowed_sections:
            SECTION_ORDER,
        },
        400,
      );
    }

    if (!section) {
      section =
        getNextSection(diagnosis) ??
        undefined;
    }

    if (!section) {
      await supabase
        .from("diagnoses")
        .update({
          status: "completed",
          processing_step: "completed",
        })
        .eq("id", diagnosisId);

      return jsonResponse({
        success: true,
        diagnosisId,
        completed: true,
        nextSection: null,
        completedSections:
          SECTION_ORDER,
        sections_generated:
          SECTION_ORDER,
        totalSections:
          SECTION_ORDER.length,
      });
    }

    if (
      isSectionComplete(
        section,
        diagnosis[
          SECTION_COLUMN[section]
        ],
      )
    ) {
      return jsonResponse({
        success: true,
        diagnosisId,
        section,
        alreadyCompleted: true,
        completedSections:
          getCompletedSections(
            diagnosis,
          ),
        nextSection:
          getNextSection(diagnosis),
        totalSections:
          SECTION_ORDER.length,
      });
    }

    currentSection = section;

    console.log(
      `[process-diagnosis] diagnosis=${diagnosisId} section=${section} started`,
    );


    const result =
      await generateSection(
        diagnosisId,
        section,
        contextForSection(
          section,
          context,
        ),
      );

    await saveSection(
      diagnosisId,
      section,
      result,
    );

    const updated =
      await getDiagnosis(
        diagnosisId,
      );

    const completedSections =
      getCompletedSections(
        updated,
      );

    const nextSection =
      getNextSection(updated);

    const completed =
      nextSection === null &&
      completedSections.length ===
        SECTION_ORDER.length;

    await supabase
      .from("diagnoses")
      .update(
        completed
          ? {
              status: "completed",
              processing_step:
                "completed",
            }
          : {
              status: "processing",
              processing_step:
                nextSection,
            },
      )
      .eq("id", diagnosisId);

    console.log(
      `[process-diagnosis] diagnosis=${diagnosisId} section=${section} completed`,
    );

    return jsonResponse({
      success: true,
      diagnosisId,
      section,
      completed,
      nextSection: completed
        ? null
        : nextSection,
      completedSections,
      totalSections:
        SECTION_ORDER.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      `[process-diagnosis] FATAL diagnosis=${diagnosisId} error=${message}`,
    );

    if (
      message.startsWith(
        "NOT_FOUND:",
      )
    ) {
      return jsonResponse(
        {
          success: false,
          retryable: false,
          diagnosisId,
          error: message.replace(
            "NOT_FOUND: ",
            "",
          ),
        },
        404,
      );
    }

    if (
      message.startsWith(
        "AI_RATE_LIMIT:",
      )
    ) {
      const match =
        message.match(
          /retry_after=(\d+)/,
        );

      return jsonResponse(
        {
          success: false,
          retryable: true,
          rateLimited: true,
          diagnosisId,
          section: currentSection || undefined,
          retryAfter: match
            ? Number(match[1])
            : 15,
          error:
            "A IA atingiu temporariamente o limite de requisições. Tente novamente após o intervalo indicado.",
        },
        429,
      );
    }

    if (
      message.startsWith(
        "AI_ERROR_401:",
      )
    ) {
      return jsonResponse(
        {
          success: false,
          retryable: false,
          diagnosisId,
          error:
            "A chave da API de IA foi rejeitada. Verifique o secret configurado na Edge Function.",
        },
        502,
      );
    }

    if (
      message.startsWith(
        "AI_ERROR_402:",
      )
    ) {
      return jsonResponse(
        {
          success: false,
          retryable: false,
          diagnosisId,
          error:
            "O provedor de IA recusou a requisição por limite de crédito ou cobrança.",
        },
        502,
      );
    }

    if (diagnosisId) {
      // Se for um erro de validação de conteúdo da seção, NÃO marcamos como failed definitivo
      // para permitir que o frontend ou uma nova tentativa recupere o estado.
      const isValidationError = message.includes("[") && message.includes("]");
      
      if (!isValidationError) {
        await supabase
          .from("diagnoses")
          .update({
            status: "failed",
            processing_step: "failed",
          })
          .eq("id", diagnosisId);
      } else {
        // Se for erro de validação, mantemos o step para que a retomada funcione
        await supabase
          .from("diagnoses")
          .update({
            status: "processing",
            processing_step: currentSection || "body",
          })
          .eq("id", diagnosisId);
      }
    }

    return jsonResponse(
      {
        success: false,
        retryable: true,
        diagnosisId,
        error: message,
      },
      500,
    );
  }
});
