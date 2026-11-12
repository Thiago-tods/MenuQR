# Progresso

Estado final de cada fase. O detalhe da última auditoria está em [FINAL_RELEASE_AUDIT.md](FINAL_RELEASE_AUDIT.md).

Legenda: ✅ feito e verificado · 🟡 feito, com limitação registrada

| Fase                       | Estado | Observação                                                                                        |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| 0 Auditoria e docs         | ✅     | Diretório vazio; Node 26; sem Docker (Supabase local indisponível).                               |
| 1 Estrutura e design       | ✅     | Next 16, Tailwind 4, Modern Bistro. Terracotta escurecido onde há texto (contraste AA).           |
| 2 Banco e auth             | ✅     | 3 migrations, RLS, gatilhos, seed. RLS testada com usuários reais (36 testes).                    |
| 3 Cardápio público         | ✅     | Dados do banco, 20 fotos com licença, busca, categorias, aberto/fechado.                          |
| 4 Carrinho e checkout      | ✅     | Persistência, validação, preço recalculado no servidor, mesa por código.                          |
| 5 Pedidos e acompanhamento | 🟡     | Acompanhamento por token com polling de 5 s (sem Realtime). Criação do pedido não é transacional. |
| 6 Painel administrativo    | ✅     | Todas as telas e ações exercitadas no navegador e no E2E.                                         |
| 7 QR Code e mesas          | 🟡     | QR decodificado por software e abre a rota certa. Não lido por câmera de celular real.            |
| 8 Testes e segurança       | 🟡     | 43 unitários, 36 de RLS, 32 E2E, axe em 17 telas. Infra real (cabeçalhos de IP) não verificada.   |
| 9 Documentação             | ✅     | README, arquitetura, banco, segurança, testes, deploy, créditos e auditoria final.                |

## Pendências reais

- Cabeçalhos de IP em hospedagem real (nunca implantado).
- Limitador de requisições compartilhado entre instâncias (hoje em memória).
- Supabase Realtime (hoje polling) e função SQL transacional para criar pedidos.
- Dispositivos reais (celular, tablet), câmera para QR e leitor de tela.
- Fotos ilustrativas: troque pelas do cardápio real.
