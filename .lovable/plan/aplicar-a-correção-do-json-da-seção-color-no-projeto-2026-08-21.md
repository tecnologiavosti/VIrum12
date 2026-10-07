# Aplicar a correção do JSON da seção `color` no projeto

Aplicar no repositório exatamente o arquivo já entregue no chat, sem deploy.

## Alteração

Somente `supabase/functions/process-diagnosis/index.ts`:

- Adicionar o parser único `parseAIJson` (com os auxiliares `isPlainObject`, `stripCodeFences`, `extractJsonObjectCandidates`, `removeTrailingCommas`, `escapeControlCharsInStrings`, `tryParseObject`).
- Substituir o `JSON.parse(result)` direto dentro de `generateSection` por `parseAIJson(result)`, antes de `validateSection`.
- Reforçar apenas o prompt da seção `color` com as regras de saída JSON estrita (sem Markdown, sem cercas de código, sem texto antes/depois, sem comentários, sem JSON5, sem trailing comma).

## Preservado sem mudanças

Provider e modelo atuais, `callAI`, fallback, retry, secrets, CORS, criação e persistência do diagnóstico, orquestração das 8 seções, validações existentes, contratos HTTP e integração com o frontend.

## Verificação

- Checagem de tipos/build do projeto após a escrita do arquivo.
- Nenhum deploy será executado; o deploy fica sob seu controle no Supabase.
