---
status: DRAFT
category: beta-readiness/phase9
audience: internal support staff only
lastVerified: 2026-08-28
---

# Macros de suporte -- respostas internas curtas (Part K)

## PLAYER_CANNOT_LOGIN

- **Resposta**: "A mensagem de erro genérica é proposital e não indica se o usuário ou a senha está incorreto. Confirme que digitou exatamente seu usuário e senha. Se tiver certeza de que estão corretos, vamos verificar sua conta."
- **Evidência necessária**: usuário (não a senha), horário da tentativa.
- **Escalar para**: verificação técnica de conta.
- **Nunca prometer**: acesso imediato, nunca pedir a senha do jogador.

## LAUNCHER_NOT_OPENING

- **Resposta**: "Vamos verificar. Pode me enviar um print do erro, se aparecer algum?"
- **Evidência necessária**: sistema operacional, print/mensagem de erro.
- **Escalar para**: técnico/Codex se for um padrão recorrente.
- **Nunca prometer**: correção em prazo específico.

## PATCH_FAILED

- **Resposta**: "Vamos verificar sua atualização. Pode confirmar a versão do launcher e enviar o log ou print do erro de patch?"
- **Evidência necessária**: versão do launcher, print/log.
- **Escalar para**: técnico/Codex.
- **Nunca prometer**: reenvio manual de arquivos sem verificar a causa.

## ACCOUNT_NOT_PROVISIONED

- **Correção Fase 10**: isso NÃO é sobre confirmação de e-mail -- a conta do portal já nasce ativa imediatamente no cadastro (confirmado por leitura de código). "Provisionamento" aqui se refere especificamente à conta de jogo (`GameAccountIdentity`), um fluxo técnico separado, controlado por feature flag e por um worker de reconciliação.
- **Resposta**: "Vamos confirmar o status da sua conta de jogo. Isso pode levar alguns minutos após o cadastro."
- **Evidência necessária**: usuário, horário do cadastro.
- **Escalar para**: verificação técnica/Codex -- este é um fluxo de infraestrutura (não de e-mail).
- **Nunca prometer**: prazo exato sem confirmar a causa.

## EVENT_NOT_WORKING

- **Resposta**: "A maioria dos eventos personalizados ainda não está ativa neste servidor -- isso normalmente não é um bug. Qual evento você está tentando acessar?"
- **Evidência necessária**: nome do evento, comando/ação tentada.
- **Escalar para**: só escalar se for o Leilão (o único evento confirmado ativo) ou um evento que a Central de Eventos marca como ativo.
- **Nunca prometer**: data de ativação de eventos desativados.

## COMMAND_NOT_WORKING

- **Resposta**: "Pode me dizer exatamente o comando que digitou e o que aconteceu?"
- **Evidência necessária**: texto exato do comando, resultado observado.
- **Escalar para**: verificação técnica -- vários comandos ainda não têm sintaxe exata confirmada internamente (ver Command Center).
- **Nunca prometer**: que o comando com certeza funciona.

## RESET_QUESTION

- **Resposta**: "O Reset exige nível 400, não tem custo, e concede 450 ou 500 pontos de status dependendo da sua conta. O Master Reset existe mas está desativado no momento."
- **Evidência necessária**: nenhuma para a resposta padrão.
- **Escalar para**: só se o jogador relatar que cumpriu os requisitos e o comando falhou.
- **Nunca prometer**: data de ativação do Master Reset.

## BUG_REPORT_RECEIVED

- **Resposta**: "Obrigado pelo relatório! Vamos analisar e te retornamos se precisarmos de mais informações."
- **Evidência necessária**: conferir se o template foi preenchido (ver guia de Bug Hunters).
- **Escalar para**: triagem técnica.
- **Nunca prometer**: recompensa específica ou prazo de correção.

## DUPLICATE_BUG

- **Resposta**: "Esse comportamento já foi reportado, obrigado mesmo assim! Vou vincular seu relatório ao existente."
- **Evidência necessária**: comparar categoria + mapa + palavras-chave (ver template de duplicidade).
- **Escalar para**: N/A -- resolvido no próprio atendimento.
- **Nunca prometer**: que reportes duplicados contam separadamente para recompensa.

## GUILD_QUESTION

- **Resposta**: "O sistema de guild no portal permite criar, convidar, mudar papéis e encerrar a guild. Qual parte especificamente você precisa de ajuda?"
- **Evidência necessária**: nome da guild, ação tentada.
- **Escalar para**: qualquer inconsistência de dados (ex.: dois líderes) como bug crítico.
- **Nunca prometer**: recuperação manual de dados sem processo formal.

## RMT_POLICY_PENDING

- **Resposta**: "Ainda não temos uma política pública definida sobre isso. Assim que houver uma decisão oficial, vamos divulgar."
- **Evidência necessária**: nenhuma.
- **Escalar para**: produto, se o jogador insistir ou relatar uma transação específica.
- **Nunca prometer**: nunca confirmar nem negar informalmente que RMT é permitido.
