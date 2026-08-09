# BloodMoon - baseline de testes do beta

Data de criacao: 2026-08-09.

## Objetivo

Fornecer um unico comando reproduzivel para a rede de seguranca minima do
portal fora da Community, sem acessar producao, o banco do jogo ou o
GameBridge. A baseline reaproveita Jest, Supertest, Nest Testing, o build SSR
do Nuxt e a infraestrutura E2E ja homologada pela Community.

## Comando unico

```powershell
npm run test:beta
```

Pre-requisitos:

- Node.js e npm nas versoes suportadas pelo repositorio;
- Docker Desktop em execucao;
- portas locais livres para containers e para o smoke SSR.

O comando executa, em sequencia:

1. build de producao do Nuxt;
2. E2E critico da API;
3. E2E completo da Community;
4. testes do contrato de erro e smoke das paginas publicas no Nitro gerado.

## Isolamento

- Cada spec E2E cria seu proprio MariaDB 11 descartavel no Docker.
- As migrations Prisma sao aplicadas ao banco descartavel.
- Contas usam dominios sinteticos `example.invalid`.
- CAPTCHA e e-mail usam bypasses restritos a `NODE_ENV=test`.
- O smoke do Nuxt aponta a API para uma porta local indisponivel de proposito,
  comprovando que nao depende de producao para renderizar as paginas.
- Nenhuma operacao acessa o MySQL de producao, SQL Server do jogo ou GameBridge.

## Matriz coberta

| Area                    | Cobertura automatizada                    | Resultado inicial |
| ----------------------- | ----------------------------------------- | ----------------- |
| Cadastro e login        | valido, invalido e contas sinteticas      | PASS              |
| Rota protegida e logout | 401 anonimo e token revogado apos logout  | PASS              |
| Autorizacao basica      | PLAYER recebe 403; SUPER_ADMIN autorizado | PASS              |
| Recuperacao de senha    | 10 cenarios existentes, sem duplicacao    | PASS              |
| API publica             | root, Wiki, Roadmap e Launcher            | PASS              |
| Contrato de erro da API | 400, 401, 403, 404 e 500 controlado       | PASS              |
| Suporte                 | abertura e listagem do proprio ticket     | PASS              |
| Community               | oito suites E2E existentes                | PASS              |
| Portal publico          | Home, Wiki, Roadmap e Downloads em SSR    | PASS              |
| Pagina inexistente      | HTTP 404 HTML real                        | PASS              |

Resultado da primeira execucao isolada:

- API critica: 3 suites, 27 testes;
- Community: 8 suites, 111 testes;
- Web: 8 testes;
- total: 146 testes.

## Limites intencionais

A baseline nao executa compra, pagamento, entrega, estorno, criacao de anuncio,
escrow ou GameBridge. Esses fluxos permanecem blockers operacionais e exigem
ambiente controlado, dados de teste e rollback antes de entrarem neste comando.

`auth-abuse.e2e-spec.ts` continua como suite especializada separada. Ela cobre
rajadas e janelas curtas de rate limit, mas possui historico de sensibilidade a
timing no Windows/Docker. Os fluxos centrais de autenticacao permanecem cobertos
por `portal-critical.e2e-spec.ts` e `password-recovery.e2e-spec.ts`.

Tambem permanecem fora desta baseline:

- entrega real de e-mail de recuperacao, pendente de provedor aprovado;
- 2FA e refresh/session rotation completos;
- uploads reais em storage persistente;
- QA visual em navegador e dispositivos reais;
- testes contra producao.

## Manutencao

Novos testes do beta devem ser deterministas, isolados de producao e adicionados
ao script de dominio correspondente. Uma falha conhecida nao deve ser escondida
com retry automatico; deve ser corrigida ou registrada explicitamente como
blocker tecnico.

Arquivos novos e modificados tambem devem passar por `npm run quality:changed`.
A politica e a divida historica controlada estao documentadas em
`docs/testing/incremental-quality-gate.md`.
