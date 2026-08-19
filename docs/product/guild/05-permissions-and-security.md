# Guild — Permissões e Segurança

**Status:** BETA READY · **Baseline commit:** `a2c8e77` · **Última revisão:** 2026-08-18

> Auditado diretamente de `guilds.service.ts` (chamadas `assertRole`/`actingMembership`), `guilds.controller.ts` (guards) e `apps/api/src/modules/auth/step-up.guard.ts`. Cada linha da tabela abaixo corresponde a uma checagem real no código, não a uma suposição de design.

## Tabela: Ação × Papel

`✅` = permitido · `❌` = bloqueado no backend (403/400, não apenas escondido na UI) · `—` = não aplicável (ação não depende de papel dentro da guild)

| Ação | LEADER | OFFICER | TREASURER | MEMBER | RECRUIT | Observação |
|---|---|---|---|---|---|---|
| Ver perfil/diretório da guild | — | — | — | — | — | Público, sem necessidade de membership nem login |
| Entrar (OPEN) | — | — | — | — | — | Requer apenas ser dono do personagem, sem membership ativa em nenhuma guild |
| Solicitar entrada (APPROVAL_REQUIRED) | — | — | — | — | — | Idem |
| Editar perfil da guild | ✅ | ✅ | ❌ | ❌ | ❌ | `assertRole(['LEADER','OFFICER'])` |
| Upload de emblema/banner | ✅ | ✅ | ❌ | ❌ | ❌ | Mesmo guard do editar perfil |
| Convidar jogador (INVITE_ONLY etc.) | ✅ | ✅ | ❌ | ❌ | ❌ | `inviteToGuild` |
| Cancelar convite pendente | ✅ | ✅ | ❌ | ❌ | ❌ | `cancelInvite` |
| Buscar candidatos a convite | ✅ | ✅ | ❌ | ❌ | ❌ | `inviteCandidates` |
| Ver solicitações de entrada pendentes | ✅ | ✅ | ❌ | ❌ | ❌ | `joinRequests` |
| Aprovar/rejeitar solicitação de entrada | ✅ | ✅ | ❌ | ❌ | ❌ | `approveJoinRequest` / `rejectJoinRequest` |
| Remover membro (kick) | ✅ | ✅ | ❌ | ❌ | ❌ | Nunca contra o LEADER, mesmo por outro OFFICER |
| **Alterar papel de outro membro** | ✅ | ❌ | ❌ | ❌ | ❌ | **Exclusivo do LEADER** — `assertRole(['LEADER'])`, mais restrito que kick |
| **Transferir liderança** | ✅ | ❌ | ❌ | ❌ | ❌ | Mesmo endpoint de troca de papel, LEADER-only |
| **Encerrar guild (disband)** | ✅ | ❌ | ❌ | ❌ | ❌ | LEADER-only **+ step-up obrigatório** |
| Criar projeto | ✅ | ✅ | ✅ | ❌ | ❌ | `assertRole(['LEADER','OFFICER','TREASURER'])` |
| Editar/cancelar projeto | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ = apenas se for o criador (`ownerAccountId`) do projeto |
| Criar solicitação de recurso (`GuildRequest`) | ✅ | ✅ | ✅ | ✅ | ✅ | Qualquer membro ativo, `actingMembership` sem checagem de papel |
| Editar/cancelar solicitação de recurso | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | LEADER/OFFICER sempre; TREASURER/MEMBER/RECRUIT apenas se forem o criador |
| Sair da guild | ✅* | ✅ | ✅ | ✅ | ✅ | *LEADER só pode sair sozinho (sem outros membros ativos), senão precisa transferir antes |
| Aceitar/recusar convite recebido | — | — | — | — | — | Autorização por **posse da conta convidada** (`invite.accountId === user.id`), não por papel — o convidado ainda não é membro |

## Autoridade do backend, não da interface

Todo cálculo de papel feito no frontend (`canManage`, `isLeader` em `GuildProfileTabs.vue`, `canManage` prop em `GuildProfileHeader.vue`) existe **apenas para decidir o que mostrar na tela**. Uma chamada direta à API por um usuário sem o papel exigido recebe o mesmo 403/400 do backend independentemente do que a interface exibia — confirmado em múltiplos testes E2E que chamam os endpoints diretamente com tokens de contas sem o papel necessário, sem passar pela UI.

## Regras de integridade garantidas pelo domínio

- **`characterId` é globalmente único** em `GuildMember` (constraint real do banco) — um personagem nunca pertence a mais de uma guild ativa ao mesmo tempo, por construção.
- **Exatamente um LEADER por guild, sempre** — garantido na mesma transação em toda operação que altera papéis (promoção via troca de papel tratada como transferência, transferência dedicada, ambas rebaixam qualquer LEADER anterior antes de promover o novo).
- **Guild ativa como pré-condição de escrita**: operações que alteram membership (entrar, aceitar convite, aprovar solicitação, trocar papel, remover) reverificam `guild.status === 'ACTIVE'` **no momento da escrita**, não apenas na leitura inicial — uma guild sendo encerrada no meio de qualquer uma dessas operações faz a operação falhar de forma limpa, nunca deixa um membro "órfão" numa guild encerrada.
- **Colisão de slug** na criação é protegida pela constraint única real do banco (`Guild.slug`), não apenas por uma checagem prévia — duas criações simultâneas com nomes que gerariam o mesmo slug nunca resultam em duas guilds com o mesmo slug.
- **Step-up** (`StepUpGuard`) é uma segunda camada de autenticação, independente do papel: mesmo um LEADER autenticado e autorizado por papel não consegue encerrar a guild sem um token de step-up válido, obtido separadamente confirmando a senha atual (e o segundo fator, se ativado) — token expira em 5 minutos e é vinculado à sessão atual.
- **Auditoria**: toda mutação relevante do domínio (criação, atualização, convite criado/aceito/recusado/cancelado, solicitação criada/aprovada/rejeitada, membro entrou/saiu/foi removido, papel alterado, liderança transferida, guild encerrada, mídia enviada) gera um evento em `ObservabilityService.recordOperationalEvent`, com `module: 'guilds'`. Não existe hoje uma tela de UI dedicada para consultar esse histórico (ver [07 — Limitações Conhecidas](07-known-limitations-and-backlog.md)).
- **Validação de entrada**: todo texto livre recebido do cliente (nome, tag, descrição, motivo de remoção, mensagens de convite/solicitação) passa por `requiredText()` no backend, com limites mínimos e máximos por campo, e é sempre `.trim()`-ado — nunca confia apenas na validação client-side.
- **Validação de upload**: ver [01 — seção 7](01-functional-specification.md#7-media-emblema-e-banner) — verificação real de magic bytes, não apenas extensão/MIME declarados.

## Concorrência / Integridade

Esta seção documenta o padrão de proteção contra corrida de dados usado consistentemente no domínio de Guild, sem entrar em detalhes de implementação desnecessários.

**O problema geral:** duas requisições HTTP quase simultâneas (por exemplo, dois líderes de guilds diferentes aceitando convites do mesmo personagem ao mesmo tempo) podem, se o código não for cuidadoso, ambas parecerem ter dado certo — um "falso sucesso" que corrompe silenciosamente o estado do sistema.

**A garantia esperada, sempre:**
- **Exatamente uma membership ativa por personagem**, nunca zero por engano nem duas.
- **Exatamente um LEADER por guild**, nunca zero nem dois.
- **Nunca um falso sucesso** — quando duas operações competem pelo mesmo recurso, exatamente uma reporta sucesso e a outra recebe um erro controlado e compreensível (nunca um erro de servidor genérico, nunca as duas reportando sucesso).

**Como isso é garantido, em termos gerais:**
- A criação de uma membership nova usa uma inserção real no banco (`create()`), que aproveita a constraint de unicidade do `characterId` como a rede de segurança de fato — a segunda tentativa concorrente colide de verdade com essa restrição e é convertida num erro de negócio compreensível (não um erro cru de banco).
- O reingresso legítimo de um personagem que já teve uma membership removida antes (kick, saída) usa uma atualização condicional que só se aplica se, **no exato momento da escrita**, aquela linha ainda estiver marcada como removida — cobrindo tanto o caso normal (reingresso) quanto o caso de corrida (perder a disputa) com o mesmo mecanismo.
- Toda transição de estado de convite/solicitação (PENDING → ACEITO/APROVADO) acontece **na mesma transação** que a criação da membership — se a membership falhar por qualquer motivo (incluindo perder uma corrida), a transição de estado é revertida junto (rollback completo), então nunca existe um convite marcado como aceito apontando para uma membership que não existe ou que foi parar em outra guild.
- Encerrar uma guild (disband), transferir liderança, trocar papel e remover membro todos reverificam as condições relevantes (guild ativa, membro ainda ativo, papel ainda correto) no momento exato da escrita, não apenas numa leitura anterior — fechando a janela entre "ler o estado" e "escrever a mudança" que é onde corridas normalmente escapam.

**Cobertura de teste:** os cenários de corrida abaixo têm teste E2E dedicado e determinístico (repetido em loop para não depender de sorte de timing), todos verdes no baseline `a2c8e77`:

- Aceitar convite × aceitar convite (mesmo personagem, guilds diferentes).
- Aprovar solicitação × aprovar solicitação (mesmo personagem, guilds diferentes).
- Aceitar convite × aprovar solicitação (fluxo cruzado, mesmo personagem, guilds diferentes).
- Entrar (OPEN) × aceitar convite (mesmo personagem, guilds diferentes).
- Transferência de liderança × transferência de liderança (mesma guild).
- Remoção × transferência de liderança (mesmo alvo).
- Troca de papel × troca de papel (mesmo alvo).
- Encerramento × transferência de liderança × troca de papel (mesma guild, três operações simultâneas).
- Criação de guild × criação de guild (mesmo nome, contas diferentes).
