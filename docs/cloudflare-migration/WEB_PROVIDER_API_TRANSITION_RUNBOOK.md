---
status: PREPARED_NOT_AUTHORIZED
category: infrastructure
audience: internal (Bryan + engineering agents)
lastVerified: 2026-09-24
---

# Web Cloudflare -> API do fornecedor: cutover e rollback

## Escopo e decisão autorizada

Este runbook registra a arquitetura transitória aprovada na fase
`CF-WEB-PROVIDER-API-TRANSITION-01`:

```text
mubloodmoon.com.br + www.mubloodmoon.com.br -> Cloudflare Web
api.mubloodmoon.com.br                      -> fornecedor atual
MySQL                                       -> fornecedor atual, junto da API
update.mubloodmoon.com.br                   -> fornecedor atual
MX/SPF/DKIM/DMARC                           -> preservados no caminho atual
```

Este documento **não autoriza o cutover**. Nenhuma etapa de mutação deve
ser executada sem autorização explícita e contemporânea. API, MySQL,
e-mail, update e flags R2 de produção ficam fora do escopo.

## Estado comprovado em 2026-09-24

- O build Nuxt/Nitro para `cloudflare-module`, `nodejs_compat`, SSR,
  headers, CSP com hashes, Turnstile de teste e fluxo local completo de
  autenticação foram comprovados historicamente no branch
  `infra/cloudflare-web-shadow`.
- O projeto remoto é `bloodmoon-web-shadow`, URL
  `https://bloodmoon-web-shadow.bryanelrick22.workers.dev`.
- A versão originalmente validada foi
  `c055ce6d-3139-4833-9096-d2d411a49583`.
- A versão ativa observada no painel em 2026-09-24 é `44e50317`
  (deploy manual via Wrangler, associado ao trabalho posterior de R2).
- A versão ativa responde 200 e mantém os headers de segurança, mas sua
  CSP expõe `connect-src 'self' http://localhost:3333` e
  `img-src ... http://localhost:3333`. Portanto, o runtime config ativo
  caiu no fallback de desenvolvimento e **não é candidato de cutover**.
- Preflight público da API retorna 204 com ACAO exato para
  `https://mubloodmoon.com.br` e `https://www.mubloodmoon.com.br`.
  O mesmo preflight para o hostname `workers.dev` retorna 204 sem ACAO,
  logo o shadow permanece deliberadamente bloqueado por CORS.
- O widget Turnstile `BloodMoon Production`, inspecionado sem alteração,
  permite exatamente `mubloodmoon.com.br` e `www.mubloodmoon.com.br`.
  O hostname `workers.dev` não está na lista.
- O source candidato contém `/api/health` e `/api/ready`, porém ambos os
  caminhos responderam 404 na API de produção em 2026-09-24. Eles não
  podem ser usados como portão do Web cutover até que uma fase de API os
  publique explicitamente; isso não autoriza deploy da API nesta fase.

## Delta mínimo futuro de configuração

| Componente | Estado atual | Estado necessário | Risco | Rollback |
|---|---|---|---|---|
| Build/deploy Web Cloudflare | versão ativa usa fallback `http://localhost:3333/api` | construir e publicar com `NUXT_PUBLIC_API_BASE=https://api.mubloodmoon.com.br/api` | Web sem acesso à API/CSP incorreta se a variável faltar | promover versão anterior conhecida ou manter root/www no fornecedor |
| Turnstile site key | widget de produção configurado para root + www | usar a site key pública de produção sem alterar hostnames | login/registro/recovery falham se chave errada/ausente | manter root/www no fornecedor e não promover o Worker |
| Feature flags públicas | valores reais não foram lidos nesta fase | espelhar exatamente os valores aprovados em produção; marketplace continua desabilitado | exposição indevida de funcionalidade | reverter versão Web |
| Root e `www` | apontam para `190.102.41.133` no fornecedor | direcionar somente root/www ao Web Cloudflare pelo mecanismo autorizado na fase DNS | indisponibilidade do portal | restaurar root/www ao destino anterior |
| `api` | A -> `190.102.41.133` | **sem alteração** | nenhum | não aplicável |
| `update` e e-mail | fornecedor atual | **sem alteração** | quebra de launcher/e-mail se incluídos por engano | restaurar os registros exatos imediatamente |

Não existe delta autorizado para `WEB_PUBLIC_URLS`, API, MySQL,
`DATABASE_URL`, Turnstile hostnames, SMTP, update ou flags R2.

## Portão obrigatório antes do cutover

1. Confirmar controle autenticado do `registro.br` capaz de alterar e
   reverter nameservers, e registrar o titular operacional da conta.
2. Confirmar controle da zona DNS atual capaz de baixar TTL e restaurar
   root/www sem depender do fornecedor durante o incidente.
3. Exportar/inventariar a zona completa e registrar os valores atuais de
   root, www, api, update, MX, SPF, DKIM e DMARC sem registrar segredos.
4. Criar a zona Cloudflare completa, ainda não autoritativa, preservando
   `api`, `update` e todos os registros de e-mail.
5. Construir uma nova versão Web com as quatro variáveis públicas
   explicitamente definidas. A ausência de `NUXT_PUBLIC_API_BASE` é
   falha fechada do procedimento, mesmo que o código ofereça fallback de
   desenvolvimento.
6. Validar a versão por preview antes de promovê-la. Não reutilizar
   `44e50317` como release candidate.
7. Manter o deploy cPanel de `bmweb` íntegro, aquecido e verificável.
8. Registrar o destino anterior de root/www, TTLs e o operador que possui
   acesso de rollback.

## Testes pré-cutover

Executar contra a versão candidata/preview, nunca assumindo que o teste
histórico cobre um novo artefato:

1. `GET /`, `/login`, `/registrar`, `/recuperar-conta`, `/painel` sem
   sessão, uma rota inexistente e uma rota que exercite tratamento de
   erro; validar 200/redirect/404 esperados e ausência de tela branca.
2. Conferir headers: HSTS, CSP, Permissions-Policy, Referrer-Policy,
   X-Content-Type-Options e X-Frame-Options.
3. Conferir CSP: `connect-src` contém somente `'self'` e
   `https://api.mubloodmoon.com.br`; `frame-src`/`script-src` permitem
   exatamente Turnstile; `img-src` contém apenas origens realmente
   necessárias, incluindo API/R2 somente quando usadas.
4. Confirmar ausência de `localhost`, IP do fornecedor e hostname
   `workers.dev` no runtime config/CSP do candidato.
5. Executar login aprovado -> `/painel` -> requisição autenticada com
   Bearer -> refresh -> logout -> rota protegida redireciona ao login.
6. Executar registro com conta descartável aprovada e limpar a conta
   somente em fase que autorize essa mutação.
7. Validar Turnstile nos fluxos login, registro e recuperação; nunca usar
   bypass de teste em produção.
8. Confirmar marketplace de jogador desabilitado e loja oficial com o
   mesmo comportamento de produção.
9. Validar asset loading, fontes, imagens locais, mídia retornada pela
   API atual e referências R2 já autorizadas; zero bloqueio CSP inesperado.
10. Smoke responsivo em desktop e viewport móvel; navegação protegida,
    menu e dashboard sem regressão.
11. Confirmar preflight da API com root e www retorna ACAO exato e que
    origem não autorizada continua sem ACAO.
12. Confirmar `api.mubloodmoon.com.br`, `update`, MX/SPF/DKIM/DMARC e o
    MySQL não sofreram alteração.

## Procedimento futuro de cutover

1. Revalidar todos os portões e capturar evidência datada.
2. Baixar TTL antecipadamente em fase DNS autorizada; não combinar isso
   com alterações de e-mail, API ou update.
3. Publicar/promover o artefato Web aprovado sem rota pública ainda.
4. Executar o smoke pré-cutover completo no preview.
5. Alterar somente o roteamento de root e www para o Web Cloudflare.
6. Não alterar `api`, `update`, MX, SPF, DKIM, DMARC ou nameserver sem o
   plano específico que preserve integralmente esses registros.
7. Executar imediatamente o smoke curto abaixo.
8. Se qualquer critério crítico falhar, iniciar rollback sem esperar uma
   investigação extensa durante a janela.

## Smoke pós-cutover curto

1. Root e www resolvem/servem pelo Cloudflare; `api` continua resolvendo
   para o fornecedor.
2. Homepage retorna 200 e assets essenciais carregam.
3. Headers de segurança e CSP são os esperados; CSP não contém localhost.
4. Turnstile renderiza e produz token aceito pela API.
5. Login funciona.
6. Uma requisição protegida retorna dados da conta correta.
7. Refresh rotaciona os tokens e preserva a sessão.
8. Logout revoga/encerra a sessão e limpa o estado local.
9. Marketplace de jogador permanece desabilitado.
10. `update.mubloodmoon.com.br` e o caminho de e-mail permanecem
    inalterados.

`PASS`: todos os dez itens passam, sem erro CORS/CSP/Turnstile/auth e sem
mudança em API, banco, update ou e-mail.

`FAIL`: falha não crítica e isolada, com causa conhecida e sem impacto em
login/proteção/segurança; não avançar observação até decidir corrigir ou
reverter.

`ROLLBACK_REQUIRED`: homepage indisponível, assets essenciais quebrados,
qualquer falha de login/refresh/logout/protected request, erro CORS/CSP
generalizado, Turnstile inválido, regressão dos headers de segurança ou
qualquer alteração acidental em API/update/e-mail.

## Rollback Web-only

1. Declarar rollback e congelar novas mudanças.
2. Restaurar exclusivamente root/www para o destino anterior
   `190.102.41.133`/alias equivalente registrado no preflight.
3. Se o mecanismo for versão/route do Worker e o DNS continuar correto,
   promover a última versão Web comprovada ou remover apenas a rota do
   Worker, conforme o desenho efetivamente adotado.
4. Não reiniciar nem redeployar API; não alterar MySQL, `DATABASE_URL`,
   Turnstile, e-mail, update ou flags R2.
5. Aguardar apenas a propagação correspondente ao TTL realmente vigente;
   não inventar prazo fixo.
6. Confirmar root e www novamente no cPanel, homepage 200, login,
   requisição protegida e logout.
7. Confirmar `api` ainda no fornecedor e registrar que API/DB não tiveram
   deployment, restart, mudança de configuração ou escrita operacional.
8. Preservar logs, versão falha e evidência para análise posterior.

## Gatilhos de rollback

- root/www não respondem ou apresentam erro persistente;
- login, refresh, logout ou rota protegida falham;
- CORS não devolve a origem pública exata;
- Turnstile não renderiza ou tokens válidos são rejeitados;
- CSP bloqueia a API ou assets essenciais;
- headers de segurança regrediram;
- taxa de erro Web/API cresce imediatamente após o corte;
- `api`, `update` ou e-mail foram alterados por engano;
- o operador perdeu a capacidade de observar ou reverter o roteamento.

## Observação após o cutover

Não há duração arbitrária pré-aprovada. A janela permanece aberta até
existir tráfego real suficiente para cobrir os fluxos críticos e nenhum
sinal abaixo permanecer sem explicação:

- distribuição de status HTTP do Web e rotas mais afetadas;
- erros de JavaScript/hidratação e respostas 404/500;
- falhas de login, refresh, logout, 401 e 429 anômalos;
- erros CORS e violações CSP por diretiva/origem;
- falhas Turnstile por action (`login`, `register`, `recovery`);
- falhas/latência das chamadas para `api.mubloodmoon.com.br`;
- assets 404, imagens bloqueadas e referências R2/provider;
- comparação de latência do Web antes/depois sem atribuir ao API uma
  mudança que não ocorreu.

Coletar: timestamp BRT/UTC, hostname, rota, status, `CF-RAY` quando
presente, correlation ID da API quando presente, diretiva CSP, user-agent
e resultado do fluxo. Nunca registrar senha, JWT, refresh token, token
Turnstile, TOTP ou dados pessoais desnecessários.

## Capacidade e características da API

Com o browser no mesmo hostname público e o API base inalterado, as
chamadas client-side continuam indo diretamente do navegador ao API.
Origem, TLS, headers Bearer, visibilidade do IP e rate limiting não mudam
materialmente. Algumas páginas públicas usam `useAsyncData` e podem
originar chamadas SSR a partir do Worker; isso pode alterar IP de origem,
reuso de conexão e cache para esses GETs públicos. Não autoriza cache de
resposta autenticada. Nenhum WebSocket/EventSource foi encontrado no
Web. Não é necessário load-test de produção para este corte, mas erros e
latência devem ser observados.

## Storage

O build Web e seus assets locais já são compatíveis com Workers. Mídia
mutável pode continuar sendo servida pela API/fornecedor durante o
cutover, desde que `img-src` permita a origem HTTPS exata da API. O R2 é
uma trilha separada: não ativar flags R2 nem migrar uploads como condição
do Web cutover.

## Estado do portão

`WEB_CF_PROVIDER_API_TRANSITION_READY = NO` em 2026-09-24.

Bloqueadores objetivos:

1. shadow ativo `44e50317` usa fallback localhost e precisa ser
   substituído por novo candidato explicitamente configurado;
2. login/register/refresh/logout contra a API atual ainda não foram
   revalidados nesse novo candidato;
3. controle operacional do registro.br/nameservers e capacidade de
   rollback ainda são `UNKNOWN`;
4. mecanismo exato do futuro roteamento root/www ainda não foi
   autorizado/registrado.
