# Correção do frontend do diagnóstico VIRUM

Nenhuma alteração em Edge Functions, prompts, banco, RLS ou secrets. Somente frontend.

## O que foi verificado no código atual

- `src/pages/NewDiagnosis.tsx` já tem um `processNext` sequencial que usa `nextSection`, mas: não existe recuperação após refresh (sempre inicia em `body`), não existe guarda contra execução duplicada, o `retryAfter` de 429 só é lido do objeto de erro, e qualquer erro não-429 grava `status: 'failed'` + sobrescreve `final_diagnosis` com o erro — o que descarta conteúdo e torna o diagnóstico não recuperável.
- As fotos são salvas como URL pública completa nas colunas `photo_front_url`, `photo_side_url`, `photo_back_url`, `photo_face_url` (o upload já chama `getPublicUrl`). Não é necessário remontar paths.
- `src/components/diagnosis/book/CoverSection.tsx` renderiza um bloco de marca genérico ("V I R U M / Digital Luxury Experience") no lugar das fotos do cliente.
- `src/pages/DiagnosisResult.tsx` monta o PDF clonando o livro renderizado na tela (`[data-pdf-source="virum-book"]`), e a lista `clientPhotos` está fixada em vazio. Portanto: corrigir a capa e os capítulos na tela corrige o PDF automaticamente.
- `src/components/diagnosis/book/chapters.ts` não tem capítulo dedicado à seção `strategy` e usa fallbacks derivados (`deriveSignature`, `deriveDna`, textos genéricos) mesmo quando há conteúdo real.
- A tabela `diagnoses` consultada pelas ferramentas não possui coluna `strategy_analysis` (colunas presentes: body_analysis, color_analysis, style_analysis, modeling_analysis, wardrobe_essentials, capsule_wardrobe, final_diagnosis). Como não podemos alterar o banco, o frontend lerá `strategy_analysis` quando existir no registro retornado e, se não existir, o capítulo de Estratégia usará `final_diagnosis.estrategia_imagem`. O primeiro passo da execução é confirmar em um diagnóstico real onde a Edge Function grava `strategy`.

## Alterações

### 1. `src/pages/NewDiagnosis.tsx` — orquestração
- Extrair uma única função `processDiagnosisSequentially(diagnosisId)` + `processNext(diagnosisId, section)`.
- Antes de iniciar: buscar o diagnóstico e derivar a próxima seção pendente a partir das colunas preenchidas e de `processing_step`; nunca regerar seção já salva.
- Guarda `processingRef` por `diagnosisId` para impedir cadeias concorrentes (StrictMode/refresh).
- Chamadas estritamente sequenciais (`await`), sem `Promise.all`.
- 429: ler `retryAfter` do corpo (tanto em resposta 200 quanto em erro), aguardar, repetir a MESMA seção, com limite de tentativas e backoff; não marcar `failed`.
- 500: reconsultar o diagnóstico; se a seção foi salva, seguir para a próxima; senão permitir retry controlado e limitado.
- 502: mensagem clara ao usuário, diagnóstico permanece recuperável.
- Remover a escrita de erro dentro de `final_diagnosis`; erros vão para o console e para o toast.
- Logs no formato `[NewDiagnosis] START|SUCCESS|COMPLETE|ERROR diagnosis=<id> section=<s> next=<s>`.

### 2. `src/components/diagnosis/book/CoverSection.tsx` — 4 fotos reais
- Renderizar as fotos reais do cliente (Frente, Lateral, Costas, Rosto) a partir das colunas `photo_*_url`, em composição premium de 4 quadros com rótulos.
- Slots sem foto simplesmente não são renderizados. Sem placeholder, sem imagem gerada, sem stock.
- Marcar os quadros com a classe `vr-photo` já reconhecida pelo paginador do PDF.

### 3. `src/components/diagnosis/book/chapters.ts` — 8 seções reais
- Adicionar/ajustar o capítulo de Estratégia de Imagem lendo `strategy_analysis` (`titulo`, `intro`, `eixos`, `regra_central`) com fallback para `final_diagnosis.estrategia_imagem`.
- Garantir mapeamento e renderização do conteúdo real das 8 seções na ordem: corpo → estratégia → cor → estilo → modelagem → essenciais → cápsula → final.
- Priorizar sempre o dado real; fallbacks derivados só quando o campo estiver realmente ausente. Nenhum texto tipo "Conteúdo em consolidação" quando houver dado.

### 4. `src/pages/DiagnosisResult.tsx` — PDF completo
- Reaproveitar a implementação atual (clone da tela + html2canvas). Alterações mínimas: incluir as fotos reais na apresentação do PDF via preload em data URL (o mecanismo `toDataUrl`/`dataUrlMap` já existe) e garantir que o clone inclua todos os capítulos visíveis.
- Nenhuma troca de biblioteca, nenhuma reescrita do paginador.

## Verificação
- Console mostra START/SUCCESS na ordem body → strategy → color → style → modeling → essentials → capsule → final, sem chamadas simultâneas.
- Refresh no meio do processamento retoma na seção pendente correta.
- Página de resultado mostra as 4 fotos reais na abertura e os 8 capítulos com conteúdo real.
- PDF baixado contém abertura com fotos e as 8 seções, sem placeholders.
