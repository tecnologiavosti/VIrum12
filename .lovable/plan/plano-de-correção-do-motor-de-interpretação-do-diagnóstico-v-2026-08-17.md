# Plano de Correção do Motor de Interpretação do Diagnóstico VIRUM

O objetivo é transformar o diagnóstico de um resumo organizado de respostas em uma análise estratégica e cruzada, focada em resolver conflitos e propor uma identidade visual coerente.

## 1. Auditoria e Preparação
- Analisar o fluxo de dados entre `mapToLegacyQuestionnaire.ts` e a Edge Function `process-diagnosis`.
- Garantir que todos os campos de "alta prioridade" (restrições, preferências reais, ambiente de trabalho) estejam sendo passados para a IA.

## 2. Refatoração do Motor de IA (`process-diagnosis`)
### Mudança de Paradigma no Prompt do Sistema
- Alterar a instrução principal da IA para agir como um estrategista de imagem, não um assistente administrativo.
- Implementar a "Camada de Interpretação Interna": a IA deve analisar padrões antes de gerar cada seção.
- Criar diretrizes para cruzar dados:
    - **Conforto vs. Autoridade**: Como gerar poder sem rigidez.
    - **Estilo Pessoal vs. Ambiente Profissional**: Harmonização de identidades.
    - **Orçamento vs. Ambição**: Priorização de peças de alto impacto.

### Reestruturação dos Prompts de Seção
- **Perfil de Imagem**: Focar na leitura pública e na "assinatura" que o homem transmite.
- **Diagnóstico Final**: Mudar para uma síntese estratégica com foco no "GAP" entre imagem atual e desejada.
- **Estratégia de Imagem**: Introduzir justificativas baseadas no "POR QUÊ" (Causa -> Efeito -> Ação).
- **Guarda-Roupa**: Interpretar as peças que o usuário já possui antes de recomendar novas (Análise de Lacunas).

## 3. Melhoria da Interface do Diagnóstico
- Atualizar os componentes de exibição (`SummarySection`, `StyleSection`, etc.) para destacar as interpretações estratégicas.
- Garantir que a relação entre os dados fornecidos e a recomendação seja visível para o usuário (ex: "Recomendamos X porque sua rotina Y exige Z").

## Detalhes Técnicos
- **Edge Function**: Atualizar `supabase/functions/process-diagnosis/index.ts` com os novos prompts e lógica de encadeamento de raciocínio.
- **Frontend**: Ajustar `DiagnosisResult.tsx` e componentes relacionados para renderizar os novos campos de estratégia e justificativa.
- **Verificação**: Comparar um diagnóstico gerado com o modelo anterior para garantir o nível de interpretação esperado.
