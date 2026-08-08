# Comunidade

Modulo social isolado da conta e do servidor do jogo.

## Responsabilidades

- feed, perfis, posts, comentarios e reacoes;
- denuncias e moderacao social;
- conquistas, quests e badges;
- politicas antispam e dominios;
- tarefas e relatorios administrativos;
- auditoria, logs de trabalho e eventos operacionais.

Suspensao social nunca altera `Account.status` nem bloqueia personagem no jogo.
Toda edicao administrativa de conteudo exige justificativa e cria uma revisao.

## Perfil social

`CommunityProfile` pertence a uma conta e concentra identidade social,
personagem principal, guild, conquistas destacadas e privacidade. O username
continua sendo unico em `Account`; alteracoes administrativas exigem motivo e
sao registradas em `CommunityUsernameHistory` e `AuditLog`.

`CommunityFollow` registra o grafo basico de seguidores sem criar perfis de
personagem. O cooldown de username e configuravel em `CommunityPolicy`.

## Publicacoes - Etapa 3

`CommunityPost` suporta inicialmente `TEXT`, `IMAGE`, `GALLERY`, `GIF` e
`ARTICLE`. Os demais tipos previstos no schema ficam bloqueados no servico ate
que possuam regras de dominio proprias. Tags e mencoes sao extraidas do
conteudo, enquanto visibilidade, origem, patrocinio e conteudo oficial ficam
normalizados no registro.

O autor pode salvar em `DRAFT`, publicar, editar e remover logicamente seu
conteudo. Cada edicao preserva uma `CommunityPostRevision`; o feed publico
exibe somente publicacoes `PUBLISHED` e marca conteudo alterado como `Editado`.

Uploads passam exclusivamente por `MediaService`. O servico valida tamanho,
extensao, formato real, MIME e dimensoes com Sharp, rejeita SVG, remove
metadados e reprocessa imagens antes de disponibiliza-las. A midia permanece
vinculada ao proprietario e so pode ser anexada a um post compativel.

Moderacao administrativa exige justificativa e utiliza o wrapper auditado do
modulo, gerando `AuditLog` e `AdminWorkLog`. Falhas internas passam pelo filtro
global e pelo `ObservabilityService`, que registra `SystemError` sem expor
detalhes tecnicos ao jogador.

## Interacoes sociais - Etapa 4

- `CommunityFollow` implementa seguir e deixar de seguir.
- `CommunitySocialRelation` registra bloqueios e ja reserva o tipo `MUTE` para
  silenciamento futuro. Bloquear remove conexoes nos dois sentidos.
- o feed possui modos `for-you`, `following`, `recent` e `saved`; `for-you`
  utiliza somente prioridade editorial simples, sem algoritmo opaco.
- `CommunityReaction` aceita `LIKE`, `HONOR`, `POWER`, `RARE` e `VICTORY` em
  publicacoes e comentarios.
- comentarios podem ser editados com revisao preservada, removidos logicamente,
  reagidos e respondidos em apenas um nivel.
- `CommunityPostSave` permite salvar publicacoes e reserva `collectionId` para
  colecoes futuras; `CommunityRepost` implementa compartilhamento interno.
- visibilidade, perfil privado e bloqueios sao validados tambem nos endpoints
  diretos, nao apenas na consulta do feed.

O CMS oferece filas separadas para publicacoes, comentarios, reacoes,
denuncias e moderacao. Toda acao administrativa mutavel exige justificativa e
passa pelo mesmo registro de `AuditLog` e `AdminWorkLog`.
