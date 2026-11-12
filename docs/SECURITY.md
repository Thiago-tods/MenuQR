# Segurança

Resumo do que protege o MenuQR, de que forma e **como foi verificado**. Limitações estão no final.

## Controles

| Risco                              | Controle                                                                                                                                                                                                                         | Verificação                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Preço manipulado                   | O servidor ignora preços do cliente; `priceOrder` usa só dados do banco.                                                                                                                                                         | Unitário (`pricing.test.ts`) e manual (R$ 0,01 enviado, R$ 7,00 gravado).              |
| Enumeração de pedidos              | Acompanhamento só por `tracking_token` (dois UUIDs v4, 64 hex, ~244 bits). A resposta não traz nome, telefone nem ids. `anon` não lê `orders`.                                                                                   | RLS (isolamento) e E2E.                                                                |
| Troca de mesa por parâmetro        | A mesa vem de `public_code` aleatório, validado no servidor (existente e ativa).                                                                                                                                                 | E2E (QR → "Você está na Mesa N") e manual (código forjado rejeitado).                  |
| Acesso admin indevido              | `proxy.ts` (login) → `requireAdmin` (papel, nas páginas) → `assertAdmin` (nas actions; sem sessão, volta ao login com código) → RLS com `is_admin()`.                                                                            | RLS com 3 papéis reais + E2E.                                                          |
| Escalada de privilégio             | `profiles` não tem política de escrita: ninguém muda papéis pela API, nem o admin. A promoção é por SQL (README).                                                                                                                | RLS: anon, usuário sem perfil, staff e admin tentam; o banco não muda.                 |
| Transição de status inválida       | `canTransition` na action e gatilho no banco. `authenticated` só atualiza a coluna `status` (grant por coluna). Cada mudança grava `changed_by`.                                                                                 | RLS e E2E (incluindo tela desatualizada).                                              |
| Dados do cardápio ocultos          | Produto só é público se não estiver arquivado **e** sua categoria estiver ativa. A ligação produto↔grupo segue a mesma regra. O servidor (que usa a chave de serviço) filtra igual em `loadCatalog` e na página do produto.      | RLS (achado e correção, abaixo).                                                       |
| Vazamento de chave                 | `service_role` só em `lib/supabase/admin.ts` com `server-only`; nunca com prefixo `NEXT_PUBLIC_`.                                                                                                                                | Varredura do repositório: nenhum segredo.                                              |
| Abuso (pedidos, login, acompanhar) | Limite por IP: 5 pedidos/10 min, 8 logins/10 min, 60 consultas/min. O IP só vem de cabeçalho de proxy quando `TRUSTED_PROXY` declara a hospedagem. IPv6 conta por prefixo /64. O Supabase Auth aplica limites próprios no login. | Unitários (`client-ip.test.ts`, `rate-limit.test.ts`). **Infra real: não verificada.** |
| Upload malicioso                   | Tipo e tamanho validados no servidor (JPG/PNG/WebP, 3 MB); o bucket restringe MIME; o nome do arquivo é gerado (UUID). Só admin envia ou apaga.                                                                                  | RLS (Storage) e manual.                                                                |
| Texto injetado pela URL            | As telas do admin recebem `?erro=<código>`. O texto vem de um mapa fixo (`lib/admin-errors.ts`); valor desconhecido mostra uma mensagem genérica. Nenhum valor da URL é exibido e não há `dangerouslySetInnerHTML`.              | Unitários (HTML, `__proto__`, scripts, valores repetidos) e E2E (renderizado).         |
| Entrada                            | Zod no servidor para pedido, produto, categoria, grupo e configurações. O React escapa a saída.                                                                                                                                  | Unitários e manual.                                                                    |

## Proteção do `x-forwarded-for`

Antes: os três pontos de limite liam o primeiro valor de `x-forwarded-for`. Fora de um proxy confiável, o cliente envia esse cabeçalho e **troca o IP a cada requisição**, anulando o limite.

Agora (`lib/client-ip.ts`, usado por `server/request-limit.ts`):

| `TRUSTED_PROXY`        | Fonte do IP                                                            | Observação                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `vercel`               | `x-real-ip`, depois `x-vercel-forwarded-for`, depois `x-forwarded-for` | A Vercel sobrescreve esses cabeçalhos; valores do cliente não chegam ao app.                                     |
| `cloudflare`           | `cf-connecting-ip`                                                     | Só vale se **todo** o tráfego passa pela Cloudflare (origem fechada a outros acessos).                           |
| ausente ou outro valor | nenhum cabeçalho é lido                                                | Balde único para todos, com limite multiplicado por 20 para não travar usuários reais. Avisa no log em produção. |

Também: o valor precisa ser um IP válido (lixo é descartado), e IPv4 mapeado em IPv6 vira IPv4.

**Não verificado:** a infraestrutura real. O projeto nunca foi implantado, então não há como confirmar que a Vercel (ou outro proxy) sobrescreve os cabeçalhos como a documentação deles afirma. Antes de publicar, confirme isso no ambiente final.

## RLS: matriz e resultado dos testes

Testes em `tests/rls/` rodam contra um Supabase **real**, com usuários **reais** (JWT por login com senha) e a chave `anon`. A `service_role` só monta fixtures e confere o estado do banco depois de cada tentativa de escrita; nunca simula um usuário. Papéis: `anon` (sem login), usuário logado sem perfil, `staff` (perfil não admin) e `admin`.

| Tabela / recurso                                                       | Público e usuários sem privilégio                                                      | Admin                                                                      |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `restaurant_settings`, `complement_groups`, `complement_options`       | Leitura. Nenhuma escrita.                                                              | Tudo.                                                                      |
| `categories`                                                           | Leitura só das ativas. Nenhuma escrita.                                                | Tudo (vê inativas).                                                        |
| `products`, `product_complement_groups`                                | Leitura só de não arquivados em categoria ativa. Nenhuma escrita.                      | Tudo (vê arquivados e de categorias inativas).                             |
| `tables`                                                               | Nada.                                                                                  | Tudo.                                                                      |
| `orders` e filhas (`order_items`, `…_complements`, `…_status_history`) | Nada, mesmo conhecendo token ou id. Nenhuma escrita.                                   | Lê. Só atualiza `status` (pela máquina de estados). Não insere nem exclui. |
| `profiles`                                                             | Anon e sem perfil: nada. Staff: só o próprio. Nenhuma escrita (sem escalada de papel). | Lê todos. Não escreve (papéis só por SQL).                                 |
| Storage `menu-images`                                                  | Leitura pública. Não envia, não sobrescreve, não apaga.                                | Envia e apaga.                                                             |
| Funções de gatilho via API                                             | Não chamáveis.                                                                         | Não chamáveis. `is_admin()` reflete o papel real.                          |

**Resultado:** 36 testes passam. Na primeira execução, 4 falharam:

- **Achado real (3 falhas, um por papel):** produtos de categorias **desativadas** eram legíveis por qualquer pessoa pela API. A interface os escondia, o banco não. Corrigido na migration `20260101000200_harden_public_read.sql` e no código (`loadCatalog` e a página do produto, que usam a chave de serviço e ignoram RLS). Depois de aplicada a migration, os 36 testes passam.
- **Erro do teste (1 falha):** a URL pública de uma imagem apagada continua respondendo por causa do cache do CDN. O teste passou a conferir pela listagem do Storage. Efeito prático: uma imagem apagada pode continuar acessível pela URL antiga por um tempo.

Para provar que o teste enxerga falhas, o próprio achado acima é a evidência: ele reprovou antes da correção e aprovou depois.

## Limitações

- **Limite por IP em memória:** cada instância tem o seu contador. Em ambiente com várias instâncias (serverless), o limite efetivo é por instância. Para um limite global, use Redis/Upstash ou o WAF da hospedagem.
- **Infra não verificada:** ver `x-forwarded-for` acima.
- **Sem CAPTCHA** no checkout.
- **Sem `revoke` explícito** de escrita para `anon`. A proteção vem do RLS ligado e sem políticas de escrita, e está testada (36 testes). `revoke` seria uma camada extra.
- **CSP/HSTS** não configurados à mão; use os padrões da hospedagem.
- **Pedido não transacional:** são várias chamadas; uma falha no meio apaga o pedido parcial. Uma função SQL (RPC) daria atomicidade.
- **Os testes de RLS rodam contra um projeto real.** Use um projeto de **teste**: eles criam e apagam dados com o prefixo `rls-<id>` e 3 usuários. Uma execução interrompida pode deixar esses dados.
