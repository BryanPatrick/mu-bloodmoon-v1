# Guild — Especificação Funcional

**Status:** BETA READY · **Baseline commit:** `a2c8e77` · **Última revisão:** 2026-08-18

> Este documento descreve exatamente o que o módulo de Guild faz hoje, auditado diretamente do código-fonte. Onde algo existe apenas como ideia de produto (backlog), está marcado explicitamente como **FUTURE / NOT IMPLEMENTED**. Para a tabela completa de permissões e para os diagramas de estado, ver [05 — Permissões e Segurança](05-permissions-and-security.md) e [06 — Fluxos e Transições de Estado](06-flows-and-state-transitions.md).

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Guild Roles](#2-guild-roles)
3. [Diretório de Guilds](#3-diretório-de-guilds)
4. [Criação Self-Service](#4-criação-self-service)
5. [Perfil da Guild](#5-perfil-da-guild)
6. [Edição de Perfil](#6-edição-de-perfil)
7. [Media (Emblema e Banner)](#7-media-emblema-e-banner)
8. [Recruitment Modes](#8-recruitment-modes)
9. [OPEN — Entrada Direta](#9-open--entrada-direta)
10. [APPROVAL_REQUIRED — Solicitação](#10-approval_required--solicitação)
11. [INVITE_ONLY — Convite](#11-invite_only--convite)
12. [CLOSED — Fechado](#12-closed--fechado)
13. [Busca de Candidatos a Convite](#13-busca-de-candidatos-a-convite)
14. [Lista de Membros](#14-lista-de-membros)
15. [Gestão de Papéis (Role Management)](#15-gestão-de-papéis-role-management)
16. [Remoção de Membro (Kick)](#16-remoção-de-membro-kick)
17. [Sair da Guild (Leave)](#17-sair-da-guild-leave)
18. [Transferência de Liderança](#18-transferência-de-liderança)
19. [Encerramento (Disband)](#19-encerramento-disband)
20. [Tesouraria (Treasury)](#20-tesouraria-treasury)
21. [Cofre (Vault)](#21-cofre-vault)
22. [Projetos (Projects)](#22-projetos-projects)
23. [Solicitações de Recursos (Requests)](#23-solicitações-de-recursos-requests)
24. [Estados de Loading / Empty / Error](#24-estados-de-loading--empty--error)
25. [Responsividade](#25-responsividade)

---

## 1. Visão Geral

A Guild é o sistema de organizações de jogadores do Blood Moon dentro do portal. Ela existe para dar a grupos de jogadores um espaço formal de identidade (nome, tag, emblema, banner, descrição, focos), recrutamento controlado e gestão hierárquica de membros — independente da guild real dentro do jogo em si.

**Conceitos principais:**

- **Guild**: a organização. Tem `status` (`ACTIVE`, `DISBANDED`, `SUSPENDED`), um `slug` público único, `name`/`tag` visíveis, e um modo de recrutamento.
- **GuildMember**: o vínculo entre um **personagem** (não uma conta) e uma guild, com um papel (`roleKey`). Um personagem pertence a no máximo uma guild ativa por vez.
- **Membership é por personagem, não por conta.** Uma conta com dois personagens pode, em tese, ter um personagem em uma guild e outro personagem em outra guild (ou em nenhuma) simultaneamente.
- **Sincronização com o jogo**: **não implementada nesta fase.** Toda guild criada pelo portal nasce com `source: PORTAL` e `syncStatus: NOT_LINKED`. Os campos para uma futura ponte com a guild real do jogo (`gameGuildId`, `gameGuildName`, `gameGuildTag`) já existem no schema, mas nenhuma lógica os preenche ou usa hoje.

**Ciclo de vida completo (visão de alto nível):**

```
Criação (self-service ou administrativa)
    ↓
Guild ACTIVE — perfil editável, recrutamento configurável, membros entram/saem/são geridos
    ↓
Encerramento (Disband) pelo LEADER, ou ação administrativa
    ↓
Guild DISBANDED — histórico preservado, removida do diretório público, sem novas ações possíveis
```

Existe também o status `SUSPENDED` (ação exclusivamente administrativa, fora do escopo deste documento voltado ao fluxo do jogador — ver `guilds-admin.service.ts` para o painel de administração).

## 2. Guild Roles

Existem exatamente cinco papéis, definidos no código (`ROLE_VOCABULARY` em `guilds.service.ts`) e livres de texto no banco (`GuildMember.roleKey`, não um enum do banco — a lista de papéis válidos é validada apenas na camada de serviço).

| Papel (interno) | Tradução exibida na UI |
|---|---|
| `LEADER` | **Líder** |
| `OFFICER` | **Oficial** |
| `TREASURER` | **Tesoureiro** |
| `MEMBER` | **Membro** |
| `RECRUIT` | **Recruta** |

### LEADER (Líder)

- **Propósito**: autoridade máxima da guild. Existe exatamente um LEADER ativo por guild, sempre — o sistema garante essa invariante em toda operação que toca papéis (ver [Permissões e Segurança](05-permissions-and-security.md#concorrência--integridade)).
- **Pode**: tudo que OFFICER pode, mais: alterar o papel de qualquer outro membro (promover/rebaixar), transferir a liderança, encerrar (disband) a guild.
- **Não pode**: alterar o próprio papel pelo endpoint genérico de troca de papel (isso é bloqueado explicitamente — trocar o próprio papel de LEADER só acontece via o fluxo dedicado de transferência de liderança); sair da guild enquanto houver outros membros ativos (deve transferir a liderança primeiro).
- **Diferença central**: é o único papel que pode alterar papéis de outros membros e o único que pode encerrar a guild.

### OFFICER (Oficial)

- **Propósito**: braço de gestão operacional da guild, sem a autoridade final do LEADER.
- **Pode**: editar o perfil da guild (nome, tag, descrição, recrutamento, focos), enviar upload de emblema/banner, convidar jogadores, cancelar convites pendentes, aprovar/rejeitar solicitações de entrada, remover (kick) membros que não sejam o LEADER.
- **Não pode**: alterar o papel de outro membro (isso é **exclusivo do LEADER** — um OFFICER que tenta usar o endpoint de troca de papel recebe 403), transferir liderança, encerrar a guild.
- **Diferença central**: tem quase toda a autoridade de gestão do dia a dia, mas não decide hierarquia nem o destino final da guild.

### TREASURER (Tesoureiro)

- **Propósito**: papel voltado a projetos/recursos internos da guild.
- **Pode**: criar projetos da guild (`GuildProject`) — junto com LEADER e OFFICER.
- **Não pode**: nenhuma das ações de LEADER/OFFICER acima (editar perfil, convidar, aprovar solicitações, kickar, etc.) — o código não concede esse papel nenhuma autoridade além da criação de projetos.
- **Diferença central**: é o papel mais restrito entre os "acima de Membro" — hoje, na prática, sua única autoridade adicional documentável no código é sobre Projetos.

### MEMBER (Membro)

- **Propósito**: papel padrão de um membro comum, sem função de gestão.
- **Pode**: ver o perfil e as abas da guild, sair da guild, criar Solicitações de Recursos (`GuildRequest`) e editar/cancelar as que criou.
- **Não pode**: nenhuma ação de gestão (editar perfil, convidar, aprovar, kickar, trocar papéis, criar projetos, transferir liderança, encerrar).

### RECRUIT (Recruta)

- **Propósito**: papel de entrada, sem privilégios de gestão — tecnicamente idêntico a MEMBER em termos de autoridade no código atual (nenhuma checagem de papel trata RECRUIT de forma diferente de MEMBER), mas semanticamente distinto (um "novo membro" recém-aceito pode começar como RECRUIT dependendo do fluxo, e ser promovido a MEMBER depois).
- **Pode**: as mesmas ações que MEMBER (ver perfil, abas, sair, criar solicitações de recursos).
- **Não pode**: as mesmas restrições de MEMBER.

> **Nota de precisão**: nem `join()` nem `acceptInvite()`/`approveJoinRequest()` atribuem `RECRUIT` automaticamente — todo caminho de entrada real (OPEN, aprovação, convite) atribui `roleKey: 'MEMBER'` diretamente. `RECRUIT` só aparece hoje quando atribuído manualmente por um LEADER via troca de papel, ou em fixtures de teste. Não inventar um fluxo automático de "todo novo membro entra como Recruta" — isso não existe no código atual.

## 3. Diretório de Guilds

**Onde fica:** `/guilds` — página pública, sem necessidade de login para visualizar.

**Quem pode acessar:** qualquer visitante. O botão "Criar guilda" só aparece para usuários autenticados.

**Dados apresentados por guild (card):** emblema (ou ícone padrão se ausente), nome, tag, descrição (ou texto padrão "Esta guilda ainda não escreveu uma descrição." se vazia), contagem de membros ativos, Guild Level, status de recrutamento (badge), focos (tags), link para o perfil.

**Busca:** campo de texto livre, filtra por nome **ou** tag (`contains`, não sensível a posição), com debounce de 300ms antes de resetar a página.

**Filtros existentes de fato** (via `GuildDirectoryFilters.vue` + backend `directory()`):
- **Recrutamento**: Todos / Aberto / Requer aprovação / Somente convite / Fechado.
- **Ordenação**: Mais recentes (padrão) / Maior nível / Mais membros / Nome (A-Z).
- **Foco**: um único foco por vez, entre PvP, PvE, Castle Siege, Boss, Farm, Eventos, Casual, Competitivo (clicar novamente desmarca).

**"Blocos de destaque" no topo** (Todas, Recrutando, Maiores, Guild Level, PvP, Castle Siege, Boss, Farm): são atalhos client-side que apenas pré-preenchem os filtros de recrutamento/foco/ordenação acima — não existe nenhum endpoint ou lógica de "destaque" separada no backend. Clicar em "Recrutando", por exemplo, apenas aplica `recruitment=OPEN`.

**Paginação:** real, via backend (`page`/`pageSize`, `pageSize` fixo em 12 nesta página), com botões Anterior/Próxima e indicador "Página X de Y". `pageSize` é limitado pelo backend a no máximo 50, independente do que o cliente pedir.

**Status de recruitment exibido:** rótulo específico por modo (ver [seção 8](#8-recruitment-modes)), com destaque visual (borda/cor verde) apenas para `OPEN`.

**Comportamento de guild disbanded:** o backend filtra `status: 'ACTIVE'` em toda consulta ao diretório — uma guild `DISBANDED` **nunca aparece** na listagem pública, sem exceção nem visão histórica nesta fase.

**Estados de loading/empty/error:**
- Loading: "Carregando guildas..."
- Error: "Não foi possível carregar as guildas agora." + botão "Tentar novamente"
- Empty (sem resultados para os filtros aplicados): "Nenhuma guilda encontrada com esses filtros."

**O que NÃO existe hoje** (para não confundir com o backlog): filtros de "Maior Power", "Gear Score", eleições, rankings avançados, temporadas — nenhum desses filtros é real; os "blocos de destaque" acima são só atalhos para os quatro filtros reais já listados. Ver [07 — Limitações Conhecidas](07-known-limitations-and-backlog.md).

## 4. Criação Self-Service

**Quem pode criar:** qualquer conta autenticada, usando um personagem próprio que **não tenha membership ativa em nenhuma guild**.

**Onde encontrar:** botão "Criar guilda" no topo do diretório (`/guilds`), visível sempre que há uma sessão autenticada (a elegibilidade real — ter um personagem livre — é resolvida dentro do modal, não antes de mostrar o botão).

**Campos do formulário** (`GuildCreateModal.vue`): **nome**, **tag**, e um seletor de **personagem líder** entre os personagens elegíveis da própria conta (excluindo os que já têm membership ativa). Se não houver nenhum personagem elegível, o modal mostra uma mensagem em vez do formulário. **Não há campos de descrição, emblema, banner, focos ou recrutamento neste formulário** — esses são preenchidos depois, no editor de perfil completo.

**Validações (backend, `createGuild`/`createGuildSelfService` em `guilds.service.ts`):**
- Nome: 3–100 caracteres.
- Tag: 2–10 caracteres, sempre normalizada para maiúsculas.
- Personagem líder deve pertencer à conta autenticada (`ownCharacter`).
- Personagem não pode ter membership ativa em nenhuma guild.
- **Unicidade de nome/tag**: verificada apenas contra guilds com `status: 'ACTIVE'` — um nome ou tag de uma guild `DISBANDED` fica livre para reuso imediato (decisão de produto confirmada, ver [seção 19](#reuso-de-nometagslug)).
- **Slug**: derivado do nome (`slugify`), sempre único no banco (constraint real). Se o slug base já existir, um sufixo numérico incremental é anexado (`nome-2`, `nome-3`, ...) — inclusive para uma guild `DISBANDED`, cujo slug permanece reservado para sempre.

**Não existem hoje** (confirmado no código — `assertCreationEligibility()` é um hook explicitamente permissivo, sem nenhuma regra ativa):
- Requisito de nível mínimo do personagem.
- Requisito de reset mínimo.
- Custo em Zen ou qualquer moeda.
- Requisito de item.

Esse método existe como ponto único de extensão para uma futura política, mas hoje aceita qualquer personagem elegível sem nenhuma dessas checagens.

**O que acontece na criação (transação atômica):**
1. A guild é criada com `recruitment: 'APPROVAL_REQUIRED'` por padrão (o formulário não pergunta o modo — ele é definido depois no editor).
2. O personagem selecionado se torna o único `GuildMember` com `roleKey: 'LEADER'`.
3. A Tesouraria (`GuildTreasury`) é criada com 7 saldos zerados: ZEN, WCOIN, GOBLIN_POINT, HUNT_POINT, JEWEL_BLESS, JEWEL_SOUL, JEWEL_CHAOS.
4. O Cofre (`GuildVault`) é criado vazio.
5. Um evento de auditoria `GUILD_CREATED` é registrado.
6. O jogador é redirecionado para `/guild/<slug>`.

**Comportamento de erro:** nome/tag duplicados retornam 400 com mensagem específica ("Esta tag já está em uso..." ou "Este nome já está em uso..."); personagem inelegível retorna 400; erro de rede/servidor mostra mensagem de fallback no modal, sem fechar.

**Proteção contra concorrência**: duas contas tentando criar guilds com o mesmo nome/tag simultaneamente — o check de unicidade é apenas uma leitura prévia (não um lock), mas o **slug** tem constraint real e única no banco, então a segunda tentativa que colidir no slug recebe um erro 400 controlado ("Uma guild com esse nome ou tag acabou de ser criada. Tente novamente."), nunca um 500. Coberto por teste de corrida dedicado (`self-service guild creation`, `guilds.e2e-spec.ts`).

**Rate limiting:** reaproveita o `ThrottlerGuard` global já usado no upload de emblema/banner (mesmo limite, sem CAPTCHA novo, sem limitador dedicado).

## 5. Perfil da Guild

**Onde fica:** `/guild/<slug>` — página pública.

**Elementos reais exibidos:**
- Banner (imagem de fundo, ou gradiente padrão se ausente).
- Emblema (imagem, ou ícone padrão se ausente).
- Nome, tag, badge de status de recrutamento.
- Descrição (ou texto padrão).
- Guild Level e Guild XP (barra visual — ver observação de precisão abaixo).
- Contagem de membros ativos, nome do LEADER atual, contagem de focos.
- Focos da guild (chips).
- "Principais conquistas": **sempre vazio hoje** — não existe modelo de conquistas de guild ainda (Tier C, sem modelo no banco); o componente já está preparado visualmente mas a lista é hardcoded como vazia.

**Abas (`GuildProfileTabs.vue`):** Visão Geral, Membros, Guild Level, Guild XP, Solicitações, Projetos, Tesouraria (Preview), Cofre (Preview), Feed (Preview), Eventos (Preview), Guias (Preview), Conquistas (Preview), Estatísticas (Preview), Alianças (Preview). As seis últimas ("Preview") mostram uma tela de "Em breve" — ver [seção 24](#24-estados-de-loading--empty--error).

**Ações disponíveis** dependem de quem está vendo a página:
- **Visitante não autenticado**: só visualização; a aba Visão Geral mostra "Entre na sua conta para solicitar participação".
- **Autenticado, não-membro**: visualização + ação de entrada conforme o modo de recrutamento (ver [seção 8](#8-recruitment-modes)).
- **Membro (qualquer papel)**: visualização + "Sair da guilda".
- **LEADER ou OFFICER**: adicionalmente, "Editar perfil" (botão no cabeçalho) e a caixa "Convidar jogador" + solicitações pendentes na Visão Geral.
- **Somente LEADER**: adicionalmente, "Encerrar guilda" (botão no cabeçalho) e controles de troca de papel/transferência de liderança na aba Membros.

**Diferença entre informação pública e ação de gestão:** toda a informação do card/cabeçalho (nome, tag, descrição, emblema, banner, nível, membros, focos) é visível a qualquer visitante. As ações de gestão (editar, convidar, aprovar, kickar, trocar papel, transferir, encerrar) só aparecem — e só funcionam no backend — para quem tem o papel exigido; a UI usa o mesmo cálculo de papel do membro logado só para decidir o que **mostrar**, nunca como autoridade real (ver [Permissões e Segurança](05-permissions-and-security.md)).

## 6. Edição de Perfil

**Quem pode editar:** LEADER ou OFFICER (`assertRole(['LEADER', 'OFFICER'])` em `updateGuild`).

**Onde encontrar:** botão "Editar perfil" no cabeçalho do perfil, abre um modal (`GuildProfileEditor.vue`).

**Campos editáveis:** nome, tag, descrição (até 4000 caracteres, truncada silenciosamente pelo backend se exceder — não rejeitada), modo de recrutamento (os quatro modos, com uma dica textual por opção), focos da guild (multi-seleção entre os 8 valores fixos: PvP, PvE, Castle Siege, Boss, Farm, Eventos, Casual, Competitivo).

**O que este formulário NUNCA altera** — mesmo que enviado no payload, o backend ignora silenciosamente qualquer campo fora de `name`/`tag`/`description`/`recruitment`/`focusTags`: líder, papéis, permissões, status da guild. Confirmado por teste dedicado (`guilds.e2e-spec.ts`).

**Validações client-side** (espelham exatamente as regras do backend, mas o backend é sempre a autoridade final): nome 3–100, tag 2–10, descrição ≤4000.

**Uploads:** emblema e banner são enviados a partir do mesmo modal — ver [seção 7](#7-media-emblema-e-banner).

**Feedback da UI:** toast de sucesso ("Perfil da guild atualizado"), mensagem de erro inline no modal em caso de falha (nunca fecha o modal automaticamente em erro), o modal fecha e a página atualiza os dados após sucesso.

**Persistência:** confirmada via `PATCH /guilds/:slug`, transacional no backend (atualização da guild + substituição completa dos focos na mesma transação).

## 7. Media (Emblema e Banner)

Auditado diretamente de `guilds-media.service.ts` e `GuildProfileEditor.vue`.

| | Emblema | Banner |
|---|---|---|
| Dimensão final | 512×512 | 1600×480 |
| Modo de redimensionamento | `cover` (corta para preencher, nunca distorce) | `cover` |
| Formato final armazenado | sempre WebP (reencodado no servidor, independente do formato de entrada) | sempre WebP |
| Qualidade WebP | 88 | 88 |

**Tipos de arquivo aceitos:** JPG, PNG, WebP — validados **duas vezes** no servidor: pela extensão declarada e pelos **bytes reais do arquivo** (via `sharp().metadata()`, que lê o formato real da imagem, não confia no nome/MIME enviado pelo navegador). Se a extensão declarada, o MIME informado e o formato real detectado não baterem entre si, o upload é rejeitado com "O conteúdo real do arquivo não corresponde à extensão informada." — proteção real contra magic-bytes forjados, não apenas checagem de extensão.

**Tamanho:** até 8 MB, checado tanto no cliente (feedback imediato) quanto no servidor (`FileInterceptor` com `fileSize: 8 * 1024 * 1024`, limite real do multipart, não apenas do formulário).

**Dimensões/pixels:** máximo 4000×4000 por lado e 20.000.000 de pixels totais (`MAX_PIXELS`) — imagem além disso é rejeitada antes mesmo do reprocessamento.

**Rotação EXIF:** aplicada automaticamente (`.rotate()`) antes do recorte, para fotos tiradas em celular com orientação salva no EXIF não ficarem de lado.

**Armazenamento atual:** sistema de arquivos local do servidor, em `storage/guild-media/<uuid>.webp` (caminho configurável via `GUILD_MEDIA_DIR`), servido publicamente em `/api/media/guild/<uuid>.webp`. Não há CDN nem storage externo (S3 etc.) nesta fase.

**Hash:** SHA-256 do arquivo final é calculado e armazenado (`GuildMedia.sha256`), mas hoje não é usado para deduplicação nem verificação de integridade em runtime — apenas registrado.

**Falha:** se a imagem for inválida, corrompida, no formato errado ou grande demais, o upload é rejeitado com uma mensagem específica e **a imagem anterior permanece intacta** — nunca é substituída por um valor quebrado. Uma falha inesperada (não prevista pelas validações) é registrada como erro de sistema (`recordSystemError`) e retorna uma mensagem genérica ao usuário, sem vazar detalhes internos.

**Auditoria:** cada upload bem-sucedido gera um evento `GUILD_MEDIA_EMBLEM_UPLOADED` ou `GUILD_MEDIA_BANNER_UPLOADED`.

**Rate limiting:** mesmo `ThrottlerGuard` global reaproveitado pela criação self-service.

## 8. Recruitment Modes

Existem exatamente quatro modos, definidos no schema (`GuildRecruitmentStatus`) e configurados via editor de perfil:

| Modo | Rótulo na UI | Quem inicia a entrada |
|---|---|---|
| `OPEN` | Recrutamento aberto | O próprio jogador — entra na hora |
| `APPROVAL_REQUIRED` | Requer aprovação | O jogador solicita; LEADER/OFFICER decide |
| `INVITE_ONLY` | Somente convite | A guild convida; o jogador aceita/recusa |
| `CLOSED` | Fechado | Ninguém — nenhuma via de entrada disponível |

Detalhamento de cada um a seguir.

## 9. OPEN — Entrada Direta

**Fluxo:** jogador → clica "Entrar na guilda" (com um personagem próprio elegível) → membership criada imediatamente, sem aprovação.

**Etapas técnicas:** `POST /guilds/:slug/join` com `characterId` → backend confirma que o personagem pertence ao chamador e não tem membership ativa em nenhuma guild → cria o `GuildMember` (`roleKey: 'MEMBER'`) na mesma transação que reconfirma que a guild ainda está `ACTIVE` (protege contra a guild ser encerrada no meio do processo) → retorna `{ status: 'JOINED', member }`.

**Regras de concorrência:** a criação do membership usa `create()` real (não `upsert()`), então duas tentativas simultâneas de entrada do mesmo personagem — inclusive competindo com um convite sendo aceito em outra guild ao mesmo tempo — nunca resultam em sucesso duplicado; exatamente uma vence, a outra recebe um erro 400 controlado. Coberto por teste de corrida dedicado (`join(OPEN) racing an invite ACCEPT`).

## 10. APPROVAL_REQUIRED — Solicitação

**Fluxo:** jogador → solicita entrada com um personagem → status "pendente" → LEADER/OFFICER aprova ou rejeita → membership criada (se aprovado) ou solicitação encerrada sem membership (se rejeitado).

**Etapas técnicas:**
1. `POST /guilds/:slug/join` cria um `GuildJoinRequest` com `status: 'PENDING'` (não cria membership ainda). Resposta: `{ status: 'REQUESTED', request }`.
2. LEADER/OFFICER vê a lista de solicitações pendentes na aba Visão Geral (seção "Solicitações pendentes", visível só para quem pode gerenciar).
3. `POST /guilds/:slug/join-requests/:id/approve` (ou `/reject`) decide.

**Estado "Solicitação enviada — aguardando aprovação de um líder ou oficial."**: exibido no lugar do formulário de entrada assim que o jogador envia a solicitação com sucesso, usando o `status: 'REQUESTED'` já retornado pelo próprio backend na resposta da requisição — sem endpoint adicional. Esse estado é **local à sessão atual do navegador** (não persiste após um recarregamento de página); se o jogador atualizar a página antes da decisão, o formulário de entrada volta a aparecer, embora a solicitação continue pendente no backend (reenviá-la apenas atualiza a mensagem da mesma solicitação, não cria uma segunda).

**Regras de concorrência:** aprovação usa a mesma proteção `create()`/`updateMany()` write-time de OPEN — se o mesmo personagem tiver solicitações pendentes em duas guilds diferentes e ambas forem aprovadas ao mesmo tempo, exatamente uma vence.

## 11. INVITE_ONLY — Convite

**Fluxo:** LEADER/OFFICER busca um candidato → envia convite → o convite aparece no painel do jogador convidado (`/painel`) → jogador aceita (vira membro) ou recusa.

**Etapas técnicas:**
1. LEADER/OFFICER busca (`GET /guilds/:slug/invite-candidates`) — ver [seção 13](#13-busca-de-candidatos-a-convite).
2. `POST /guilds/:slug/invites` cria um `GuildInvite` (`status: 'PENDING'`).
3. O jogador convidado vê o convite em "Convites de Guild" no dashboard (`/painel`, componente `Player.vue`), com o nome da guild, tag e o personagem-alvo — visível **apenas quando há ao menos um convite pendente**.
4. Aceitar (`POST .../invites/:id/accept`) cria a membership; recusar (`POST .../invites/:id/decline`) apenas encerra o convite.

**Cancelamento:** LEADER/OFFICER pode cancelar um convite pendente (`POST .../invites/:id/cancel`) — depois de cancelado, o convite não pode mais ser aceito.

**Convite pendente duplicado:** um segundo convite ao mesmo personagem pela mesma guild, enquanto o primeiro ainda está pendente, **não cria uma segunda linha** — atualiza a mensagem do convite existente (mesmo `id`).

**Elegibilidade do candidato:** a busca exclui personagens que já têm membership ativa em qualquer guild (a própria ou outra).

**Regras de concorrência:** aceitar um convite usa a mesma proteção `create()`/`updateMany()` write-time — se o mesmo personagem tiver convites pendentes de duas guilds diferentes e ambos forem aceitos ao mesmo tempo, ou um convite competir com uma aprovação de solicitação (`APPROVAL_REQUIRED`) de outra guild, exatamente um vence; o convite/solicitação perdedor **nunca fica marcado como aceito/aprovado** contra uma membership que não existe — a transição de estado do convite e a criação da membership acontecem na mesma transação, com rollback completo se a membership falhar.

## 12. CLOSED — Fechado

Não existe via de entrada nenhuma enquanto a guild estiver `CLOSED`: nem entrada direta, nem solicitação, nem convite novo (o backend rejeita `join()` e `inviteToGuild()` com 400 explicitamente). Convites já pendentes de antes de fechar continuam existindo no banco mas não é o foco deste modo — a interface mostra apenas "O recrutamento desta guilda está fechado no momento." para o visitante.

## 13. Busca de Candidatos a Convite

**Comportamento atual** (`inviteCandidates()` em `guilds.service.ts`):

- Restrito a LEADER/OFFICER da guild.
- Busca por **nome do personagem** (não username da conta), `contains`, mínimo de **2 caracteres** no termo de busca (tanto no frontend quanto no backend — abaixo disso retorna lista vazia sem consultar o banco).
- **`take: 20`** — retorna no máximo 20 resultados, ordenados por nome (`orderBy: { name: 'asc' }`).
- Elegibilidade: exclui personagens com membership ativa (própria ou de outra guild); inclui personagens sem guild e personagens com membership **removida** (histórico de saída/kick não bloqueia um novo convite).
- Um personagem que já tem convite pendente **desta mesma guild** ainda aparece na busca — a interface mostra o resultado normalmente; é `inviteToGuild()` quem impede duplicidade real (atualiza o convite existente em vez de criar um segundo).

> **Observação registrada, não um bug corrigido**: o limite fixo de 20 resultados, combinado com a ordenação alfabética, pode fazer um personagem elegível "sumir" de uma busca se houver mais de 20 personagens cujo nome contenha o termo buscado e o personagem procurado ficar fora dos 20 primeiros em ordem alfabética. Isso foi observado durante testes locais massivos (não em uso normal de produção) e está registrado como observação técnica em [07 — Limitações Conhecidas](07-known-limitations-and-backlog.md), **não corrigido nesta tarefa**.

## 14. Lista de Membros

**Aba "Membros"** do perfil da guild.

**O que aparece:** nome do personagem, `@username` da conta, papel (badge colorido, com destaque visual para LEADER), XP do membro (`memberXp`), contribuição (`contributionScore`), e uma coluna de Ações — visível apenas para quem pode gerenciar (LEADER/OFFICER).

**Experiência somente-leitura** (visitante, membro comum, ou linha do próprio LEADER/OFFICER sobre si mesmo, ou sobre o próprio LEADER): coluna de Ações mostra apenas um traço ("—") — nenhuma ação disponível ali.

**Experiência de gestão** (LEADER/OFFICER olhando para um membro que não é o LEADER nem eles mesmos): botão "Remover" sempre visível para LEADER/OFFICER; seletor de papel + botão "Aplicar" e botão "Transferir liderança" visíveis **apenas para o LEADER** (ver [seção 15](#15-gestão-de-papéis-role-management)).

**Comportamento mobile:** a tabela se transforma em uma lista de cartões empilhados abaixo de 640px de largura — cada linha vira um bloco com rótulos (`data-label`) por campo em vez de colunas, e a coluna de Ações se estende em largura total para acomodar os botões de forma tocável.

## 15. Gestão de Papéis (Role Management)

**Somente o LEADER altera papéis** — confirmado no backend (`assertRole(guild.id, user, ['LEADER'])` em `updateMemberRole`), não apenas na UI. Um OFFICER que tentasse chamar o mesmo endpoint receberia 403.

**Papéis atribuíveis pelo controle de troca de papel:** `OFFICER`, `TREASURER`, `MEMBER`, `RECRUIT` — **nunca `LEADER`**. O seletor de papel nem sequer lista essa opção; promover alguém a LEADER só acontece pelo fluxo dedicado de [Transferência de Liderança](#18-transferência-de-liderança), que trata isso como uma operação diferente (com rebaixamento automático do líder anterior).

**Restrições de alvo:**
- O próprio LEADER nunca aparece com ações na tabela (nem "Remover", nem seletor de papel sobre si mesmo).
- Um OFFICER tentando alterar o papel do LEADER atual é bloqueado no próprio `assertRole` (403) — nunca chega a avaliar o alvo.
- **Auto-alteração pelo LEADER**: o LEADER não pode mudar o próprio papel por este endpoint genérico (retorna 400 explicitamente — "Use a transferência de liderança para alterar o papel do líder atual."). Isso evita que a guild fique sem LEADER algum.

**Padrão de interação:** seletor de papel (rascunho local) + botão "Aplicar" explícito — a troca não é enviada automaticamente ao mudar a seleção.

## 16. Remoção de Membro (Kick)

**Quem pode remover:** LEADER ou OFFICER (`assertRole(['LEADER', 'OFFICER'])` em `kickMember`).

**Quem pode ser removido:** qualquer membro **exceto o LEADER**, que é protegido explicitamente no backend ("O líder não pode ser removido diretamente." — 400, mesmo se um OFFICER tentar).

**Motivo obrigatório:** mínimo de 3 caracteres, máximo de 500 — validado tanto no frontend (impede o clique de confirmação abaixo do mínimo) quanto no backend (autoridade final).

**Confirmação:** interface exige um passo explícito de confirmação inline (abre um formulário com o campo de motivo + botões "Confirmar remoção" / "Cancelar" no lugar das ações normais daquela linha) — não é um `confirm()` de navegador nem uma ação de um clique só.

**Resultado:** o membro é marcado como removido (`removedAt`, `removedBy`, `removedReason` preenchidos) — **não é um hard delete**; o histórico da membership permanece no banco. Um evento de auditoria `GUILD_MEMBER_KICKED` é registrado com o motivo como descrição.

**Proteção de concorrência:** a remoção usa `updateMany()` com uma condição de escrita que reconfirma, no momento exato da escrita, que o alvo ainda está ativo, ainda não é LEADER, e que a guild ainda está `ACTIVE` — fecha a janela entre uma remoção e uma transferência de liderança correndo ao mesmo tempo sobre o mesmo membro (o alvo nunca é removido depois de já ter sido promovido a LEADER por outra operação).

## 17. Sair da Guild (Leave)

**Quem pode sair:** qualquer membro ativo, com uma exceção importante.

**Comportamento específico do LEADER:** o LEADER **não pode simplesmente sair** enquanto houver outros membros ativos na guild — o backend rejeita explicitamente com 400 ("Transfira a liderança antes de sair da guild."). Se o LEADER for o único membro restante, ele **pode** sair diretamente pelo mesmo botão (nesse caso a guild fica sem membros ativos, mas ainda `ACTIVE` — encerrar a guild é uma ação separada e deliberada, ver [seção 19](#19-encerramento-disband)).

**Para um LEADER com outros membros na guild**, o caminho correto é: transferir a liderança para outro membro primeiro (seção 18), e então sair normalmente como OFFICER (o papel que assume automaticamente após a transferência).

**Resultado:** mesma marcação de remoção suave (`removedAt`, motivo fixo "Saída voluntária."). Evento de auditoria `GUILD_MEMBER_LEFT`.

## 18. Transferência de Liderança

**Quem pode iniciar:** somente o LEADER atual, a partir da aba Membros.

**Alvo:** qualquer outro membro ativo da guild (não pode ser o próprio LEADER, obviamente).

**Modal de confirmação** (`GuildLeadershipTransferModal.vue`): explica textualmente as três consequências — o alvo vira o novo LÍDER, o LEADER atual é imediatamente rebaixado a OFFICER, e a ação não pode ser desfeita pelo LEADER anterior sozinho (só o novo LEADER poderá transferir de volta). **Não existe um campo de "digite o nome para confirmar" nesta ação** — o modal informativo com botão explícito de confirmação já é, segundo o próprio código, "o precedente mais forte já existente no portal" para esse tipo de ação (o padrão de digitação existe apenas no Encerramento — ver seção 19 — e não foi replicado aqui por decisão de produto já tomada em uma etapa anterior).

**Endpoint reaproveitado:** a transferência **não tem um endpoint próprio** — usa o mesmo endpoint genérico de troca de papel (`PATCH .../members/:id/role` com `roleKey: 'LEADER'`), que o backend trata como uma operação de transferência de liderança (não uma promoção comum) sempre que o papel-alvo é `LEADER`.

**Resultado (transação atômica):**
1. Qualquer outro membro que já tivesse `roleKey: 'LEADER'` (nunca deveria existir mais de um, mas a operação se auto-corrige caso exista) é rebaixado a `OFFICER`.
2. O alvo é promovido a `LEADER`.
3. `Guild.leaderMemberId` é atualizado para apontar ao novo líder.
4. Evento de auditoria `GUILD_LEADERSHIP_TRANSFERRED`.

**Atualização imediata da UI:** após sucesso, a lista de membros é recarregada **e** o objeto da guild no componente pai é recarregado (`emit('refresh')`) — isso é o que faz o botão "Encerrar guilda" e os controles de LEADER desaparecerem imediatamente da tela do ex-líder, sem precisar recarregar a página manualmente.

**Exatamente um LEADER, sempre:** garantido pela mesma transação — nunca existe uma janela com zero ou dois membros com `roleKey: 'LEADER'`, mesmo sob concorrência (dois pedidos de transferência simultâneos, ou uma transferência competindo com uma remoção do alvo). Coberto por múltiplos testes de corrida dedicados.

## 19. Encerramento (Disband)

Esta é a ação mais sensível do módulo — documentada aqui com o máximo de precisão.

**Quem pode encerrar:** **somente o LEADER** (`assertRole(['LEADER'])`), verificado tanto no backend do endpoint quanto reforçado por um segundo mecanismo de segurança independente (step-up).

**Step-up obrigatório:** o endpoint (`DELETE /guilds/:slug`) exige um cabeçalho `X-Step-Up-Token`, obtido separadamente via `POST /auth/step-up`:
- Sempre exige a **senha atual** da conta.
- Se a conta tiver **autenticação em duas etapas (2FA) ativada**, exige também um **código TOTP válido ou um código de recuperação**.
- O token de step-up expira em **5 minutos** e é vinculado à sessão atual — não pode ser reaproveitado de uma sessão diferente.
- Este é o **mesmo mecanismo genérico** já usado para reset de 2FA administrativo em outras partes do portal — não foi inventado um fluxo de reautenticação exclusivo para Guild.

**Confirmação por digitação:** o modal (`GuildDisbandModal.vue`) exige que o LEADER digite exatamente o **nome ou a tag** da guild (não sensível a maiúsculas/minúsculas) no campo de confirmação, antes do botão "Encerrar guilda" ficar habilitado. Digitar algo diferente do nome ou da tag é rejeitado pelo backend com 400, mesmo com step-up válido.

**Modelo: encerramento suave (soft close), nunca hard delete.** A ação é apenas uma mudança de `Guild.status` para `DISBANDED`, na mesma transação que:
- Cancela (`status: 'CANCELLED'`) **todos** os convites (`GuildInvite`) pendentes da guild.
- Cancela (`status: 'CANCELLED'`) **todas** as solicitações de entrada (`GuildJoinRequest`) pendentes da guild, com uma nota de decisão padrão ("Guild encerrada pelo líder.").

**O que é preservado, intocado:**
- Todos os `GuildMember` — histórico completo de membros permanece no banco, com seus papéis e datas.
- Tesouraria (`GuildTreasury`/`GuildTreasuryBalance`) — saldos preservados.
- Cofre (`GuildVault`/`GuildVaultItem`) — preservado.
- Projetos (`GuildProject`) — preservados.

**Remoção do diretório:** uma guild `DISBANDED` desaparece imediatamente de `/guilds` (filtro `status: 'ACTIVE'` no backend) e de qualquer busca — sem exceção, sem visão histórica pública nesta fase.

**Após o encerramento:** o ex-LEADER é redirecionado imediatamente para `/guilds` (a página do perfil não é simplesmente atualizada — o componente entende que a guild "sumiu" da perspectiva de quem a encerrou, evitando deixar uma tela operável apontando para uma guild que não existe mais para aquele fluxo).

**Convites/solicitações pós-encerramento:** qualquer tentativa de aceitar/recusar/cancelar um convite já cancelado, ou aprovar/rejeitar uma solicitação já cancelada, falha de forma limpa (400), nunca com erro de servidor.

**Segunda tentativa de encerramento:** rejeitada com 400 ("Esta guild já não está ativa.") — não é possível encerrar duas vezes.

**Proteção de concorrência:** encerramento correndo ao mesmo tempo que uma transferência de liderança ou uma troca de papel na mesma guild nunca resulta em erro de servidor, e a guild sempre termina `DISBANDED` com o estado de membership deixado exatamente como estava no momento da corrida (coberto por teste dedicado).

### Reuso de nome/tag/slug

Decisão de produto confirmada (documentada também em `apps/api/src/modules/guilds/README.md`):

| | Política |
|---|---|
| **Nome** | Reutilizável imediatamente após o encerramento (`NAME_REUSE_AFTER_DISBAND = YES`) |
| **Tag** | Reutilizável imediatamente após o encerramento (`TAG_REUSE_AFTER_DISBAND = YES`) |
| **Slug (URL)** | **Nunca reutilizado** (`OLD_SLUG_REUSE_AFTER_DISBAND = NO`) — o slug antigo fica reservado para sempre; uma nova guild com o mesmo nome recebe um slug diferente (sufixo numérico), preservando URLs antigas e identidade histórica |

## 20. Tesouraria (Treasury)

**O que existe de fato:** um modelo real e auditável (`GuildTreasury` + `GuildTreasuryBalance`), com 7 linhas de saldo semeadas na criação da guild: ZEN, WCOIN, GOBLIN_POINT, HUNT_POINT, JEWEL_BLESS, JEWEL_SOUL, JEWEL_CHAOS — todas com `availableAmount` e `reservedAmount` iniciando em zero.

**Dados exibidos na aba "Tesouraria":** tabela com recurso, valor disponível, valor reservado, por linha.

**Somente leitura nesta fase:** **não existe nenhum endpoint que altera esses saldos.** Nenhum depósito, saque ou movimentação é possível pela interface ou pela API hoje — a aba mostra os saldos (sempre zero, na prática, já que nada os altera) e nada mais. A aba é marcada como "Preview" na navegação por esse motivo.

**Depósito nunca gera Guild XP** — mesmo quando movimentação de recursos existir no futuro, essa regra já está documentada como princípio de design (evitar farm de XP via depósito/saque repetido).

**Estados:** loading ("Carregando tesouraria..."), erro com botão de retry, e um estado vazio explícito ("Nenhum saldo registrado ainda.") para o caso teórico de uma guild sem as 7 linhas semeadas — na prática nunca acontece, já que toda guild nasce com elas, mas o estado existe e foi corrigido para não renderizar em branco.

## 21. Cofre (Vault)

**O que existe de fato:** um modelo real (`GuildVault` + `GuildVaultItem`), criado vazio junto com a guild.

**Somente leitura, sem itens:** nenhum endpoint adiciona ou remove itens do cofre nesta fase. A aba mostra "O cofre desta guilda está vazio." sempre (não há nenhum caminho para popular itens hoje).

## 22. Projetos (Projects)

**O que existe de fato:** CRUD real (`GuildProject`), não uma prévia — esta é uma funcionalidade Tier A (funcional), diferente de Tesouraria/Cofre.

**Quem pode criar:** LEADER, OFFICER ou TREASURER.

**Campos:** título (obrigatório, 3–191 caracteres), descrição, meta (`goal`), recursos necessários/disponíveis, contribuidores, jogadores relacionados, prazo, impacto — a maior parte desses campos extras é editável apenas via `PATCH`, não no formulário simplificado de criação (que só pede o título).

**Quem pode editar/cancelar:** o criador (`ownerAccountId`) ou LEADER/OFFICER/TREASURER.

**Status:** `PLANNING` (inicial), `ACTIVE`, `ON_HOLD`, `COMPLETED`, `CANCELLED`. Um projeto `COMPLETED` ou `CANCELLED` não pode mais ser editado.

**Não confundir com o backlog:** "Guild Quests" e "Guild Goals" são conceitos **futuros e distintos** deste sistema de Projetos atual — ver [07 — Limitações Conhecidas](07-known-limitations-and-backlog.md).

## 23. Solicitações de Recursos (Requests)

**O que existe de fato:** CRUD real (`GuildRequest`), funcionalidade Tier A. **Não confundir com `GuildJoinRequest`** (pedido de entrada na guild, seção 10) — são modelos completamente diferentes que compartilham a palavra "solicitação" apenas na linguagem natural.

**Quem pode criar:** qualquer membro ativo (qualquer papel, incluindo RECRUIT).

**Tipos** (`GuildRequestType`): Item, Jewel, Zen, WCoin, Goblin Point*, Hunt Point*, Investment*, Equipamento, "Procurando item", Outro. (*existem no enum do backend mas não aparecem no seletor atual do formulário, que lista apenas Item/Jewel/Zen/WCoin/Equipamento/Procurando item/Outro.)

**Disclaimer automático:** solicitações do tipo "Procurando item" (`LOOKING_FOR_ITEM`) sempre recebem um aviso preenchido pelo servidor — "Blood Moon não garante devolução de empréstimos entre players." — nunca definido pelo cliente.

**Quem pode editar/cancelar:** o criador, ou LEADER/OFFICER.

**Status:** `DRAFT` (inicial), `OPEN`, `IN_PROGRESS`, `FULFILLED`, `CANCELLED`, `EXPIRED`. Uma solicitação `FULFILLED`/`CANCELLED`/`EXPIRED` não pode mais ser editada. (Nada no código atual transiciona automaticamente para `EXPIRED` — não existe mecanismo de expiração por tempo.)

## 24. Estados de Loading / Empty / Error

Cinco abas (Membros, Solicitações, Projetos, Tesouraria, Cofre) seguem o mesmo padrão centralizado e consistente:

1. **Loading**: mensagem "Carregando <seção>..." enquanto a requisição está em voo.
2. **Error**: mensagem de erro específica (extraída da resposta do backend quando disponível) **+ botão "Tentar novamente"** explícito, que refaz a requisição sem precisar trocar de aba e voltar.
3. **Content**: dados reais.
4. **Empty**: mensagem específica por seção quando não há dados (nunca uma tela em branco indistinguível de um carregamento travado).

Este padrão foi resultado de uma auditoria dedicada que encontrou o comportamento anterior (sem tratamento de erro nenhum, apenas `try/finally`) escondendo falhas de rede como se fossem "sem dados".

**Abas "Preview"** (Tesouraria, Cofre, Feed, Eventos, Guias, Conquistas, Estatísticas, Alianças) usam um componente dedicado de placeholder (`GuildPlaceholderView.vue`) com um selo "Em breve" — Tesouraria e Cofre são exceção parcial: têm dados reais (zerados) por trás do selo "Preview" na navegação, mas a marca "Preview" continua ali porque nenhuma escrita é possível ainda.

## 25. Responsividade

Validado estruturalmente (via inspeção de CSS/DOM e breakpoints reais do código) em 375px (mobile), tablet (768px) e desktop (1280px). **Nota de honestidade**: a validação de mobile desta rodada foi majoritariamente estrutural (CSS/DOM, `matchMedia`, ausência de overflow horizontal) — captura de tela real ficou indisponível em parte da sessão de testes por limitação do ambiente de preview, não por escolha; não se deve interpretar isso como validação visual completa por captura de tela.

**Tabela de membros → cards com rótulos:** abaixo de 640px, `.guild-members-table` muda de tabela HTML tradicional para uma lista de blocos empilhados, com cada célula ganhando um rótulo (`data-label`) antes do valor — a coluna de Ações vira um bloco de largura total com os botões empilhados verticalmente.

**Modais:** todos os quatro modais do módulo (Criar Guild, Editar Perfil, Transferir Liderança, Encerrar Guild) têm breakpoints próprios abaixo de 480–680px (varia por modal) que reduzem padding, empilham o rodapé de botões verticalmente (o botão destrutivo/de confirmação por cima) e evitam overflow horizontal.

**Posicionamento de ações:** no cabeçalho do perfil, os botões de ação (Editar perfil / Encerrar guilda) saem da posição absoluta no canto superior direito e passam a ficar em fluxo normal abaixo das informações, abaixo do breakpoint de 640px.

**Diretório:** o painel de filtros lateral (`.guilds-layout__filters`) é ocultado abaixo de 900px e substituído por um botão "Filtros" que abre uma gaveta (drawer) inferior com o mesmo componente de filtros.
