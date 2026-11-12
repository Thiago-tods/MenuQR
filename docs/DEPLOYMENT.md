# Deploy

1. Projeto Supabase com as 3 migrations (em ordem) e o seed aplicados (veja o README).
2. Hospedagem Node (ex.: Vercel). Variáveis:
   - `NEXT_PUBLIC_SITE_URL`: domínio real, usado nos QR Codes.
   - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - `SUPABASE_SERVICE_ROLE_KEY`: somente servidor, nunca com prefixo `NEXT_PUBLIC_`.
   - **`TRUSTED_PROXY`**: `vercel` ou `cloudflare`, conforme a hospedagem. Sem isso, os limites por IP usam um balde único para todos (veja [SECURITY.md](SECURITY.md#proteção-do-x-forwarded-for)).
3. Em Supabase Auth > URL Configuration, informe o domínio do site.
4. Crie o usuário admin e rode o SQL de promoção (README).
5. Cadastre fotos dos pratos em `/admin/products` (ou `npm run seed:images`) e mantenha os créditos em `docs/IMAGE_CREDITS.md`.
6. Gere os QR Codes em `/admin/qr-code` **depois** de definir o domínio final.

Antes de abrir ao público:

- Confirme que a hospedagem sobrescreve os cabeçalhos de IP como a documentação dela diz (isso não foi verificado, o projeto nunca foi implantado).
- Em ambiente com várias instâncias, troque o limitador em memória por um compartilhado (Redis/Upstash) ou use o WAF da hospedagem.
- Não use `ORDER_RATE_LIMIT` alto em produção.

Nenhum deploy foi feito por este projeto.
