---
status: DRAFT
category: beta-readiness/phase10
audience: internal (feeds FAQ / First 30 Minutes / support macro updates -- corrects Phase 7-9 content)
lastVerified: 2026-08-28
sourceEvidence: direct code read, apps/api/src/modules/auth/auth.service.ts, mail-transport.service.ts, prisma/schema.prisma
---

# Account activation email -- Phase 10, Part C findings

**Correção importante em relação às Fases 7-9**: o conteúdo anterior repetidamente dizia "e-mail de ativação de conta com bloqueio pendente de provedor aprovado" como se isso bloqueasse o REGISTRO/LOGIN. Isso estava **errado** -- é uma confusão com um problema real, mas de um fluxo diferente (recuperação de senha). Corrigido nesta fase por leitura direta do código real.

```
EMAIL_ACTIVATION_REQUIRED = NO
LOGIN_BEFORE_ACTIVATION = SEMPRE PERMITIDO (não existe "antes da ativação" -- a conta já nasce ativa)
PROVISIONING_BEFORE_ACTIVATION = N/A (provisionamento de conta de jogo é um fluxo separado, com feature-flag própria, não depende de e-mail)
RESEND_AVAILABLE = N/A (não existe e-mail de ativação para reenviar)
PLAYER_INSTRUCTIONS = Nenhuma instrução de confirmação de e-mail é necessária -- o jogador pode fazer login imediatamente após se cadastrar.
```

## Evidência real (código lido diretamente, `apps/api/src/modules/auth/auth.service.ts`)

- `register()` cria a conta com `status: 'ACTIVE'` imediatamente (linha 289), na mesma chamada que grava usuário/senha/e-mail. Não existe nenhum estado intermediário.
- `prisma/schema.prisma`'s `enum AccountStatus { ACTIVE, PENDING, BLOCKED }` -- `PENDING` existe no schema mas **nunca é atribuído** a uma conta em `auth.service.ts` (confirmado por grep, zero ocorrências).
- Busca em todo `apps/api/src/modules/` por qualquer lógica de "email verification"/"confirm email" (`emailVerif`, `EMAIL_VERIF`, `verify-email`, `confirmEmail`): **zero resultados**. Não existe, em lugar nenhum do código, um mecanismo de confirmação de e-mail de cadastro.
- O único lugar em todo o módulo `auth` que efetivamente envia um e-mail é `requestPasswordRecovery()` (linha 453+), que usa `MailTransportService.send()` -- **isso é recuperação de senha, não confirmação de cadastro**.

## O que isso significa

1. Um jogador se cadastra e pode fazer login imediatamente -- não há passo de "confirme seu e-mail" em lugar nenhum.
2. O provisionamento de `GameAccountIdentity` (a conta real dentro do jogo) é um fluxo **separado**, controlado por uma feature flag (`GAME_ACCOUNT_PROVISIONING_ON_REGISTER`) e por um worker de reconciliação -- não depende de confirmação de e-mail de forma alguma.
3. O bloqueio real e conhecido (de auditorias anteriores) é especificamente sobre **recuperação de senha**: se o servidor de e-mail (SMTP) não estiver configurado com um provedor aprovado, `MailTransportService.send()` lança um erro (`ServiceUnavailableException`) -- ou seja, um jogador que esquecer a senha e pedir recuperação pode não receber o e-mail. Isso é um problema real, mas **não impede cadastro nem login**, apenas recuperação de senha esquecida.

## Ação necessária nesta fase

Corrigir todo o conteúdo das Fases 7-9 que descrevia "ativação de conta" como bloqueada por e-mail -- isso nunca foi verdade; o que estava (e pode continuar) bloqueado é a recuperação de senha, um cenário bem mais raro e menos crítico no dia 1 do Open Beta.
