---
status: DRAFT
category: beta-readiness/phase9
audience: mixed -- READY/PARTIAL questions are player-facing candidates; POLICY_REQUIRED/UNKNOWN/TECHNICAL_REQUIRED are internal-only until resolved
lastVerified: 2026-08-28
publish: NOT_PUBLISHED -- draft only
---

# FAQ completo -- Open Beta (Part D)

Status: `READY` (resposta confirmada, publicável), `PARTIAL` (parte confirmada, parte não), `POLICY_REQUIRED` (decisão de produto pendente), `TECHNICAL_REQUIRED` (depende de verificação técnica/Codex), `UNKNOWN` (sem evidência).

## ACCOUNT

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Como crio uma conta? | Cadastro em `/registrar` | `READY` | Auditoria anterior, `apps/api/src/modules/auth` | N/A |
| Recebo e-mail de confirmação? | **Correção Fase 10**: Não existe e-mail de confirmação de cadastro -- a conta é criada ativa imediatamente, sem etapa de ativação (confirmado por leitura direta do código real, `auth.service.ts`). Você pode logar assim que se cadastrar. | `READY` | Fase 10, `apps/api/src/modules/auth/auth.service.ts` (leitura direta) | N/A |
| E se eu esquecer minha senha e não receber o e-mail de recuperação? | Esse é um fluxo diferente (recuperação de senha, não cadastro) -- pode haver um bloqueio de infraestrutura de e-mail pendente de confirmação técnica | `TECHNICAL_REQUIRED` | `docs/handoff/auth-recovery-provider-blocker.md` | Escalar para Codex/produção |
| Posso ter mais de uma conta? | Não pesquisado | `UNKNOWN` | -- | Escalar |

## DOWNLOAD

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Onde baixo o cliente/launcher? | `/downloads` | `READY` | Auditoria anterior (link testado HTTP 200) | N/A |
| O download funciona em Mac/Linux? | Não pesquisado -- launcher é aplicação Windows (.NET/WPF) | `PARTIAL` | Conhecimento de arquitetura do projeto | Escalar |

## INSTALLATION

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Preciso de requisitos mínimos? | Não confirmado nesta ou em fases anteriores | `UNKNOWN` | -- | Escalar |
| O instalador pede antivírus desligado? | Não deveria ser necessário -- não confirmar isso ao jogador | `UNKNOWN` | -- | Escalar, nunca instruir a desligar antivírus |

## LAUNCHER

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| O launcher atualiza sozinho? | Sim, mecanismo real de auto-update com RSA-2048 + SHA-256 confirmado no código | `READY` | Auditoria anterior, `apps/launcher/Services/PatchService.cs` | Escalar falhas de patch |
| O launcher trava ao abrir | Sem causa conhecida documentada | `UNKNOWN` | -- | Escalar com print/log |

## LOGIN

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Erro "usuário ou senha inválidos" | Mensagem proposital, não revela qual está errado -- não é bug | `READY` | Auditoria anterior, `auth.service.ts` | Escalar só se credenciais confirmadas corretas continuarem falhando |
| Esqueci minha senha | Fluxo de recuperação existe, mas depende do e-mail (ver ACCOUNT) | `PARTIAL` | -- | Escalar |

## CHARACTER

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Quais classes existem? | **Atualização Fase 10**: 7 classes reais confirmadas (códigos reais: dw, dk, elf, mg, dl, su, rf, encontrados no texto real do servidor). Quais são selecionáveis na criação inicial vs. desbloqueadas depois não foi confirmado. | `PARTIAL` | Fase 10, `Data/Character/DefaultClassInfo.txt` + `Data/Lang/Por/Message.txt` (leitura real direta) | Escalar dúvidas sobre disponibilidade na criação |
| Quantos personagens por conta? | Não confirmado | `UNKNOWN` | -- | Escalar |

## LEVELING

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Onde devo caçar no início? | Não confirmado -- não inventamos uma recomendação | `UNKNOWN` | -- | Escalar |
| Existe boost de XP para novos jogadores? | Não confirmado | `UNKNOWN` | -- | Escalar |

## RESET

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Como funciona o Reset? | Nível 400, sem custo, 450/500 pontos, teto 20/50 conforme faixa de conta | `READY` | `CONFIRMED_BY_CONFIG`, guia de Reset | N/A |
| Existe requisito de reset para Blood Castle etc.? | Não hoje -- mecanismo existe mas está desligado | `READY` | `CONFIRMED_BY_CONFIG` | N/A |

## MASTER_RESET

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Existe Master Reset? | O comando existe mas está **desativado hoje** | `READY` | `CONFIRMED_BY_CONFIG` | Não escalar como bug |
| Quando será ativado? | Não definido | `POLICY_REQUIRED` | -- | Escalar para produto |

## EVENTS

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Quais eventos estão ativos? | **Atualização Fase 10**: 4 eventos confirmados ativos -- Leilão (Auction), Blood Castle, Chaos Castle e Devil Square (com agenda automática real). Illusion Temple está desativado. | `READY` | `CONFIRMED_BY_CONFIG`, event-registry.json (Fase 10) | N/A |
| Como entro no Blood Castle/Chaos Castle/Devil Square? | Nível exigido confirmado por sub-nível (ver guia de Eventos); método exato de entrada (NPC/mapa) ainda não confirmado | `PARTIAL` | Fase 10, Data/Event/*.dat | Escalar se o nível estiver correto e a entrada falhar |
| Por que `/participar` não funciona? | O comando funciona; o evento-alvo provavelmente está desativado (nenhum dos 4 eventos clássicos usa `/participar`, mesmo os 3 ativos) | `READY` | participar-command-reconciliation.md | Não escalar como bug na maioria dos casos |
| Quando os outros eventos serão ativados? | Não definido | `POLICY_REQUIRED` | -- | Escalar para produto |

## COMMANDS

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Quais comandos posso usar? | Ver Command Center (Part I) | `READY` (lista), `PARTIAL` (sintaxe exata) | `CONFIRMED_BY_CONFIG` para existência | Escalar comandos que não respondem |

## ITEMS

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Como funciona empacotar joias? | `/pack` e `/unpack`, tipos: bless/soul/life/creation/guardian/genstone/harmony/chaos | `READY` | `CONFIRMED_BY_CONFIG` | N/A |
| Perdi um item, o que faço? | Reportar via suporte, nunca prometer restauração automática | `READY` (processo), `UNKNOWN` (garantia de restauração) | support-runbook.md | Sempre escalar |

## TRADE

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Como faço trade com outro jogador? | Não confirmado nesta ou em fases anteriores | `UNKNOWN` | -- | Escalar |

## MARKET

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Como uso o Market? | Confirmado que existe e está ativo; mecânica de uso não documentada | `PARTIAL` | `CONFIRMED_BY_CONFIG` (existência) | Escalar |

## GUILD

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Como crio uma guild? | Fluxo real no portal, testado | `READY` | Código real, guia de Guilds | N/A |
| Como transfiro liderança? | Fluxo real, testado (nunca zero/dois líderes) | `READY` | Código real | Escalar qualquer inconsistência como bug crítico |

## RANKING

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Existe ranking? | Ranking geral desativado; ranking de bosses ativo | `READY` | `CONFIRMED_BY_CONFIG` | N/A |
| O ranking aparece no site? | Achado de auditoria anterior: página do site era um stub vazio -- não reconfirmado nesta fase | `TECHNICAL_REQUIRED` | Auditoria anterior | Escalar para Codex/produção |

## COMMUNITY

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Como uso o feed de comunidade? | Existe, dados reais no centro, mocks em partes secundárias (achado de auditoria anterior) | `PARTIAL` | Auditoria anterior | Escalar dados visivelmente falsos |

## WIKI

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Onde encontro informação do jogo? | Wiki do portal (quando publicada) | `POLICY_REQUIRED` (data de publicação) | -- | N/A |

## BUG_REPORT

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Como reporto um bug? | Template estruturado, ver guia de Bug Hunters | `READY` | Part L desta fase | N/A |
| Ganho recompensa por reportar? | "Relatórios confirmados e úteis poderão contar para recompensas no lançamento" -- sem valor prometido | `POLICY_REQUIRED` | Instrução explícita desta fase | Escalar perguntas sobre valor exato |

## SECURITY

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Minha conta foi invadida, o que faço? | Escalar sempre -- nunca pedir senha por qualquer canal | `READY` (processo) | support-runbook.md | Sempre escalar |
| Existe 2FA? | Sim, real e completo (confirmado em auditoria anterior) | `READY` | Auditoria anterior | N/A |

## F2P

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| O servidor é gratuito? | Existe uma faixa de conta gratuita confirmada (AL0); benefícios exatos de cada faixa não definidos | `POLICY_REQUIRED` | -- | Escalar para produto |

## RMT

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Posso comprar/vender itens com dinheiro real? | Nenhuma política definida ainda | `POLICY_REQUIRED` | policy-required-decisions.md | Escalar para produto, nunca confirmar/negar informalmente |

## CLAN_RECEPTION

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Existe recompensa por migrar meu clã de outro servidor? | Nenhuma evidência de que esse recurso existe; nenhuma política definida | `POLICY_REQUIRED` | policy-required-decisions.md | Escalar para produto |

## STAFF

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| Como me tornar staff/GM? | Nenhuma regra de recrutamento definida | `POLICY_REQUIRED` | policy-required-decisions.md | Escalar para produto |

## OPEN_BETA

| Pergunta | Resposta curta | Status | Fonte | Escalação |
|---|---|---|---|---|
| O que é o Open Beta? | Ver copy da Part O | `POLICY_REQUIRED` (datas/regras finais) | Part O desta fase | N/A |
| O que acontece com meu personagem depois do Beta? | Não definido | `POLICY_REQUIRED` | -- | Escalar para produto |
