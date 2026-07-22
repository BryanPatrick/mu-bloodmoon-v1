# Modelo de acesso do painel

Este documento e a referencia operacional do painel. Menus, paginas e APIs devem seguir a mesma matriz; ocultar um item no frontend nunca substitui a autorizacao no backend.

## Papeis

- `PLAYER`: administra somente a propria conta, personagens, compras, anuncios, notificacoes, suporte e preferencias.
- `ADMIN`: colaborador operacional. Pode receber permissoes individuais para contas de jogadores, conteudo, loja, marketplace, tickets e auditoria operacional.
- `SUPER_ADMIN`: proprietario. Gerencia administradores, financas, configuracoes globais, integracoes e todas as permissoes.

Uma nova conta nasce como `PLAYER`. Somente `SUPER_ADMIN` promove ou rebaixa entre `PLAYER` e `ADMIN`. O proprio perfil e contas `SUPER_ADMIN` sao protegidos. Alteracoes exigem motivo e revogam sessoes.

## Dashboards

- Player: componente e consultas proprias do jogador.
- ADM: `GET /api/admin/dashboard/operational`, sem valores financeiros.
- Super ADM: `GET /api/admin/dashboard/strategic`, protegido por permissao financeira.

## Conteudo e operacao

O antigo agrupamento tecnico foi removido da interface. Conteudo e editado por dominio real: paginas, banners, classes, mapas, itens, wiki, noticias e eventos. Loja Admin concentra produtos, pacotes e pedidos individuais. Marketplace Admin concentra moderacao de anuncios. Configuracoes globais sao exclusivas do Super ADM.

Uploads aceitam PNG, JPEG ou WebP de ate 5 MB. A interface mostra miniatura e nome amigavel; caminhos fisicos nao sao exibidos. Os arquivos ficam em `storage/uploads` e sao servidos por `/api/media/:fileName`.

## Auditoria e privacidade

Acoes sensiveis registram ator, alvo, resultado, motivo e mudancas pertinentes. Segredos, tokens e senhas nunca entram no log. A resposta administrativa remove IDs desnecessarios, mascara IP para ADM e elimina chaves de caminho ou credencial. Erros 500 retornam somente mensagem segura e identificador de solicitacao.

## Etapas executadas

1. Auditoria: autenticacao, usuarios, menus, rotas, financas, logs, loja e marketplace mapeados.
2. Papeis: RBAC central, permissoes por conta, guards, sessao unica e historico de dispositivos implementados.
3. Menus: menus dinamicos por papel; areas tecnicas removidas.
4. Dashboards: visualizacoes e endpoints separados por finalidade.
5. Contas: promocao, rebaixamento, status, permissoes e revogacao de sessoes auditados.
6. CMS: dominios reais, CRUD e upload amigavel.
7. Loja e marketplace: pedidos operacionais separados de relatorios financeiros; dados internos ocultos.
8. Seguranca: suporte, moderacao, filtro seguro de erros e sanitizacao de auditoria.
9. Autenticacao forte: 2FA TOTP com QR code, segredo criptografado, ativacao e desativacao auditadas.
10. Estrategia: receita confirmada, volume de marketplace e serie mensal calculados diretamente no banco.

## Banco e ambiente local

As migracoes `20260722120000_role_permissions`, `20260722143000_support_and_moderation` e `20260722180214_account_sessions_two_factor` devem ser aplicadas antes de validar o painel. Com o MySQL ativo:

```powershell
Set-Location apps/api
npx prisma migrate deploy
npm run db:seed:test
npm run check:security:integration
```

Defina `TEST_ACCOUNT_PASSWORD` e `TEST_ACCOUNT_PERSONAL_ID` apenas no ambiente local. O seed se recusa a executar em producao.

## Checklist de aceite

- validar login das tres contas de teste;
- confirmar menus diferentes por papel;
- confirmar 403 para acesso direto sem permissao;
- confirmar ausencia de financas no ADM;
- promover e rebaixar um jogador com justificativa;
- personalizar permissoes de um ADM;
- revogar sessoes;
- confirmar que um novo login revoga a sessao anterior;
- ativar 2FA pelo QR code, validar novo login e desativar com senha e TOTP;
- conferir historico real de dispositivos, IP mascarado e motivo da revogacao;
- criar e responder ticket;
- bloquear e desbloquear jogador;
- criar, editar e arquivar conteudo/equipamento;
- enviar, substituir e remover imagem;
- conferir eventos na auditoria.

## Homologacao remota

O ambiente remoto de testes deve usar aplicacao, subdominio, banco, usuario de banco, uploads e segredos separados da producao. O ambiente local continua sendo o caminho rapido para desenvolvimento e testes automatizados; homologacao remota serve para validacao por outros dispositivos, socios e integracoes externas. Nunca aponte uma aplicacao de homologacao para o banco de producao.
