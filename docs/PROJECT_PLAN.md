# MenuQR — Plano do projeto

Projeto de portfólio: cardápio digital + pedidos para o restaurante fictício **Casa Oliva**. Não é SaaS (sem multi-tenant, planos ou pagamento real).

## Auditoria (Fase 0)

- Diretório `E:\MenuQr` estava vazio. Sem Git, sem Supabase configurado.
- Node v26, npm 11. Docker ausente (Supabase local não roda neste ambiente).
- Next.js 16.4.6 (usa `proxy.ts` no lugar de `middleware.ts`), React 19, Tailwind 4, Zod 4.

## Escopo

Cliente: cardápio, produto com complementos, carrinho persistido, checkout (local/retirada), acompanhamento por token.
Admin: dashboard, pedidos (máquina de estados), produtos, categorias, complementos, configurações, QR Code e mesas.

## Decisões

| Tema           | Decisão                                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Preço          | Recalculado no servidor a partir do banco. O cliente envia só IDs e quantidades.                                                                                                                       |
| Pedidos        | Criados por Server Action com a chave `service_role` (somente servidor). `anon` não lê nem escreve em `orders`.                                                                                        |
| Acompanhamento | Token aleatório de 64 caracteres hex, ~244 bits (`tracking_token`) em rota `/pedido/[token]`. Sem ID sequencial exposto.                                                                               |
| Tempo real     | Polling a cada 5 s via Route Handler com token. Supabase Realtime fica como melhoria documentada (exige política por token).                                                                           |
| Mesas          | `public_code` aleatório. O servidor valida o código e grava `table_id`; o cliente não escolhe a mesa por número.                                                                                       |
| Admin          | Supabase Auth + tabela `profiles` com `role = 'admin'`. `proxy.ts` e verificação em cada action.                                                                                                       |
| Dinheiro       | `numeric(10,2)` no banco; centavos inteiros no código.                                                                                                                                                 |
| Cor Terracotta | `#C65D3B` (marca) só em elementos decorativos. Com texto, usa `#B5502F` (botões, preços) e `#9A4326` (hover): o tom da marca dá 4,17:1 com branco e 3,91:1 sobre o fundo, abaixo dos 4,5:1 do WCAG AA. |

## Fases e critérios de conclusão

0. Auditoria e docs · 1. Estrutura e design system · 2. Banco, RLS e auth · 3. Cardápio · 4. Carrinho e checkout · 5. Pedidos e acompanhamento · 6. Admin · 7. QR e mesas · 8. Testes e segurança · 9. Documentação.

Uma fase só conta como concluída com lint, typecheck e testes relevantes executados. O estado real fica em `IMPLEMENTATION_PROGRESS.md`.
