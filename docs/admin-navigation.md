# Navegacao administrativa

O menu administrativo e definido em `apps/web/components/layout/ManagementShell.vue`.
Cada grupo exibe somente os itens permitidos para a conta autenticada.

## Estrutura

- Dashboard
- Gestao: tarefas, notificacoes e atividade do proprio administrador
- Roadmap: iniciativas, atualizacoes, categorias e revisoes
- Loja: produtos, categorias, variantes, pedidos, entregas, estornos e importacao
- Marketplace: anuncios, transacoes, escrow, denuncias, suspensoes e economia
- Comunidade: publicacoes, comentarios, denuncias, usuarios, conquistas, quests, badges e moderacao
- Monitoramento: erros, falhas operacionais e alertas
- Auditoria: acoes, historico, trabalho e eventos
- Relatorios: equipe, roadmap, loja, marketplace, comunidade e erros
- Configuracoes: permissoes, administradores, moedas, integracoes e parametros gerais

## Regras

- Grupos sem nenhum filho autorizado nao aparecem.
- O grupo da rota atual abre automaticamente.
- Os atalhos internos usam parametros de rota para selecionar a aba ou filtro correto.
- `Minha atividade` envia o identificador da conta autenticada para a API.
- Configuracoes globais continuam restritas ao Super ADM.
- Novos modulos devem declarar rota e permissao granular antes de entrar no menu.
