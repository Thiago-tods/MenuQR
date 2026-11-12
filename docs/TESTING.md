# Testes

| Camada               | Comando                                      | O que prova                                                          | Precisa de Supabase    |
| -------------------- | -------------------------------------------- | -------------------------------------------------------------------- | ---------------------- |
| Unitários            | `npm test`                                   | Regras puras: preço, estados, carrinho, horário, IP, erros, limites. | Não                    |
| Integração (RLS)     | `npm run test:rls`                           | Políticas do banco com usuários reais.                               | Sim (projeto de teste) |
| E2E                  | `npm run test:e2e`                           | Fluxos no navegador: pedido, admin, teclado, responsividade, QR.     | Sim                    |
| Acessibilidade (axe) | `npm run a11y`                               | WCAG 2.0/2.1 A e AA e boas práticas em 17 telas.                     | Sim                    |
| Qualidade            | `lint`, `typecheck`, `format:check`, `build` | Estilo, tipos e build de produção.                                   | Não                    |

O CI roda os de "Não". Os outros exigem um projeto Supabase de **teste**, com migrations e seed, e ficam fora do CI de propósito.

## Unitários (Vitest) — `npm test`

| Arquivo                    | Cobre                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `lib/pricing.test.ts`      | Subtotal, complementos, total, quantidade, indisponibilidade, mínimo/máximo, preço adulterado. |
| `lib/order-status.test.ts` | Fluxo válido, saltos bloqueados, estados finais, cancelamento.                                 |
| `lib/cart.test.ts`         | Totais, agrupamento, limite, persistência (serialização).                                      |
| `lib/hours.test.ts`        | Aberto/fechado, virada de meia-noite.                                                          |
| `lib/dates.test.ts`        | "Hoje" no fuso de São Paulo.                                                                   |
| `lib/admin-errors.test.ts` | `?erro=`: códigos conhecidos, desconhecidos, HTML, injeção, `__proto__`, valores repetidos.    |
| `lib/client-ip.test.ts`    | IP só de proxy declarado, cabeçalhos forjados ignorados, lixo descartado, IPv6 /64.            |
| `lib/rate-limit.test.ts`   | Limite, janela, isolamento por chave, bloqueio que não se estende.                             |

## Integração de RLS — `npm run test:rls`

`tests/rls/rls.test.ts`: 36 testes, 4 papéis (anon, usuário sem perfil, staff, admin) × tabelas × operações. Detalhes e resultado em [SECURITY.md](SECURITY.md#rls-matriz-e-resultado-dos-testes).

Como funciona:

- Cria 3 usuários reais no Supabase Auth e faz login com senha. Os clientes usam a chave `anon` + o JWT de cada um.
- A `service_role` só cria e apaga fixtures e confere o estado do banco depois das tentativas de escrita. Nunca simula usuário.
- Cada teste de bloqueio compara um **snapshot do banco** antes e depois: "erro" não basta, o banco tem que continuar igual.
- Limpeza no final: apaga tudo com o prefixo `rls-<id>`, os usuários e as imagens.

```powershell
# Projeto de TESTE, com migrations e seed aplicados. A trava evita rodar por engano.
$env:RLS_TEST_ALLOW="yes"
npm run test:rls
```

Variáveis lidas de `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Sem `RLS_TEST_ALLOW=yes`, a suíte é ignorada.

## E2E (Playwright) — `npm run test:e2e`

Dois projetos (Pixel 7 e Desktop Chrome), 16 testes cada:

| Spec                     | Cobre                                                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `order-flow.spec.ts`     | Pedido ponta a ponta; tela de admin desatualizada recebe aviso (não quebra); `?erro=` só exibe texto fixo (HTML e injeção); login e rota protegida.                                                     |
| `keyboard-focus.spec.ts` | Pedido completo **só com teclado**; link "Pular para o conteúdo"; foco visível em todo elemento focável (público e 8 telas do admin); erros do checkout ligados aos campos e foco no primeiro inválido. |
| `responsive-qr.spec.ts`  | Sem rolagem horizontal em 375, 768, 1024 e 1280 px; alvos de toque ≥ 24 px; QR Codes decodificados por software e conferidos com a URL exibida; o QR da mesa abre o cardápio identificado.              |

Requisitos: Supabase de teste com migrations e seed, e um admin de teste (`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`). Sem as credenciais, os testes de admin são ignorados.

```powershell
$env:E2E_BASE_URL="http://localhost:3000"   # servidor já rodando; sem isso, sobe `npm run dev`
$env:E2E_ADMIN_EMAIL="..."; $env:E2E_ADMIN_PASSWORD="..."
npx playwright install chromium             # uma vez
npm run test:e2e
```

Pontos de atenção:

- O checkout recusa pedidos fora do horário de funcionamento. O `globalSetup` abre o restaurante 24 h durante os testes e **restaura os horários originais** no final (precisa de `SUPABASE_SERVICE_ROLE_KEY`). Se o processo for morto no meio, confira os horários em `/admin/settings`.
- O limite de pedidos por IP pode bloquear rodadas seguidas: use `ORDER_RATE_LIMIT=100` só no ambiente de teste.
- Os testes criam pedidos reais. Apague-os depois (`customer_name` com "E2E", "Teste Teclado" ou "Auditoria").

## Acessibilidade — `npm run a11y`

axe-core com as tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` e `best-practice` em 17 telas: home, produto, carrinho, checkout, acompanhamento, login (com e sem aviso), 8 telas do admin e o detalhe do pedido (com e sem aviso). Abre o restaurante 24 h durante a execução e restaura depois.

## O que foi verificado manualmente e o que NÃO foi

| Item                                     | Situação           | Como                                                                                                               |
| ---------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Leitura de QR com câmera de celular real | **Não verificada** | Sem dispositivo. Substituto: decodificação por software (jsQR) dos PNG gerados, conferida com a URL exibida (E2E). |
| Página pública em smartphone real        | **Não verificada** | Emulação (Pixel 7 e viewport 375 px): sem rolagem horizontal, alvos ≥ 24 px, axe sem violações.                    |
| Painel em tablet real                    | **Não verificada** | Emulação em 768 e 1024 px: 8 telas sem rolagem horizontal e com o menu visível.                                    |
| Navegação por teclado e estados de foco  | Executada          | Playwright com o teclado real do navegador (Tab, Shift+Tab, setas, Enter). Pedido completo sem mouse.              |
| Formulários e mensagens de erro          | Executada          | Checkout (`aria-describedby`, foco no primeiro inválido), login e `?erro=` no admin.                               |
| Leitor de tela real (NVDA, VoiceOver)    | **Não verificada** | axe cobre regras automáticas, que pegam só parte dos problemas de leitor de tela.                                  |
| Navegadores além do Chromium             | **Não verificada** | Firefox e Safari não foram testados.                                                                               |
