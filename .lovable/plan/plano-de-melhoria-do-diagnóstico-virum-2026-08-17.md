# Plano de Melhoria do Diagnóstico VIRUM

Este plano detalha a auditoria e a implementação da expansão do formulário de diagnóstico, garantindo maior profundidade nas recomendações sem duplicidade de dados e mantendo a integridade do sistema existente.

## Auditoria Técnica e Funcional

### 1. Mapeamento de Perguntas e Campos

| Área | Status Atual | Ação Proposta |
| :--- | :--- | :--- |
| **Identificação** | Idade (age_range). | Manter. |
| **Objetivos** | Momento de vida (life_moment), Objetivos de imagem (image_goals). | Expandir objetivos (transmitir/não transmitir). |
| **Rotina** | Predominante (routine_type), Frequência (weekly_dress), Onde precisa estar bem (well_dressed_places). | Adicionar Profissão (texto livre) e Ambiente de Trabalho. |
| **Estilo/Preferências** | Preferência de caimento (fitPreference), Conforto (comfort_priority), Paletas Visuais (image-single). | Expandir peças que gosta/não gosta e tecidos que evita. |
| **Medidas Físicas** | Altura/Peso (PhysicalDataStep), Cores de pele/cabelo/olhos. | Adicionar numeração por categoria (superior, inferior, calçados). |
| **Dificuldades** | Pontos de dor (pain_points). | Manter. |
| **Orçamento** | Faixa mensal (monthly_budget). | Refinar para ser usado em recomendações de afiliados. |
| **Guarda-Roupa** | Peças que possui (wardrobe_owned). | Reorganizar por categorias para melhor visualização. |

### 2. Infraestrutura de Dados (Supabase)

- **Tabela `diagnoses`**: Já possui a coluna `questionnaire` (JSONB) que armazena as respostas dinâmicas do formulário V2.
- **Tabela `profiles`**: Armazena dados físicos persistentes (altura, peso, cores).
- **Ajuste**: Nenhuma migration de schema é estritamente necessária, pois o campo JSONB comporta os novos campos. As tipagens no frontend serão atualizadas.

## Implementação

### 1. Expansão do Questionário (Frontend)

- **`src/components/diagnosis/questionnaire/questions.ts`**: Adicionar as novas perguntas seguindo a lógica de pesos de estilo (StyleTag).
- **Novas Seções**:
  - **Profissão & Ambiente**: Texto livre + select de formalidade do ambiente.
  - **Restrições Reais**: Cores e tecidos a serem evitados (para filtro de recomendações).
  - **Tamanhos Habituais**: Mapeamento específico por tipo de peça.
  - **Imagem Negativa**: O que o usuário explicitamente NÃO quer transmitir.

### 2. Inteligência e Lógica (Backend/IA)

- **`supabase/functions/process-diagnosis/index.ts`**: Atualizar o prompt da IA para incluir os novos campos no contexto (wardrobe_avoided, personal_rules, insecurities).
- **Mapeamento**: Ajustar `mapToLegacyQuestionnaire.ts` para converter os novos campos em strings explicativas para o motor de IA.

### 3. Experiência do Usuário (UX)

- Manter a divisão em etapas (Stepper) para não sobrecarregar o usuário.
- Implementar lógica condicional no `QuestionnaireV2` para ocultar perguntas irrelevantes (ex: não perguntar sobre blazer se o usuário detesta formalidade).

## Próximos Passos

1. Atualizar definições de perguntas em `questions.ts`.
2. Refinar mapeamento em `mapToLegacyQuestionnaire.ts`.
3. Testar o fluxo completo com um usuário de teste para validar a persistência no JSONB da tabela `diagnoses`.
