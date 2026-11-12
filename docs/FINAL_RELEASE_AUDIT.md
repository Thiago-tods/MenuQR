# Auditoria final de segurança e publicação

Auditoria feita antes de publicar o repositório. Nada foi commitado, enviado ou implantado.

## 1. Resumo

O projeto está **em condições de ser publicado como portfólio**, com as ressalvas das seções 5 e 6. A auditoria achou **uma falha real de segurança** (produtos de categorias desativadas legíveis pela API), **um furo de pedido** (produto de categoria desativada podia ser pedido pela chave de serviço), **problemas de acessibilidade** (contraste, alvos de toque, link de pular, erros do checkout), **defeitos de UX** e fragilidades de teste. A tabela da seção 2 lista os 16 itens. Todos foram corrigidos e verificados. O que não pôde ser verificado (dispositivos reais, câmera, leitor de tela, hospedagem real) está declarado como tal.

Comparação com a auditoria anterior:

| Verificação                | Antes                 | Agora                                            |
| -------------------------- | --------------------- | ------------------------------------------------ |
| ESLint                     | aprovado              | aprovado                                         |
| TypeScript                 | aprovado              | aprovado                                         |
| Prettier                   | aprovado              | aprovado                                         |
| Testes unitários           | 21                    | **43** (8 arquivos)                              |
| Testes de integração (RLS) | nenhum                | **36**, contra Supabase real, com usuários reais |
| Playwright                 | 4 / 4                 | **32 / 32** (16 por projeto: mobile e desktop)   |
| axe-core                   | 13 telas, 0 violações | **17 telas, 0 violações**                        |
| Build de produção          | aprovado              | aprovado                                         |

## 2. Correções realizadas

| #   | Problema                                                                                                                                            | Gravidade | Correção                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| 1   | **RLS:** produtos de categorias desativadas legíveis por qualquer pessoa pela API (`products_public_read`).                                         | Média     | Migration `…000200_harden_public_read.sql` (produto público só com categoria ativa; ligações seguem). |
| 2   | `loadCatalog` e a página do produto usam a chave de serviço (ignora RLS): um produto de categoria desativada podia ser **pedido** ou aberto por id. | Média     | Filtro `categories.active` na consulta (`categories!inner`).                                          |
| 3   | `x-forwarded-for` lido do cliente: o limite por IP era contornável trocando o cabeçalho.                                                            | Média     | `lib/client-ip.ts` + `TRUSTED_PROXY`; sem proxy declarado, nenhum cabeçalho é lido. IPv6 por /64.     |
| 4   | `?erro=` exibia texto arbitrário da URL.                                                                                                            | Baixa     | Códigos fixos (`lib/admin-errors.ts`); valor desconhecido gera mensagem genérica.                     |
| 5   | `?erro=permissao` (acesso negado) **nunca era exibido** no login; o usuário voltava sem explicação.                                                 | Baixa     | Login lê o código e mostra a mensagem fixa.                                                           |
| 6   | `assertAdmin` lançava exceção quando a sessão expirava ("This page couldn't load").                                                                 | Baixa     | Redireciona ao login com `sessao-expirada` ou `acesso-negado`.                                        |
| 7   | Contraste do Terracotta com texto (4,17:1 e 3,91:1) e contador da categoria selecionada (3,82:1).                                                   | AA        | `#B5502F` onde há texto; contador sem opacidade. (rodada anterior)                                    |
| 8   | Toast de sucesso com 4,25:1 (`richColors`).                                                                                                         | AA        | Removida a opção `richColors`.                                                                        |
| 9   | Alvos de toque < 24 px (WCAG 2.5.8): resumo do horário (20), número do pedido no admin (17), rótulo "Disp." (16).                                   | AA        | Altura mínima nos três.                                                                               |
| 10  | Sem link "Pular para o conteúdo" (8 links de menu antes do conteúdo no admin).                                                                      | A         | Link no layout + `#conteudo` nas páginas.                                                             |
| 11  | Erros do checkout não ligados aos campos.                                                                                                           | A         | `aria-describedby` + `id`; o foco vai ao primeiro campo inválido (testado).                           |
| 12  | E2E e scripts quebravam fora do horário de funcionamento (o checkout recusa pedidos).                                                               | Teste     | `globalSetup` e `forceOpen()` abrem 24 h e restauram o horário original.                              |
| 13  | Usuários de teste de RLS com domínio real (`menuqr-test.dev`).                                                                                      | Higiene   | `example.com` (reservado, RFC 2606).                                                                  |
| 14  | CI sem checagem de formato e com permissões amplas.                                                                                                 | Higiene   | `format:check`, `permissions: contents: read`, `concurrency`.                                         |
| 15  | `.gitignore` sem logs, dumps e `.claude/`.                                                                                                          | Higiene   | Padrões adicionados.                                                                                  |
| 16  | Documentação com "256 bits" e "textos fixos" imprecisos.                                                                                            | Docs      | Corrigido ("~244 bits"; limites registrados).                                                         |

Falhas de testes que eram do **teste**, e não do app, e foram corrigidas sem esconder o problema: URL pública de imagem apagada ainda responde (cache do CDN; agora confere pela listagem do Storage); `Tab` entra uma vez no grupo de radios (agora usa as setas, como o navegador); dashboard do admin sem elementos focáveis; foco após navegação começa no conteúdo (agora usa `Shift+Tab` para o cabeçalho).

## 3. Testes executados

| Camada                   | Quantidade                       | O que cobre                                                                                                                                                                            |
| ------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unitários                | 43                               | Preço, estados, carrinho, horário, datas, códigos de erro, IP confiável, limitador.                                                                                                    |
| Integração RLS           | 36                               | 4 papéis × todas as tabelas × leitura, inserção, atualização, exclusão; Storage; escalada de papel; funções internas; isolamento de pedidos; estado do banco comparado antes e depois. |
| E2E (mobile e desktop)   | 32                               | Pedido ponta a ponta; tela desatualizada; `?erro=`; pedido só com teclado; foco visível; responsividade; QR.                                                                           |
| axe-core                 | 17 telas                         | WCAG 2.0/2.1 A e AA e boas práticas.                                                                                                                                                   |
| Varredura do repositório | 124 arquivos que o Git incluiria | Segredos, URL do projeto, dados pessoais, logs, dumps, temporários.                                                                                                                    |

## 4. Resultados reais

- **RLS: 36 / 36.** Na primeira execução, 32 passaram e 4 falharam (3 = o achado #1, um por papel; 1 = suposição errada do teste sobre o CDN). Depois da migration e do ajuste do teste, 36 passam. A mesma suíte reprovou antes da correção e aprovou depois, o que mostra que ela detecta o problema.
- **E2E: 32 / 32.** A primeira rodada das novas specs teve 18 falhas: a maioria por medidor de alvo de toque que contava o link de pular (invisível), por radio/`Tab` e por foco após navegar. Os problemas reais do app que elas expuseram (#9) foram corrigidos; o resto era do teste.
- **axe: 0 violações em 17 telas** depois de corrigir o toast (#8). A primeira rodada achou 1.
- **Unitários: 43 / 43. Build, lint, tipos e formato: aprovados.**

## 5. Pendências

| Pendência                                               | Situação                                                                                                              |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Testes automatizados de RLS                             | **Corrigida.** 36 testes, achado real corrigido.                                                                      |
| Proteção do `x-forwarded-for` no código                 | **Corrigida.** `TRUSTED_PROXY`, IP validado, /64, balde único sem proxy.                                              |
| `x-forwarded-for` na infraestrutura real                | **Não verificada.** O projeto nunca foi implantado; não se pode confirmar que a hospedagem sobrescreve os cabeçalhos. |
| Tratamento de `?erro=`                                  | **Corrigida.** Códigos fixos, testado (unitário e renderizado).                                                       |
| Leitura de QR com câmera de celular real                | **Não verificada.** Sem dispositivo. Substituto: decodificação por software, conferida com a URL exibida.             |
| Página pública em smartphone real                       | **Não verificada.** Emulação (Pixel 7, 375 px).                                                                       |
| Painel em tablet real                                   | **Não verificada.** Emulação em 768 e 1024 px.                                                                        |
| Navegação por teclado, foco, formulários e erros        | **Corrigida / verificada.** Executados com o teclado do navegador. Dois defeitos achados e corrigidos (#10, #11).     |
| Leitor de tela real (NVDA, VoiceOver)                   | **Não verificada.**                                                                                                   |
| Navegadores além do Chromium                            | **Não verificada.**                                                                                                   |
| Limitador de requisições compartilhado entre instâncias | **Pendente.** Hoje em memória (por instância).                                                                        |
| Criação de pedido transacional (função SQL)             | **Pendente.** Uma falha no meio apaga o pedido parcial.                                                               |
| Supabase Realtime no acompanhamento                     | **Pendente.** Hoje polling de 5 s.                                                                                    |
| `revoke` explícito de escrita para `anon`               | **Não reproduzida como falha.** Nenhuma escrita é possível (testado); seria só uma camada extra.                      |
| Fotos reais do cardápio                                 | **Pendente.** As atuais são ilustrativas e algumas aproximam o prato.                                                 |

## 6. Limitações de ambiente

- Sem Docker: nada rodou em Supabase local. Todos os testes de integração e E2E usaram um projeto Supabase de nuvem (de teste).
- Sem dispositivos físicos, câmera, leitor de tela e sem Firefox/Safari.
- Nunca houve deploy; cabeçalhos de proxy, CDN e limites da hospedagem não foram observados.
- Node 26 localmente; o CI usa Node 24.
- Uma execução do E2E ou da auditoria axe cria pedidos reais no banco configurado. Todos os pedidos de teste desta auditoria foram apagados.

## 7. Segredos e arquivos rastreados

- Há **1 commit** (o inicial do Create Next App) e **124 arquivos** que o Git incluiria no próximo commit (`git add -A`).
- **Nenhum segredo**: varredura por padrões de chave do Supabase (`sb_secret_`, `sb_publishable_`), JWT, chaves de nuvem e tokens do GitHub, além da URL do projeto: nenhuma ocorrência. Nenhum valor foi impresso nesta auditoria.
- **`.env.local` está ignorado.** O único arquivo de ambiente rastreável é `.env.example`, sem valores.
- Sem logs, dumps de banco, arquivos temporários, `node_modules`, builds, `test-results` ou `.claude/`. Os `.sql` são as 3 migrations e o seed.
- Sem e-mails, nomes ou caminhos pessoais nos arquivos (fora das capturas, que mostram só dados de demonstração).
- Usuários e pedidos de teste foram removidos do banco; as variáveis temporárias saíram do `.env.local`.
- `LICENSE`: MIT, com "MenuQR" como titular. Troque pelo seu nome se quiser.
- Capturas de tela: 16 arquivos (4 MB), geradas pelo app real.

## 8. Avaliação de segurança

**Boa para um projeto de portfólio.** O isolamento de dados foi provado contra um banco real, com usuários reais e comparação do estado do banco, e não só por existência de políticas: o público só lê o cardápio visível; pedidos, itens, mesas e perfis alheios ficam fechados; ninguém escala papel pela API; o status só muda pela máquina de estados e fica registrado; o preço vem do banco. A auditoria achou e corrigiu uma exposição real. As fragilidades que restam são operacionais e estão documentadas: limitador por instância, cabeçalhos de IP dependentes da hospedagem, pedido não transacional e ausência de CAPTCHA.

## 9. Avaliação de acessibilidade

**Boa nas verificações automáticas e de teclado; incompleta sem dispositivos reais.** axe: 0 violações em 17 telas. Contraste AA nos elementos com texto. Teclado: pedido completo sem mouse, foco visível em todos os elementos, link de pular, erros ligados aos campos. Alvos de toque ≥ 24 px (o mínimo do WCAG 2.5.8) e sem rolagem horizontal de 375 a 1280 px. Não se pode afirmar conformidade total: leitor de tela real e dispositivos físicos não foram testados.

## 10. Recomendação de publicação no GitHub

**Pode publicar**, com estas condições:

1. Faça o commit você mesmo (ou peça), conferindo `git status` antes: não deve aparecer `.env.local`.
2. Confirme o titular do `LICENSE`.
3. Aplique as 3 migrations em ordem em qualquer projeto novo (a 3ª corrige a falha #1).
4. Se for implantar de verdade: defina `TRUSTED_PROXY`, confirme o comportamento dos cabeçalhos na hospedagem e troque o limitador por um compartilhado.
5. O README e este relatório já listam o que não foi verificado; mantenha-os.

## 11. Identidade Git e atribuição de autoria

Verificado em modo somente leitura (nenhum commit, amend, rebase ou push foi executado):

| Verificação                                             | Resultado                                                                                                                                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `user.name` e `user.email`                              | Configurados **globalmente** (`~/.gitconfig`) com a identidade do proprietário. Não há configuração local no repositório. Nada foi alterado.                                                           |
| Commits existentes                                      | 1 (`5fb2a7e`, "Initial commit from Create Next App"), com o proprietário como autor e committer.                                                                                                       |
| Autores distintos                                       | 1 (o proprietário). Nenhum commit atribuído ao Claude.                                                                                                                                                 |
| Trailers `Co-authored-by` ou menções a Claude/Anthropic | Nenhum no histórico e nenhum nos arquivos do repositório.                                                                                                                                              |
| Configurações do Git que inserem texto em commits       | Nenhuma: sem `commit.template`, `core.hooksPath` ou `trailer.*`; `.git/hooks` só tem arquivos `.sample`.                                                                                               |
| Atribuição automática do Claude Code                    | `attribution.commit` e `attribution.pr` estão **vazios** em `~/.claude/settings.json`; não há `.claude/settings*.json` no projeto (e `.claude/` está no `.gitignore`). Nenhum trailer será adicionado. |
| Remoto e histórico remoto                               | Não há remoto configurado; nada foi enviado.                                                                                                                                                           |

Atualização (ajustes finais de preparação):

| Item                                     | Situação                                                                                                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidade corresponde à conta do GitHub | **Não confirmada.** O GitHub CLI (`gh`) não está instalado, então não há acesso autenticado à conta, e os e-mails da conta não são públicos. A identidade global existe, mas nada a liga à conta daqui. |
| Identidade local do repositório          | **Não configurada**, de propósito: só se configura depois de confirmar. Nenhum dado foi inventado ou alterado (global e local intactas).                                                                |
| Branch local                             | **Renomeada** de `master` para `main` (`git branch -m`, sem tocar no histórico).                                                                                                                        |
| GitHub Actions                           | **Confirmado:** `push` na `main` e `pull_request`. A `main` agora existe localmente.                                                                                                                    |
| Coautoria automática do Claude Code      | **Nenhuma.** `attribution.commit` e `attribution.pr` vazios; sem `.claude/settings*.json` no projeto; sem `commit.template`, `core.hooksPath` ou `trailer.*`.                                           |
| Histórico                                | 1 commit (`5fb2a7e`), um só autor, sem trailers. Nenhum commit foi criado, e não há remoto nem push.                                                                                                    |
| `git status`                             | Na `main`; 34 itens alterados ou novos, **nenhum em stage**. Nada sensível aparece (`.env.local`, `.claude/`, `node_modules` ignorados).                                                                |

Observação: a expressão "Co-authored-by" aparece neste arquivo apenas como **texto de documentação**. Não é um trailer de commit.

Pendente: confirmar o e-mail e configurar a identidade local (comandos na resposta final). Repita a verificação depois do primeiro commit: `git log --format='%h %an <%ae>%n%b'` não pode mostrar `Co-authored-by` nem Claude.
