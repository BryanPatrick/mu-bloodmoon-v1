# Relatórios administrativos

## Rotas

- Painel: `/painel/admin/relatorios`
- Compatibilidade: `/admin/reports`
- API: `GET /admin/reports`, `GET /admin/reports/options` e `GET /admin/reports/export`

## Categorias

- Trabalho da equipe
- Roadmap
- Loja
- Marketplace
- Comunidade
- Auditoria
- Erros
- Segurança

Cada categoria exige sua permissão funcional, além de `admin.reports.view`.

## Permissões

- `admin.reports.view`: acessa a central.
- `admin.reports.export`: exporta CSV ou XLSX.
- `admin.reports.security.view`: acessa os indicadores de segurança.
- `admin.finance.reports.view`: libera métricas financeiras somente para `SUPER_ADMIN`.

## Filtros

Os relatórios aceitam período, módulo, colaborador, status, prioridade, tipo e resultado. O período padrão é de 30 dias e o limite máximo por consulta é de dois anos.

## Exportação e segurança

CSV e XLSX são gerados no backend a partir dos mesmos filtros da tela. A exportação:

- respeita as permissões da categoria;
- omite informações financeiras sem autorização;
- neutraliza fórmulas iniciadas por `=`, `+`, `-` ou `@`;
- não inclui tokens, credenciais, IP, user agent ou dados pessoais desnecessários;
- registra checksum, quantidade de linhas e filtros em `AdminLogExport`;
- gera auditoria com o `correlationId` da operação.

PDF permanece explicitamente planejado para uma etapa futura.

## Leitura dos indicadores

Volume de ações não deve ser tratado isoladamente como avaliação de desempenho. Reaberturas, complexidade, criticidade, tempo de resolução e resultado precisam ser lidos em conjunto.
