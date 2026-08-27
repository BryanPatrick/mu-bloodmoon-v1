---
status: DRAFT_READY_FOR_REVIEW
category: beta-readiness
audience: internal support team only
lastVerified: 2026-08-27
publish: NOT_PUBLISHED -- internal runbook, never public
---

# Runbook de Suporte -- Open Beta

Nunca inclua segredos, credenciais, ou comandos operacionais privilegiados (produção, cPanel, banco, GameBridge) em nenhuma resposta a jogador.

## ACCOUNT (conta)

- **Perguntar**: nome de usuário, e-mail cadastrado.
- **Responder na hora**: como redefinir senha (se o fluxo de recuperação estiver funcionando -- checar status atual antes de prometer), como funciona 2FA.
- **Evidência a pedir**: e-mail de confirmação de cadastro, se existir.
- **Escalar quando**: suspeita de conta comprometida, e-mail não recebido, 2FA travado sem acesso ao dispositivo.
- **Nunca**: pedir a senha do jogador por qualquer canal; alterar e-mail/senha de conta sem verificação de identidade.

## LAUNCHER

- **Perguntar**: versão do launcher, mensagem de erro exata, sistema operacional.
- **Responder na hora**: link de download atual, requisito mínimo (se documentado).
- **Evidência a pedir**: print da mensagem de erro.
- **Escalar quando**: launcher trava/crasha de forma consistente, ou o manifesto de patch parece corrompido.
- **Nunca**: pedir para o jogador rodar como administrador sem necessidade comprovada, nem desabilitar antivírus.

## LOGIN

- **Perguntar**: mensagem de erro exata na tela de login.
- **Responder na hora**: erro genérico de "usuário ou senha inválidos" é proposital (não revela qual dos dois está errado) -- não é bug.
- **Evidência a pedir**: horário exato da tentativa.
- **Escalar quando**: login falha mesmo com senha correta confirmada, ou erro de servidor (500).
- **Nunca**: confirmar se um nome de usuário existe ou não no sistema (risco de enumeração de contas).

## GAME ACCESS (acesso ao jogo)

- **Perguntar**: personagem, servidor/canal, última ação antes do problema.
- **Responder na hora**: N/A -- normalmente requer investigação.
- **Evidência a pedir**: hora exata, print/vídeo se possível.
- **Escalar quando**: sempre, a menos que seja um problema já catalogado como "não é bug" (ver Central de Eventos/FAQ).
- **Nunca**: prometer prazo de resolução sem confirmação do time técnico.

## CHARACTER (personagem)

- **Perguntar**: nome exato do personagem, o que mudou/sumiu.
- **Responder na hora**: N/A -- geralmente requer verificação de dados reais.
- **Evidência a pedir**: print antes/depois se o jogador tiver.
- **Escalar quando**: perda de item, nível, ou stats sem explicação.
- **Nunca**: restaurar/editar dados de personagem manualmente sem processo formal aprovado.

## RESET

- **Responder na hora, usando o guia oficial**: nível 400 exigido, sem custo, 450/500 pontos de status dependendo do VIP, teto de 20 (AL0-AL2) ou 50 (AL3) resets. Master Reset existe mas está desativado hoje.
- **Escalar quando**: jogador afirma ter cumprido o requisito e o comando não funcionou.

## EVENT (evento)

- **Responder na hora, usando a Central de Eventos**: a maioria dos eventos custom está desativada hoje -- isso não é bug na maioria dos casos.
- **Escalar quando**: um evento **confirmado ativo** (ex.: Leilão) não está funcionando.

## ITEM

- **Perguntar**: nome exato do item, como foi obtido/perdido.
- **Evidência a pedir**: print, hora exata.
- **Escalar quando**: item desaparece sem explicação, ou duplicação de item (crítico -- escalar imediatamente, possível exploit).
- **Nunca**: recriar/duplicar item manualmente sem processo formal aprovado (risco de abuso).

## BUG

- **Usar o template de bug report desta fase.**
- **Escalar quando**: sempre, para triagem -- suporte de primeira linha não decide severidade.

## PAYMENT/RMT POLICY (pagamento / política de RMT)

- **Nunca responder com regras específicas de RMT ou preços** -- isso é `POLICY_REQUIRED`, ainda não definido pelo produto nesta fase.
- **Responder na hora**: "ainda não temos uma política pública de RMT definida" é uma resposta honesta e segura.
- **Escalar quando**: qualquer pergunta específica sobre RMT, preços de loja, ou métodos de pagamento -- para o time de produto, não para suporte técnico resolver sozinho.
- **Nunca**: confirmar ou negar informalmente que RMT é permitido.

## GUILD

- **Responder na hora, usando o guia oficial**: como criar, convidar, papéis, transferência de liderança, disband.
- **Escalar quando**: inconsistência de dados de guild (ex.: dois líderes aparentes -- isso seria uma falha grave do sistema, já que o sistema garante exatamente 1 líder; escalar como bug crítico).

## REPORT/ABUSE (denúncia/abuso)

- **Perguntar**: nome do jogador denunciado, o que aconteceu, quando.
- **Evidência a pedir**: print/vídeo se possível.
- **Escalar quando**: sempre -- suporte de primeira linha coleta a denúncia, não pune.
- **Nunca**: revelar a identidade de quem denunciou, nem o resultado de uma investigação de outro jogador.

## TECHNICAL (técnico)

- **Perguntar**: mensagem de erro exata, o que o jogador estava fazendo.
- **Escalar quando**: qualquer coisa que pareça um problema de infraestrutura (lag geral, servidor fora do ar) -- isso é responsabilidade da equipe técnica/Codex, suporte só reporta o sintoma, nunca tenta diagnosticar ou mexer em infraestrutura.
- **Nunca**: acessar, mencionar, ou especular sobre configuração de produção, banco de dados, ou infraestrutura em qualquer resposta a jogador.
