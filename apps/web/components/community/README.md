# Comunidade

Os componentes publicos da Community ficam separados das operacoes administrativas.
A pagina `/comunidade` apenas compoe os blocos visuais; regras futuras de feed,
upload, comentarios e seguidores devem continuar fora da camada de apresentacao.

## Etapa 1

- `CommunitySubheader`: navegacao secundaria e acoes globais.
- `CommunityUserRail`: resumo desacoplado do usuario, conquistas e atalhos.
- `CommunityAchievementPopover`: informacao rica reutilizavel de conquistas.
- `CommunityPostComposer`: criacao, rascunho e edicao de texto, foto, galeria,
  GIF e artigo usando a API autenticada e o pipeline seguro de midia.
- `CommunityPostCard`: renderizacao do feed real, estado `Editado`, midia,
  tags, mencoes e acoes do autor.
- `CommunityRightRail`: coluna direita da home.
- `CommunityPlaceholderView`: destino seguro para secoes ainda nao implementadas.

Publicacoes, perfis e a coluna direita nao usam fallback local: falhas ou
ausencia de dado real sao exibidas de forma honesta na tela. (Etapa 9: os
mocks de anuncio/evento/trending/sugestao que existiam em
`features/community/data/stage-one.mock.ts` e `CommunityAdCard` foram
removidos por inteiro -- `CommunityRightRail` mostra um estado explicito de
"ainda nao disponivel" em vez de dado fabricado.)

## Etapa 2

- `CommunityProfileHeader`: identidade, estatisticas, conquistas e acoes sociais.
- `CommunityProfileTabs`: midia, publicacoes, compartilhados, marcacoes e collabs.
- `CommunityProfileHoverCard`: resumo reutilizavel exibido ao passar sobre um usuario.
- `CommunityProfileEditor`: identidade visual e preferencias granulares de privacidade.
- rota canonica publica: `/comunidade/[username]`.
- rota antiga `/comunidade/perfil/[username]` mantida somente como redirecionamento.

O modelo visual e os estados iniciais ficam em
`features/community/data/stage-two.mock.ts`. Personagens continuam atributos da
conta social; nao existe perfil independente para personagem.

As preferencias preparadas sao: visibilidade do perfil, personagens,
equipamentos, estatisticas, guild e atividade. A troca administrativa de
username exige justificativa e gera historico imutavel.

## Etapa 3

- tipos liberados: `TEXT`, `IMAGE`, `GALLERY`, `GIF` e `ARTICLE`;
- editor rico `UEditor` para artigos e `UTextarea` para publicacoes curtas;
- envio multipart centralizado em `useCommunityApi.uploadPostMedia`;
- validacao local de quantidade e tamanho, complementada pela validacao real
  do arquivo no backend;
- rascunho, publicacao, edicao e exclusao logica pelo autor;
- filtros administrativos por tipo, visibilidade e status;
- ocultacao, restauracao, destaque e moderacao continuam no fluxo auditado.

## Etapa 4

- feeds `Para voce`, `Seguindo` e `Recentes`, alem da area `Salvos`;
- cinco reacoes compactas: curtir, honra, poder, raro e vitoria;
- comentarios com edicao, exclusao, reacao e uma camada de respostas;
- salvar, repostar internamente e copiar link;
- labels de origem para seguindo, em alta, patrocinado, oficial, conquista,
  marketplace, evento e guia;
- perfil consulta o relacionamento autenticado para manter corretamente os
  estados de seguir, bloquear e desbloquear apos recarregar a pagina;
- CMS com filas dedicadas para publicacoes, comentarios, reacoes, denuncias e
  moderacao.

## Administracao

- `CommunityAdminManager`: operacao centralizada por permissoes, incluindo a area `Perfis`.
- `CommunityToolbar`: busca e filtros.
- `CommunityAction`: acao operacional compacta.
- `CommunityPagination`: paginacao administrativa.
