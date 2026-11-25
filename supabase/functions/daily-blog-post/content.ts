export type Keyword = { query: string; metric: string | null; kind: string };
export const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(
    /[^a-z0-9]+/g,
    " ",
  ).trim();
export const slugify = (s: string) =>
  normalize(s).replace(/ /g, "-").slice(0, 90);
const domains = ["gq.globo.com","esquire.com","menshealth.com","vogue.globo.com","elle.com.br","senac.br","sebrae.com.br","sp.senac.br","fashionrevolution.org","gov.br","pantone.com","fashionhistory.fitnyc.edu","si.edu","vam.ac.uk"];
export function trustedSource(link: unknown) {
  if (typeof link !== "string") return false;
  try {
    const u = new URL(link);
    return u.protocol === "https:" && !u.username && !u.password && !u.port &&
      domains.some((d) => u.hostname === d || u.hostname.endsWith("." + d));
  } catch {
    return false;
  }
}
export function parseKeywords(body: any): Keyword[] {
  const groups = body?.related_queries || {};
  return [
    ...(Array.isArray(groups.top) ? groups.top : []).map((r: any) => ({
      ...r,
      kind: "top",
    })),
    ...(Array.isArray(groups.rising) ? groups.rising : []).map((r: any) => ({
      ...r,
      kind: "rising",
    })),
  ]
    .filter((r) =>
      typeof r.query === "string" && r.query.trim().length >= 3 &&
      r.query.length <= 140
    )
    .map((r) => ({
      query: r.query.trim(),
      metric: typeof r.value === "string" ? r.value.slice(0, 30) : null,
      kind: r.kind,
    })).slice(0, 25);
}
export function selectKeyword(candidates: Keyword[], recent: string[]) {
  const previous = new Set(recent.map(normalize));
  return candidates.find((k) => !previous.has(normalize(k.query)) &&
    !/\b(faculdade|faculdades|graduacao|cursos?|concurso|salario|mestrado|doutorado|estagio|ead|nota de corte|quanto ganha|institutos?|hospital|endereco|telefone|valor|preco|unimed|convenio|gratuit[ao]s?|bradesco|amil|hapvida|plano de saude)\b/.test(normalize(k.query)));
}
export function keywordCovered(title: string, keyword: string) {
  const stop = new Set([
    "o",
    "a",
    "os",
    "as",
    "e",
    "de",
    "da",
    "do",
    "das",
    "dos",
    "que",
    "qual",
    "quais",
    "como",
    "em",
    "no",
    "na",
    "nos",
    "nas",
    "um",
    "uma",
    "para",
    "por",
    "com",
    "ao",
    "aos",
    "é",
    "ser",
  ]);
  const words = (text: string) =>
    normalize(text).split(" ").filter((w) => w.length > 1 && !stop.has(w));
  const terms = words(keyword);
  const heading = new Set(words(title));
  return terms.length > 0 && terms.every((term) => heading.has(term));
}
export function formatMarkdown(text: string) {
  return text.replace(/\r\n?/g, "\n").replace(/[ \t]+(#{2,3} )/g, "\n\n$1")
    .trim();
}
// Structural errors are distinct from editorial criteria that can be repaired.
export function articleFieldErrors(raw: any): string[] {
  if (!raw || typeof raw !== "object") {
    return ["A resposta deve ser um objeto JSON."];
  }
  const errors: string[] = [];
  const fields = [
    ["title", "Título", 200],
    ["excerpt", "Resumo", 2000],
    ["content", "Conteúdo", 28000],
  ] as const;
  for (const [field, label, max] of fields) {
    if (typeof raw[field] !== "string" || !raw[field].trim()) {
      errors.push(`${label}: informe um texto não vazio.`);
    } else if (raw[field].length > max) {
      errors.push(
        `${label}: máximo de ${max} caracteres; recebido ${raw[field].length}.`,
      );
    }
  }
  if (typeof raw.needs_review !== "boolean") {
    errors.push("needs_review deve ser true ou false.");
  }
  if (
    !Array.isArray(raw.review_reasons) ||
    raw.review_reasons.some((r: unknown) => typeof r !== "string")
  ) {
    errors.push("review_reasons deve ser uma lista de textos.");
  }
  return errors;
}

export function articleFormatIssues(raw: any): string[] {
  const issues: string[] = [];
  if (
    typeof raw?.title === "string" &&
    (raw.title.trim().length < 30 || raw.title.trim().length > 70)
  ) {
    issues.push(
      `Título: ajuste para 30 a 70 caracteres; recebido ${raw.title.trim().length}.`,
    );
  }
  if (
    typeof raw?.excerpt === "string" &&
    (raw.excerpt.trim().length < 100 || raw.excerpt.trim().length > 160)
  ) {
    issues.push(
      `Resumo: ajuste para 100 a 160 caracteres; recebido ${raw.excerpt.trim().length}.`,
    );
  }
  if (typeof raw?.content === "string") {
    const content = formatMarkdown(raw.content);
    const words = content ? content.split(/\s+/).length : 0;
    if (words < 500 || words > 1000) {
      issues.push(
        `Conteúdo: ajuste para 500 a 1000 palavras sem inventar fatos; recebido ${words}.`,
      );
    }
    if ((content.match(/^## /gm) || []).length < 3) {
      issues.push(
        "Conteúdo: inclua pelo menos três subtítulos iniciados com ##.",
      );
    }
  }
  return issues;
}

export function validateArticle(
  raw: any,
  keyword: string,
  sources: { title: string; url: string; snippet: string }[],
) {
  const fieldErrors = articleFieldErrors(raw);
  if (fieldErrors.length) {
    throw Error("O artigo retornou campos inválidos: " + fieldErrors.join(" "));
  }
  // No raw HTML, model-generated URLs, scripts or named medical authors.
  if (
    /<\/?[a-z][\s\S]*?>|https?:\/\/|www\.|javascript:|data:|\]\(|\]\[|^\s*\[[^\]]+\]:/im
      .test(raw.content)
  ) {
    throw Error(
      "O artigo contém links ou marcação não permitida. Tente gerar novamente.",
    );
  }
  raw = {
    ...raw,
    title: raw.title.trim(),
    excerpt: raw.excerpt.trim(),
    content: formatMarkdown(raw.content),
  };
  const formatIssues = articleFormatIssues(raw);
  raw.review_reasons = [
    ...new Set<string>([...raw.review_reasons, ...formatIssues, ...unsupportedQuantities(raw,sources)]),
  ];
  const wordCount = raw.content.split(/\s+/).length;
  const checks = [
    {
      label: "Título entre 30 e 70 caracteres",
      ok: raw.title.length >= 30 && raw.title.length <= 70,
    },
    {
      label: "Descrição entre 100 e 160 caracteres",
      ok: raw.excerpt.length >= 100 && raw.excerpt.length <= 160,
    },
    {
      label: "Tema da palavra-chave no título em português natural",
      ok: keywordCovered(raw.title, keyword),
    },
    {
      label: "Pelo menos três subtítulos",
      ok: (raw.content.match(/^## /gm) || []).length >= 3,
    },
    {
      label: "Texto entre 500 e 1000 palavras",
      ok: wordCount >= 500 && wordCount <= 1000,
    },
    {
      label: "Duas fontes editoriais consultadas",
      ok: sources.length >= 2,
    },
  ];
  const assessment = {
    checks,
    score: Math.round(checks.filter((c) => c.ok).length / checks.length * 100),
  };
  const references = sources.map((s) =>
    "- [" + s.title.replace(/[\[\]\n]/g, "") + "](" + s.url + ")"
  ).join("\n");
  return {
    title: raw.title.trim(),
    excerpt: raw.excerpt.trim(),
    content: raw.content.trim() + "\n\n## Fontes consultadas\n" +
      (references ||
        "Conteúdo editorial sem verificação externa nesta execução.") +
      "\n\n*Conteúdo editorial produzido com assistência de IA e revisão automatizada. Estilo e preferências são individuais.*",
    slug: slugify(raw.title),
    ready: sources.length >= 2 && !raw.needs_review &&
      raw.review_reasons.length === 0 && assessment.checks.every((c) =>
        c.ok ||
        c.label === "Tema da palavra-chave no título em português natural" ||
        c.label === "Palavra-chave no título"
      ),
    seo_data: {
      keyword,
      assessment,
      review_reasons: raw.review_reasons,
      sources: sources.map(({ title, url }) => ({ title, url })),
      generated_with_ai: true,
    },
  };
}

export function isEmptySearchResult(engine: string, result: any): boolean {
  if (result?.search_metadata?.status !== "Success") return false;
  if (engine === "google") {
    return result.error ===
      "Google hasn't returned any results for this query.";
  }
  return engine === "google_trends" &&
    result.error ===
      "Google Trends hasn't returned any results for this query.";
}

// Stay within the clinic's configured specialties and preserve genuine Trends data.
export async function findTrendCandidates(
  seeds: string[],
  recent: string[],
  query: (seed: string, timeout: number) => Promise<any>,
  onAttempt: (
    attempts: { seed: string; results: number; new_results: number }[],
  ) => Promise<void> = async () => {},
  deadline = Date.now() + 30000,
) {
  const unique = [...new Set(seeds.map((s) => s.trim()).filter(Boolean))].slice(
    0,
    3,
  );
  const attempts: { seed: string; results: number; new_results: number }[] = [];
  for (const seed of unique) {
    const remaining = deadline - Date.now();
    if (remaining < 1000) break;
    let result: any;
    try {
      result = await query(seed, Math.min(25000, remaining));
    } catch (error) {
      if (error instanceof Error && /429|401|403|cota|autoriz|configur/i.test(error.message)) throw error;
      attempts.push({ seed, results: 0, new_results: 0 });
      await onAttempt([...attempts]);
      // One slow Trends query must not abort the other configured specialties.
      continue;
    }
    const keywords = parseKeywords(result);
    const fresh = keywords.filter((k) => !!selectKeyword([k], recent));
    attempts.push({
      seed,
      results: keywords.length,
      new_results: fresh.length,
    });
    await onAttempt([...attempts]);
    if (fresh.length) return { seed, keywords, searches: attempts };
  }
  throw Error(
    "O Google Trends não retornou palavras-chave novas nas especialidades consultadas. Nenhuma tendência ou métrica foi inventada.",
  );
}

// Mechanical backstop: a source mentioning POP 030 does not substantiate a claim of 30%.
export function unsupportedQuantities(raw: any, sources: {snippet:string}[]): string[] {
  const pattern = /\b\d+(?:[.,]\d+)?\s*(?:%|[°º]\s*[CF]|mg|mcg|µg|ml)(?![a-z])/gi;
  const canonical = (value:string) => value.replace(/\s+/g,'').replace(/,/g,'.').replace(/º/g,'°').toLowerCase();
  const found = new Set(sources.flatMap(source => (source.snippet || '').match(pattern) || []).map(canonical));
  const unsupported = [...new Set(((String(raw?.title || '')+' '+String(raw?.excerpt || '')+' '+String(raw?.content || '')).match(pattern) || []).map(canonical))]
    .filter(quantity=>!found.has(quantity));
  return unsupported.map(quantity=>`Quantidade sem suporte explícito nas evidências: ${quantity}. Remova a afirmação ou forneça evidência direta.`);
}

/** Remove unsupported numeric claims before the independent audit; never approve here. */
export function repairMechanicalArticleFields(raw: any, sources: {snippet:string}[]) {
  if (!raw || typeof raw !== "object") return raw;
  let excerpt = raw.excerpt;
  if (typeof excerpt === "string" && excerpt.trim().length > 160) {
    const prefix = excerpt.trim().slice(0, 160);
    excerpt = prefix.replace(/\s+\S*$/, "").trim();
  }
  let content = raw.content;
  if (typeof content === "string") {
    const segmenter = new Intl.Segmenter("pt-BR", {granularity:"sentence"});
    content = content.split("\n").map((line: string) =>
      [...segmenter.segment(line)].map(part => part.segment)
        .filter(sentence => unsupportedQuantities({content:sentence}, sources).length === 0 && !/nossa marca/i.test(sentence))
        .join("")
    ).join("\n").replace(/\n{3,}/g, "\n\n");
  }
  return {...raw, excerpt, content};
}
