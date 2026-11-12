# Banco de dados

Migrations em `supabase/migrations/`. Seed em `supabase/seed.sql`.

| Tabela                                 | Função                                                            |
| -------------------------------------- | ----------------------------------------------------------------- |
| profiles                               | Papel do usuário (`admin`/`staff`), ligada a `auth.users`         |
| restaurant_settings                    | Linha única (`id = 1`): dados, horários (jsonb), pausa de pedidos |
| categories                             | Nome, slug, ordem, ativa                                          |
| products                               | Preço `numeric(10,2)`, disponível, destaque, `archived`           |
| complement_groups / complement_options | Grupos com `min_select`/`max_select` e opções com acréscimo       |
| product_complement_groups              | Liga produtos a grupos (grupos são reutilizáveis)                 |
| tables                                 | Mesas com `public_code` aleatório (~244 bits)                     |
| orders                                 | `number` sequencial, `tracking_token`, modo, status, totais       |
| order_items / order_item_complements   | **Snapshots** de nome e preço no momento do pedido                |
| order_status_history                   | De/para, quem mudou, quando                                       |

## Integridade

- Dinheiro em `numeric(10,2)`; no código, centavos inteiros.
- Produtos: `on delete restrict` na categoria. `order_items.product_id` usa `set null`; o histórico não depende do produto existir.
- Produtos com pedidos são **arquivados** pela interface, nunca apagados.
- `check (mode <> 'DINE_IN' or table_id is not null)`: consumo no local exige mesa.
- Gatilho `orders_status_guard` rejeita transições inválidas e registra o histórico. `orders_initial_history` registra o estado inicial.
- Índices: pedidos por `(status, created_at)` e `created_at`; produtos por categoria e destaque; opções por grupo.

## RLS

| Tabela                                          | anon / público                                            | admin                                 |
| ----------------------------------------------- | --------------------------------------------------------- | ------------------------------------- |
| settings, complement_groups, complement_options | leitura                                                   | tudo                                  |
| categories                                      | leitura se `active`                                       | tudo                                  |
| products                                        | leitura se não `archived` **e** a categoria está `active` | tudo (vê arquivados e inativos)       |
| product_complement_groups                       | leitura se o produto é visível                            | tudo                                  |
| tables                                          | nada                                                      | tudo                                  |
| orders e filhas                                 | nada                                                      | leitura; update só da coluna `status` |
| profiles                                        | o próprio registro                                        | leitura geral                         |
| storage `menu-images`                           | leitura                                                   | escrita                               |

Migrations, em ordem: `…000000_schema.sql` (tabelas e gatilhos), `…000100_rls.sql` (RLS, Storage), `…000200_harden_public_read.sql` (produto só é público com categoria ativa; achado dos testes de RLS). A matriz completa e o resultado dos testes estão em [SECURITY.md](SECURITY.md).

Pedidos são inseridos pelo servidor com `service_role`. Não existe política de INSERT em `orders`.
`is_admin()` é `security definer` para evitar recursão de RLS em `profiles`.
