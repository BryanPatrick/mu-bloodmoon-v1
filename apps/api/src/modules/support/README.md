# Suporte e moderacao

O modulo atende tickets do proprio jogador e operacoes autorizadas de ADM/Super ADM. Um ADM somente modera contas `PLAYER`; o proprio usuario e Super ADM sao alvos protegidos.

Bloqueio, banimento e desbloqueio atualizam o status da conta, incrementam `sessionVersion` e registram auditoria. Toda resposta de ticket e acao de moderacao exige justificativa.

O modulo depende da migracao `20260722143000_support_and_moderation`.
