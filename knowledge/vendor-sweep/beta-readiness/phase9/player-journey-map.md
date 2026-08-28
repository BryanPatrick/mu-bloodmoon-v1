---
status: DRAFT
category: beta-readiness/phase9
audience: internal (product/support planning)
lastVerified: 2026-08-28
---

# Mapa da jornada do jogador -- Open Beta (Part A)

| Etapa | Ação do jogador | Resultado esperado | Falhas conhecidas | Artigo de ajuda | Escalação de suporte | Informação faltando |
|---|---|---|---|---|---|---|
| DISCOVER | Encontra o site/redes sociais | Entende o que é o Blood Moon | Nenhuma confirmada | Landing do Open Beta (Part O) | N/A | Conteúdo de marketing final -- fora do escopo de conhecimento |
| CREATE ACCOUNT | Preenche cadastro em `/registrar` | Conta criada | E-mail de ativação: achado de auditoria anterior aponta bloqueio de provedor de e-mail aprovado ainda pendente | FAQ > CONTA | Escalar se o e-mail de confirmação não chegar | Se o bloqueio de e-mail já foi resolvido desde a última auditoria -- não reconfirmado nesta fase |
| DOWNLOAD | Acessa `/downloads`, baixa o Launcher | Arquivo baixado | Nenhuma confirmada (link testado, HTTP 200 em auditoria anterior) | FAQ > DOWNLOAD | Escalar se o link estiver quebrado | N/A |
| INSTALL | Executa o Launcher, aguarda verificação/patch | Launcher abre e verifica o cliente | Não testado ponta a ponta com servidor de jogo real nesta ou em fases anteriores | FAQ > LAUNCHER | Escalar erros de patch/verificação | Comportamento real de primeira instalação (sem cliente prévio) não confirmado |
| LOGIN | Digita usuário/senha no cliente | Entra no jogo | Erro genérico "usuário ou senha inválidos" é proposital (não revela qual está errado) -- não é bug | FAQ > LOGIN | Escalar se credenciais corretas continuarem falhando | N/A |
| CREATE CHARACTER | Cria personagem na tela inicial | Personagem criado | Não pesquisado nesta ou em fases anteriores | Nenhum artigo confiável ainda | Escalar perguntas sobre classes disponíveis | `MISSING_DATA` -- classes, restrições, tela de criação específica do Blood Moon |
| START PLAYING | Entra no mundo pela primeira vez | Personagem no mapa inicial | Não pesquisado | Nenhum artigo confiável ainda | Escalar | `MISSING_DATA` -- mapa inicial, primeira quest/objetivo |
| LEVEL | Caça monstros, sobe de nível | Ganha XP e níveis | Não pesquisado | Nenhum artigo confiável ainda | Escalar | `MISSING_DATA` -- locais recomendados, curva de XP |
| RESET | Chega ao nível 400, usa `/reset` | Reset concedido, 450/500 pontos, volta ao nível 1 | Nenhuma falha conhecida no mecanismo em si | Guia de Reset (`READY_FOR_OPEN_BETA`) | Escalar se o comando falhar com requisito cumprido | Sintaxe exata do comando não testada em cliente |
| MASTER RESET | Tenta usar `/masterreset` | **Comando desativado hoje** -- não deve funcionar | Jogador pode reportar como "bug" sem saber que está desativado por design | Guia de Master Reset (`READY_FOR_OPEN_BETA`) | Não escalar como bug -- é o comportamento esperado atual | Data de ativação futura, se houver (decisão de produto) |
| EVENTS | Tenta `/participar` ou clicar em NPC de evento | Na maioria dos casos, evento não disponível hoje | Jogador pode reportar "comando não funciona" quando na verdade o evento-alvo está desativado | Central de Eventos (`READY_WITH_MINOR_GAPS`) | Não escalar como bug na maioria dos casos -- ver FAQ de eventos (Fase 8) | Datas de ativação futuras dos 17 eventos desativados |
| TRADE / ECONOMY | Tenta trocar itens/moedas com outro jogador | Não pesquisado nesta ou em fases anteriores | `MISSING_DATA` | Nenhum artigo confiável ainda | Escalar | Mecânica de trade não confirmada |
| GUILD | Cria ou entra em uma guild pelo portal | Fluxo completo funciona (testado) | Nenhuma falha conhecida | Guia de Guilds (`READY_FOR_OPEN_BETA`) | Escalar inconsistências de dados (ex.: dois líderes aparentes) como bug crítico | Vínculo entre guild do portal e guild in-game não confirmado |
| COMMUNITY | Usa o feed/perfil de comunidade do portal | Funciona parcialmente (achado de auditoria anterior: dados reais no centro, mocks nas laterais) | Rails/perfil ainda com dados mock em partes secundárias | Nenhum artigo de Fase 9 dedicado | Escalar inconsistências visíveis de conteúdo mock | Já documentado em auditoria anterior, não repesquisado nesta fase |
| SUPPORT | Abre ticket ou pergunta no chat | Recebe resposta | Nenhuma falha técnica conhecida no módulo de suporte (confirmado real em auditoria anterior) | Central de Ajuda (Part J) | N/A -- é o próprio canal de escalação | Tempo de resposta esperado não definido |

## Maiores lacunas de informação nesta jornada

As etapas **CREATE CHARACTER**, **START PLAYING**, **LEVEL** e **TRADE** continuam sem nenhuma evidência real confirmada em qualquer fase deste projeto até agora -- não é uma lacuna nova desta fase, é uma lacuna estrutural que nenhuma fase anterior resolveu porque exigiria pesquisa de vídeo específica ou teste em jogo real, fora do escopo desta fase (Part S: não processar RAW amplamente).
