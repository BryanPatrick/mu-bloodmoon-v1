# Guild — Documentação do Módulo

**Status:** BETA READY
**Baseline commit:** `a2c8e77`
**Última revisão:** 2026-08-18

## Aviso importante

**O código é a fonte da verdade.** Toda esta documentação foi produzida auditando diretamente o código-fonte do módulo de Guild no commit acima (backend, frontend, schema, testes), não a partir de relatórios anteriores, memória de projeto ou intenções de produto. Sempre que uma ideia existe apenas no backlog e não no código, ela está explicitamente marcada como **FUTURE / NOT IMPLEMENTED** nos documentos abaixo — nunca descrita como se já funcionasse.

Se o produto evoluir depois deste commit, esta documentação pode ficar desatualizada em pontos específicos. Antes de tratar qualquer afirmação aqui como definitiva para uma decisão importante, vale conferir contra o código atual.

## Objetivo desta documentação

Servir como referência oficial e detalhada do módulo de Guild para quatro públicos diferentes, cada um com seu próprio documento:

| Documento | Público principal | Do que trata |
|---|---|---|
| [01 — Especificação Funcional](01-functional-specification.md) | Equipe técnica / produto | Como o módulo funciona hoje, em detalhe completo — a fonte de verdade funcional |
| [02 — Guia do Jogador](02-user-guide.md) | Jogadores / usuários finais | Passo a passo em linguagem natural para cada ação disponível |
| [03 — Guia do Tester](03-tester-guide.md) | Beta testers | Roteiro operacional de testes, casos numerados, como reportar bugs |
| [04 — Visão Executiva](04-executive-overview.md) | Sócios / gestão | O que a Guild entrega, por que importa, status atual — leitura de poucos minutos |
| [05 — Permissões e Segurança](05-permissions-and-security.md) | Equipe técnica / produto | Tabela ação × papel, autoridade do backend, proteções de concorrência |
| [06 — Fluxos e Transições de Estado](06-flows-and-state-transitions.md) | Equipe técnica / produto | Diagramas do ciclo de vida da Guild, recrutamento, convites e solicitações |
| [07 — Limitações Conhecidas e Backlog](07-known-limitations-and-backlog.md) | Todos | O que ainda não existe, honestamente, mais link para o backlog completo |
| [08 — Catálogo de Ajuda Contextual](08-contextual-help-catalog.md) | Produto / futuro portal | Candidatos a botões "?" na interface, para uso futuro |

## Sobre o módulo

A Guild é o sistema de organizações de jogadores do Blood Moon: criação, perfil, recrutamento (aberto, por aprovação, por convite ou fechado), gestão de membros e papéis, transferência de liderança e encerramento — com tesouraria, cofre e projetos internos já modelados no banco (parte deles ainda somente leitura). Não há sincronização com a guild real do jogo nesta fase; toda guild criada pelo portal é `source: PORTAL`.

## Como esta documentação foi produzida

Auditoria completa do código no commit `a2c8e77`, incluindo:

- Schema Prisma (models, enums, relações, `onDelete`) — `apps/api/prisma/schema.prisma`
- Service layer — `apps/api/src/modules/guilds/guilds.service.ts`, `guilds-media.service.ts`
- Controller e contratos — `guilds.controller.ts`, `guilds.contract.ts`
- Guards e autenticação de segundo fator (step-up) — `apps/api/src/modules/auth/`
- Suíte de testes E2E — `apps/api/test/guilds.e2e-spec.ts` (108 testes)
- Componentes e páginas do portal — `apps/web/components/guild/`, `apps/web/pages/guild*`, `apps/web/pages/painel`
- Composable de API — `apps/web/composables/useGuildsApi.ts`
- README técnico já existente do módulo — `apps/api/src/modules/guilds/README.md`
- Backlog de produto já existente — `docs/guild-product-backlog.md`

Nenhum código foi alterado para produzir esta documentação. Esta é uma tarefa somente de documentação.

## Manutenção futura

Ao atualizar esta documentação após mudanças no código, atualizar a linha `Baseline commit` acima e, quando fizer sentido, registrar `Last verified against commit: <hash>` no topo do documento específico que foi reconferido.
