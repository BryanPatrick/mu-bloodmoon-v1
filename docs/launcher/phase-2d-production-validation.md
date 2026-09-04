# Launcher Phase 2D — validação de produção

Data operacional: 2026-09-03. Commit de produto publicado:
`14277757ce1f6bf17b24833658571a502b183671`, isolado sobre a base limpa
`f43c7c9945d9926efb02b8ca879a116bd61b555d`.

## Estado histórico preservado

- Phase 2C: `PARTIAL`.
- Phase 2D local: `PASS` (`157/157` testes).
- Isolamento do release Phase 2D: `COMPLETE`.
- Nenhuma migration ou mudança de API, GameServer, GameBridge, economia,
  VIP, X-Shop, CashShop, progressão ou drop foi publicada.

## Publicação

O web host foi construído do worktree limpo e publicado com backup prévio,
SHA-256, rollback e reciclagem exclusiva do processo `bmweb`. O novo PID
respondeu `200` simultaneamente no site, em `/launcher/captcha` e no endpoint
de conteúdo da API.

O Launcher foi empacotado como release `1.1.1` sem alteração de fonte (override
de versão de build, necessário porque o pacote público anterior também era
`1.1.0`). O manifesto de conteúdo `1.0.1` foi assinado pela chave privada cuja
chave pública corresponde à chave embutida no cliente. A assinatura, o hash
canônico, o executável e o ZIP foram verificados antes da ativação atômica do
manifesto. O manifesto continua com zero arquivos de cliente e zero exclusões;
apenas anuncia a atualização do Launcher.

## Turnstile

A segunda rotação foi executada sem registrar ou exibir a nova chave. O bundle
local permaneceu protegido por DPAPI e o transporte em texto puro foi removido.
Após a reciclagem exclusiva de `bmapi`, a auditoria sanitizada confirmou:

- configuração do Node Selector igual ao segredo rotacionado;
- exatamente um processo `bmapi` ativo;
- exatamente um processo `bmapi` usando o segredo rotacionado;
- API respondendo `200`.

A chave anterior permanece sujeita somente à janela automática de tolerância
de duas horas informada pelo provedor; não há mais consumidor Blood Moon usando
o valor anterior.

## QA autenticado

Foi usada apenas a conta PLAYER previamente aprovada. Um WebView2 temporário
instanciou o mesmo `CaptchaChallengeService` do Launcher, recebeu o token real
via `window.chrome.webview.postMessage` e o token foi usado uma única vez no
login de produção. Nenhuma credencial, token CAPTCHA, JWT ou refresh token foi
registrado.

Resultados de leitura:

- login: `PASS`;
- identidade aprovada: confirmada;
- role: `PLAYER`;
- 2FA: não habilitado nessa conta;
- `/launcher/me`: `PASS`;
- `gameReady`: `true`;
- `provisioningStatus`: `ACTIVE`.

A sessão criada pelo teste foi revogada ao final e os temporários sensíveis
foram removidos. Não existia conta QA segura com 2FA, nem conta autenticável
aprovada com `gameReady=false`; esses cenários não foram fabricados.

## Smoke e limites empíricos

- Pré-deploy: `40/40`, zero falhas, zero `5xx`.
- Pós-deploy/rotação: `40/40`, zero falhas, zero `5xx`.
- CAPTCHA host: página real e Turnstile real validados.
- DPI 100%: disponível; o QA visual autenticado completo não foi repetido.
- DPI 125% e 150%: `BLOCKED_SAFE_ENVIRONMENT`.
- 2FA real: `BLOCKED_SAFE_TEST_ACCOUNT`.
- `gameReady=false` e conta restrita: `BLOCKED_SAFE_TEST_DATA`.

## Limpeza

Os crons temporários e os scripts/pacotes operacionais foram removidos por
allowlist. O backup diário foi preservado. Logs sanitizados e backups de
rollback foram mantidos. Nenhum segredo aparece nesta documentação ou nas
evidências locais.
