# Plano de Implementação: Catálogo de Produtos Afiliados VIRUM

Implementação completa do módulo administrativo para gerenciamento de produtos de lojas externas (Shopee, SHEIN, Amazon, etc.) com rastreamento de cliques e integração futura com recomendações.

## 1. Banco de Dados (Supabase)

### Novas Tabelas
- **affiliate_products**: Cadastro principal dos produtos.
  - `id` (uuid, PK)
  - `name` (text, not null)
  - `store` (text, not null) - Shopee, SHEIN, etc.
  - `category` (text, not null) - Camisa, Calça, etc.
  - `subcategory` (text)
  - `affiliate_url` (text, not null)
  - `image_url` (text)
  - `price` (numeric(12,2)) - Armazenado como valor real (ex: 129.90)
  - `price_range` (text) - Econômico, Médio, Premium, Luxo
  - `description` (text)
  - `styles` (text[]) - clássico, casual, etc.
  - `body_types` (text[]) - ampulheta, retângulo, etc.
  - `colors` (text[]) - preto, azul, etc.
  - `sizes` (text[]) - P, M, G, 40, 42, etc.
  - `audience` (text) - Masculino, Feminino, Unissex
  - `status` (text) - active, inactive (padrão 'active')
  - `click_count` (integer) - Cache de cliques para performance
  - `created_at`, `updated_at`

- **affiliate_product_clicks**: Log de rastreamento.
  - `id` (uuid, PK)
  - `product_id` (uuid, FK)
  - `user_id` (uuid, opcional)
  - `store` (text)
  - `destination_url` (text)
  - `source` (text) - onde o clique ocorreu
  - `clicked_at` (timestamp)

### Segurança (RLS)
- Administradores: Acesso total (CRUD).
- Usuários comuns/Anônimos: `SELECT` apenas em produtos com `status = 'active'`.
- Tracking: Inserção pública permitida para registros de cliques.

## 2. Frontend (React + Vite)

### Componentes e Páginas
- **AdminAffiliateProducts**: Tabela de listagem, busca, filtros (loja, categoria, status, preço) e métricas rápidas.
- **AdminAffiliateForm**: Modal/Página com formulário organizado em blocos (Info, Afiliado, Estilo, Compatibilidade).
- **useAffiliateProducts**: Hook customizado para gerenciar consultas e mutações.
- **AffiliateProductButton**: Componente de botão dinâmico ("Ver na SHEIN", etc.) que registra o clique antes de redirecionar.

### Identidade Visual
- Seguindo o padrão VIRUM: Fundo claro, cards com glassmorphism suave, tipografia serifada nos títulos, botões com gradiente institucional.

## 3. Lógica de Negócio
- Validação de URLs de afiliados.
- Cálculo automático da faixa de preço.
- Registro assíncrono de cliques com fallback para redirecionamento imediato.

## Detalhes Técnicos
- Utilização de `numeric` para preços.
- Arrays de strings nativos do PostgreSQL para tags de estilo/cor.
- `GRANT` explícito em todas as novas tabelas.
