# Blog automático VIRUM

O site público e o cliente do repositório usam Supabase Cloud, projeto
`mhvmjgyibehthmglnxge`. O módulo respeita `blog_posts.status` e o blog/home atuais.
O painel fica em Administração → Blog, acima da lista de artigos.

## Instalação

1. No SQL Editor desse projeto, executar
   `supabase/migrations/20261125180754_virum_daily_blog.sql`.
2. Em Edge Functions → Secrets, cadastrar `TAVILY_API_KEY` e ao menos uma chave
   de texto: `GROQ_API_KEY`, `GEMINI_API_KEY` ou `CEREBRAS_API_KEY`.
   Reutilizar as chaves existentes do Virum quando válidas. Não colocar chaves no frontend.
3. Cadastrar `BLOG_AUTOMATION_CRON_SECRET`, aleatório, com pelo menos 32 caracteres.
4. Publicar `daily-blog-post` com os quatro arquivos da pasta homônima:
   `index.ts`, `content.ts`, `production.ts`, `pdf.ts`.
   O código valida a sessão de administrador ou o segredo do agendador;
   preservar `verify_jwt = false` apenas para esta função.
5. Em Vault, cadastrar `virum_blog_cron_secret` com o mesmo valor do passo 3.
   Executar `docs/deploy/virum-blog-cron.sql` no SQL Editor. O comando é idempotente
   pelo nome do job e só ativa o cron após encontrar o segredo no Vault.
6. Publicar o frontend atualizado no provedor que hospeda virum.com.br.
7. No painel Blog, manter Planejamento editorial e Publicar automaticamente,
   salvar, conferir integrações e testar Gerar artigo de hoje.

O padrão é um artigo diário, a partir das 08h de Brasília. O cron consulta a cada
três minutos; o banco impede duplicação, controla tentativas e preserva rascunhos.
Artigos precisam passar na revisão e ter capa para serem publicados.
Falhas de IA/cota/fontes aparecem no histórico e podem exigir intervenção.
Google Trends é opcional e depende de `SERPAPI_KEY`; planejamento editorial usa
Tavily para fontes sem depender da cota do SerpApi. As duas contas têm cotas próprias.

## Verificação

```sql
SELECT enabled,local_hour,publish_mode,keyword_source FROM public.blog_automation_settings;
SELECT day,state,attempts,error,post_id FROM public.blog_automation_runs ORDER BY day DESC LIMIT 5;
SELECT jobname,schedule,active FROM cron.job WHERE jobname='virum-daily-blog';
```

Confirmar um artigo publicado na home e no blog, com capa acessível por HTTPS.
O segredo do cron não deve aparecer em URLs, arquivos públicos ou logs.
