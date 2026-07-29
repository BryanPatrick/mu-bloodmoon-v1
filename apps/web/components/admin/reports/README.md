# Relatórios administrativos

`AdminReportsManager.vue` é a tela central de leitura e exportação dos relatórios.

- Os dados sempre vêm da API; não há métricas locais de fallback.
- As categorias disponíveis são retornadas conforme as permissões da sessão.
- Dados financeiros dependem de `admin.finance.reports.view` e do perfil `SUPER_ADMIN`.
- CSV e XLSX são gerados pela API e baixados pelo navegador.
- O componente renderiza grupos de forma dinâmica para aceitar novas métricas sem duplicar telas.
