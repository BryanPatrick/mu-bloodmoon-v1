# Comunidade Blood Moon

## Escopo

O modulo `community` concentra feed, perfis sociais, publicacoes, comentarios,
reacoes, denuncias, moderacao, conquistas, quests, badges e tarefas operacionais.
A suspensao social nao altera o status da conta nem bloqueia o acesso ao jogo.

## Rotas

- `/comunidade`: feed, publicacao, comentarios, reacoes, denuncias, quests e
  edicao do proprio perfil.
- `/comunidade/perfil/:username`: perfil publico, conquistas, badges e posts.
- `/painel/admin/comunidade`: operacao administrativa por permissoes.
- `/admin/community`: compatibilidade, redireciona ao painel oficial.

## Permissoes

O acesso administrativo usa permissoes separadas para visualizacao, posts,
comentarios, usuarios, denuncias, conquistas, quests, badges, politicas,
tarefas e relatorios. `SUPER_ADMIN` preserva o wildcard global. Um `ADM`
recebe apenas as capacidades atribuidas.

## Moderacao

- posts editados por administrador geram `CommunityPostRevision`;
- ocultacao, restauracao, remocao, destaque, fixacao e alcance limitado exigem
  justificativa;
- suspensao social, bloqueio de post/comentario, advertencia e remocao de
  avatar/capa ficam em `CommunityModerationAction`;
- denuncias possuem responsavel, prioridade, prazo, decisao e workflow;
- cada acao administrativa gera `AuditLog` e `AdminWorkLog`.

## Antispam e midia

`CommunityPolicy` controla palavras, dominios, cooldown e limites por hora.
Tentativas bloqueadas geram eventos operacionais. Midias aceitam apenas HTTP
ou HTTPS, no maximo seis entradas, e respeitam a politica de dominios. Falhas
de validacao de midia entram na Central de Erros sem expor dados sensiveis.

## Gamificacao

Conquistas possuem raridade, pontos, condicao e atribuicao manual auditada.
Quests possuem publico, periodo, limite, progresso e validacao de recompensa.
Badges possuem visibilidade, limite e validade, com concessao e remocao
auditadas.

## Banco e implantacao

Aplicar a migration `20260729230000_community_foundation` antes de ativar as
rotas. A tela nao possui fallback local: todo conteudo oficial vem da API.

## Verificacao

```powershell
npm --workspace apps/api run check
npm --workspace apps/api run build
npm --workspace apps/web run build
```
