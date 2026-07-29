# Relatorios administrativos

Camada de leitura central para equipe, Roadmap, Loja, Marketplace, Comunidade,
Auditoria, Erros e Seguranca. Nenhum dado operacional e copiado: as agregacoes
sao calculadas sobre os modelos de origem.

Relatorios financeiros exigem `SUPER_ADMIN` e
`admin.finance.reports.view`. Exportacoes exigem
`admin.reports.export` e geram auditoria e registro em `AdminLogExport`.
