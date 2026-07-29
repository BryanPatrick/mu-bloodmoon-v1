# Observability

Infraestrutura tecnica compartilhada para correlacao, erros e eventos.

## Responsabilidades

- cria ou reaproveita `X-Correlation-ID` por requisicao;
- mantem contexto de requisicao com `AsyncLocalStorage`;
- sanitiza credenciais, tokens e dados pessoais antes da persistencia;
- agrupa erros equivalentes por fingerprint;
- registra ocorrencias sem duplicar o incidente principal;
- gera alertas para severidade critica e anomalias operacionais;
- registra eventos comerciais e de integracao.

## Uso

Servicos de negocio injetam `ObservabilityService` e chamam
`recordOperationalEvent`. Excecoes nao tratadas sao capturadas pelo
`SafeExceptionFilter`.

Nunca envie senha, token ou credencial deliberadamente. A sanitizacao e uma
segunda barreira, nao uma autorizacao para registrar segredos.
