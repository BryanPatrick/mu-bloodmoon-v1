# Guild — Limitações Conhecidas e Backlog

**Status:** BETA READY · **Baseline commit:** `a2c8e77` · **Última revisão:** 2026-08-18

> Esta página existe para ser honesta sobre o que **não** existe hoje, sem prometer prazos. Para a lista completa e detalhada de ideias de produto futuras (com formato PURPOSE/CURRENT_STATUS/OPEN_QUESTIONS/etc. por item), ver o documento já existente: **[`docs/guild-product-backlog.md`](../../guild-product-backlog.md)**. Este arquivo não duplica aquele — apenas resume o que está fora do escopo atual e aponta para lá.

## Não implementado, registrado no backlog de produto

Todos os itens abaixo existem apenas como ideia de produto, sem código, sem modelo de dados ativo e sem endpoint. Detalhes de cada um em `docs/guild-product-backlog.md`.

- **Tela de histórico/auditoria da guild (audit log UI)** — todo evento relevante já é registrado no backend (`ObservabilityService`), mas não existe nenhuma tela que exiba esse histórico ao jogador. Considerado P2/pós-beta.
- **Cargos customizáveis (custom ranks)** — hoje os cinco papéis (Líder, Oficial, Tesoureiro, Membro, Recruta) são fixos; não é possível a uma guilda criar seus próprios títulos ou permissões granulares.
- **Sistema de notificações** — não existe nenhuma notificação automática (push, e-mail, sino) para eventos de guilda (convite recebido, solicitação aprovada, etc.); o jogador só descobre visitando o Painel ou o perfil da guilda.
- **Diretório avançado** — filtros adicionais além dos quatro reais hoje (recrutamento, ordenação, foco único, busca por nome/tag) — por exemplo, filtro por "Power" ou por atividade recente — não existem.
- **Eleições internas (governance)** — nenhuma forma de votação ou eleição de cargos existe; toda promoção/rebaixamento é decisão unilateral do Líder.
- **Contribuição como eixo separado de Power** — não existe hoje nenhum sistema de pontuação de contribuição além do campo `contributionScore`, que existe no banco mas **nunca é incrementado por nenhum código atual** — sempre zero na prática.
- **Guild Level real/futuro** — o campo `Guild Level`/`Guild XP` existe e é exibido, mas não há regra real de progressão: depositar recursos na Tesouraria nunca gera XP, e a única forma prevista de conversão (`GuildXpConversionRule`, um "resource sink" irreversível e auditado) existe no schema mas **nenhum endpoint executa essa conversão hoje** — `active` nasce sempre `false`.
- **Guild Quests / Guild Goals** — conceitos futuros e distintos do sistema de Projetos (`GuildProject`) atual, que já é real e funcional; não confundir os dois.
- **Guild Resources** — sistema de recursos coletivos além da Tesouraria/Cofre atuais (que já são reais, mas somente leitura) não existe.
- **Conquistas (Achievements)** — nem individuais nem coletivas; a aba "Conquistas" no perfil é uma tela de texto explicando que a funcionalidade ainda não existe, sem nenhum modelo de dados por trás.
- **Rankings avançados** — nenhum ranking de guildas por poder, atividade ou qualquer métrica composta existe; a ordenação do diretório é limitada a nível, membros e nome.
- **Gear Score** — não existe nenhum cálculo de força de equipamento de personagem conectado à guilda.
- **Temporadas (seasons)** — nenhum conceito de temporada/reset sazonal aplicado a guildas existe.
- **Alianças entre guildas** — a aba "Alianças" no perfil é uma tela explicando o conceito futuro, sem nenhuma funcionalidade real.
- **Sincronização com a guild real do jogo** — os campos para uma ponte futura (`gameGuildId`, `gameGuildName`, `gameGuildTag`, `syncStatus`) já existem no schema, mas nenhuma lógica de sincronização roda hoje; toda guild criada pelo portal é `source: PORTAL` / `syncStatus: NOT_LINKED`.

## Observações técnicas conhecidas (não são bugs confirmados nem itens de backlog — são comportamentos atuais documentados para não serem redescobertos como "novidade")

### Limite de 20 resultados na busca de candidatos a convite

`inviteCandidates()` (busca de personagens para convidar) retorna no máximo **20 resultados**, ordenados por nome alfabético. Em uso normal (poucos personagens cadastrados por termo de busca), isso nunca é perceptível. Foi observado, durante uma rodada extensa de testes automatizados locais que gerou centenas de personagens com nomes parecidos, que um personagem específico pode ficar fora dos 20 primeiros resultados alfabéticos e "não aparecer" na busca mesmo sendo elegível. **Isso não foi corrigido nesta rodada** — é uma característica atual do endpoint, registrada aqui para contexto de produto, não uma falha confirmada em uso real.

### `GuildJoinRequestStatus.EXPIRED` e `GuildRequestStatus.EXPIRED` sem mecanismo de expiração

Ambos os enums incluem um valor `EXPIRED`, mas nenhum código atual atribui esse status automaticamente — não existe nenhum job, cron ou verificação de tempo que expira convites, solicitações de entrada ou solicitações de recurso antigas. Um `GuildJoinRequest`/`GuildRequest` `PENDING`/`DRAFT`/`OPEN` permanece nesse estado indefinidamente até uma decisão humana explícita.

### `contributionScore` sempre zero

O campo existe em `GuildMember` e é exibido na tabela de membros, mas nenhum caminho de código atual o incrementa — na prática, todo membro mostra contribuição zero, sempre, até que um sistema real de contribuição seja implementado (ver backlog).

### Tesouraria e Cofre são reais, mas somente leitura

Não é uma limitação escondida — está documentado explicitamente na interface (badge "Preview" na navegação, texto "nenhuma movimentação é possível nesta etapa" nas próprias abas) — mas vale reforçar aqui: os saldos existem de verdade no banco (semeados na criação da guilda), porém **nenhum endpoint os altera**. Qualquer expectativa de depósito/saque real deve ser tratada como funcionalidade futura, não um bug do que já existe.

## O que este documento explicitamente não cobre

Este documento não repete o conteúdo funcional já coberto em [01 — Especificação Funcional](01-functional-specification.md), nem a tabela de permissões já coberta em [05 — Permissões e Segurança](05-permissions-and-security.md). Para o roadmap completo, priorização Beta-vs-Futuro, e o formato detalhado por item (incluindo decisões de produto já tomadas, como `MASTER_RESET_IN_POWER=NO` e `SECRET_BALLOT=YES` para uma futura eleição), consulte **[`docs/guild-product-backlog.md`](../../guild-product-backlog.md)** — o documento oficial de backlog, não duplicado aqui.
