# Roadmap

Modulo independente para iniciativas publicas e operacao administrativa.

- `GET /api/roadmap`: roadmap publicado.
- `GET /api/roadmap/:slug`: detalhe publico.
- `/api/admin/roadmap`: CMS protegido por permissoes granulares.
- Edicao, revisao, aprovacao e publicacao sao permissoes independentes.
- Toda mutacao gera auditoria e log de trabalho.
- Falhas de slug, imagem, relacao, publicacao e agendamento chegam a Central de Erros.
- Exclusao administrativa e logica; o registro continua disponivel para restauracao.
