# Plano de Melhoria da Qualidade do Diagnóstico VIRUM

O objetivo é transformar a geração do diagnóstico de uma simples repetição de dados em uma **análise estratégica e interpretativa**, focada no cruzamento de informações (profissão, rotina, objetivos e restrições) para entregar uma consultoria personalizada de alto valor.

## Alterações Técnicas

### Backend (Edge Function: `process-diagnosis`)

1.  **Refatoração da Instrução do Sistema (System Prompt):**
    *   Reforçar o papel da IA como "Estrategista Chefe de Imagem".
    *   Implementar a regra de **Causa → Interpretação → Estratégia**.
    *   Exigir a identificação de conflitos (ex: desejo de autoridade vs. rotina de alto conforto).

2.  **Atualização dos Prompts de Seção:**
    *   **Análise Corporal:** Focar em como o biotipo impacta a escolha de silhuetas estratégicas, não apenas descrever medidas.
    *   **Coloração:** Relacionar a paleta ao ambiente profissional e objetivos de comunicação.
    *   **Estilo:** Cruzar dados de profissão, rotina e objetivos para definir a "Assinatura Visual".
    *   **Modelagens:** Justificar cada corte e tecido com base no biotipo E no clima/rotina.
    *   **Peças Essenciais:** Implementar a "Análise de Lacunas" (comparando o que o usuário já tem com o que ele precisa para o objetivo desejado).
    *   **Diagnóstico Final:** Sintetizar o cruzamento de todos os dados em uma estratégia mestre de 2-3 parágrafos.

3.  **Implementação de Regras de Qualidade Mínima:**
    *   Inclusão de diretrizes anti-repetição no prompt para evitar frases genéricas e "conclusões vazias".
    *   Exigir justificativas específicas para cada recomendação.

### Frontend (Visualização do Diagnóstico)

*   Nenhuma alteração de interface foi solicitada, mas os componentes já estão preparados para exibir o novo conteúdo enriquecido gerado pela IA.

## Detalhes Técnicos

*   **Arquivo alvo:** `supabase/functions/process-diagnosis/index.ts`.
*   **Lógica de Prompt:** Utilização de blocos de contexto enriquecidos que forçam a IA a realizar inferências estratégicas.
*   **Segurança:** Manter as restrições de RLS e o uso de chaves Cerebras via Gateway, conforme configurado.
