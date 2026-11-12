# Arquitetura

```
src/
  app/
    (public)/        cardápio, produto, carrinho, checkout, pedido/[token]
    admin/login      login
    admin/(panel)/   dashboard, orders, products, categories, complements, settings, qr-code
    api/pedido/[token]  JSON do acompanhamento (polling)
  components/        UI do cliente (cart-provider, menu-browser, product-form, order-tracker…)
  lib/               regras puras e testadas: pricing, order-status, cart, hours, money, schemas
  lib/supabase/      clientes: server (sessão do usuário) e admin (service_role)
  server/            leitura/escrita no servidor: catalog, menu, tracking, create-order, admin-auth
  proxy.ts           renova sessão e exige login em /admin
supabase/            migrations SQL e seed
```

## Princípios

- **Regra de negócio fora dos componentes.** `lib/pricing.ts`, `order-status.ts`, `cart.ts` e `hours.ts` são funções puras com testes.
- **Servidor decide.** `server/create-order.ts` valida com Zod, confere loja aberta, mesa e disponibilidade, carrega preços do banco e grava snapshots.
- **Duas identidades no banco.** Navegação usa a chave `anon` + RLS. Só dois fluxos usam `service_role`: criar pedido e ler pedido por token. Ambos validam a entrada antes.
- **Admin em camadas.** `proxy.ts` (login) → `requireAdmin` (papel, nas páginas) → `assertAdmin` (nas actions) → RLS → gatilho de status.

## Fluxo do pedido

1. Cliente monta o carrinho (localStorage; preços só para exibição).
2. `submitOrder` (Server Action) → `createOrder`: limite de requisições, Zod, loja aberta, mesa por `public_code`, `priceOrder` com dados do banco.
3. Insere `orders`, `order_items`, `order_item_complements`. Falha parcial apaga o pedido (sem transação entre chamadas HTTP).
4. Retorna `tracking_token`; cliente vai a `/pedido/<token>` e a tela consulta `/api/pedido/<token>` a cada 5 s até um estado final.
5. Admin muda o status; o gatilho valida a transição e grava `order_status_history`.

## Decisões e trade-offs

- **Polling em vez de Realtime.** Realtime exigiria uma política RLS por token para `anon`. Mantive pedidos fechados para `anon`.
- **Criação de pedido não transacional.** Uma função SQL (RPC) daria atomicidade; fica como melhoria.
- **Sem estado global além do carrinho.** `useSyncExternalStore` sobre `localStorage`.
