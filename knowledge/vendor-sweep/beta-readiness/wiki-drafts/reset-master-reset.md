---
status: READY_FOR_OPEN_BETA (finalized Phase 9, Part H)
category: beta-readiness/wiki-drafts
audience: player-facing (Wiki + support)
confidence: CONFIRMED_BY_CONFIG
source: GameServer/DATA/GameServerInfo - Command.dat, GameServerInfo - Event.dat (real Blood Moon config, read 2026-08-27, Phase 6)
provenance: atomic-claims.json CLAIM-035, CLAIM-094, CLAIM-095, CLAIM-100, CLAIM-101; progression-entries.json PROG-002, PROG-003, PROG-004
lastVerified: 2026-08-28 (Phase 9 finalization -- content unchanged, every field already CONFIRMED_BY_CONFIG, audited against the stricter Phase 9 bar and passed with no gaps)
publish: NOT_PUBLISHED -- draft only, publish authorization is a separate decision
---

# Reset e Master Reset

## CURRENT_REAL_STATE (confirmado por config real do servidor)

### `/reset`

| Campo | Valor confirmado |
|---|---|
| Status | **ATIVO** (`CommandResetSwitch = 1`) |
| Nível exigido | **400**, igual para as 4 faixas de VIP (AL0-AL3) |
| Custo | Nenhum custo em item, zen ou quest documentado no config |
| Pontos de status concedidos | **450** (conta free / VIP AL0) ou **500** (VIP AL1, AL2, AL3) por reset |
| Limite total de resets | **20** para AL0/AL1/AL2, **50** para AL3 (o tier VIP mais alto) |
| Limite diário/semanal/mensal | Nenhum limite real aplicado -- os campos existem no config mas estão todos configurados para um valor efetivamente ilimitado (10000) |
| O que acontece ao personagem | Reinicia o nível para 1 e incrementa o contador de resets |

**O que isso significa na prática para o jogador**: para dar reset, o personagem precisa chegar ao nível 400. Não há custo em zen/itens. Cada reset concede 450 ou 500 pontos de status (dependendo do tier VIP da conta), e o personagem volta ao nível 1 para começar a subir de novo. O teto de resets (20 ou 50, dependendo do VIP) é o único limite real hoje.

### `/masterreset`

| Campo | Valor confirmado |
|---|---|
| Status | **DESATIVADO** (`CommandMasterResetSwitch = 0`) -- o comando existe no config mas não pode ser usado agora |
| Nível exigido (se fosse ativado) | 400 |
| Resets exigidos (se fosse ativado) | 1000, igual para as 4 faixas de VIP |
| O que aconteceria (se fosse ativado) | Reset completo: personagem volta ao nível 400 com 0 resets e 0 pontos de status bônus |

**Nota importante**: o requisito de 1000 resets não é um valor padrão de template -- alguém configurou esse número deliberadamente. Isso sugere que o Master Reset foi preparado para um lançamento futuro, não simplesmente esquecido/abandonado. Ainda assim, **hoje o comando está desligado e não pode ser usado por jogadores**.

### Requisito de entrada em eventos por reset (ResetMin/ResetMax)

O motor do servidor suporta uma trava de "reset mínimo/máximo" para entrar em Blood Castle, Chaos Castle, Devil Square e Illusion Temple -- mas **hoje essa trava está desligada em todos os 4 eventos e todos os valores são 0/0**. Ou seja: **não existe restrição de reset para entrar nesses 4 eventos atualmente**. Isso pode mudar em uma atualização futura (o mecanismo está pronto, só não está sendo usado).

**Detalhe adicional confirmado na Fase 8** (vídeo de fornecedor sobre a atualização 2.0.1.7 do motor, cruzado com o config real já lido): a partir dessa versão, a trava deixou de ser um único par Min/Max por evento inteiro e passou a ser **configurável individualmente por sub-nível** -- até 8 pares para Blood Castle (sub-níveis 1-8), 7 para Chaos Castle, 7 para Devil Square, 6 para Illusion Temple. Cada sub-nível também tem 2 caixas de marcação independentes: "exige Reset" e "exige Master Reset" -- ou seja, no futuro será possível, por exemplo, exigir reset só para entrar no Blood Castle nível 5 em diante, sem afetar os níveis 1-4. **Isso não muda o estado atual (tudo desligado, valores 0/0) -- é só o nível de detalhe que o motor suporta, caso essa trava seja ativada no futuro.**

**Atualização confirmada na Fase 10**: Blood Castle, Chaos Castle e Devil Square estão **realmente ativos** no servidor hoje, com agenda automática real (ex.: Blood Castle a cada 2 horas). **Illusion Temple é diferente dos outros 3 -- está desativado** (`IllusionTempleEvent = 0`). Isso não muda a informação acima sobre reset (nenhum dos 4 exige reset hoje), mas corrige uma imprecisão das Fases 7-9, que tratava os 4 como um grupo uniforme. Ver a Central de Eventos para o detalhe completo por evento.

## FUTURE_DESIGN / RECOMMENDATION (não confirmado, não publicar como fato do servidor)

- O Master Reset parece preparado para ativação futura (ver nota acima) -- **não afirmar uma data ou promessa de quando isso vai acontecer** sem confirmação do time.
- Qualquer sistema de "pontos de build" pós-nível-400 mencionado em vídeos do fornecedor é uma sugestão genérica do fornecedor sobre como um admin PODERIA configurar o `CustomMonster.txt`, não uma confirmação de que o Blood Moon usa isso -- classificado como RECOMMENDATION, não FACT (ver `progression-entries.json` PROG-001).

## Perguntas de jogador que este guia responde

- "Com quanto nível eu dou reset?" → 400.
- "Reset custa alguma coisa?" → Não, pelo config atual.
- "Quantos pontos eu ganho por reset?" → 450 (free/AL0) ou 500 (AL1-3).
- "Até quantos resets eu posso dar?" → 20 (AL0-AL2) ou 50 (AL3).
- "Existe master reset?" → O comando existe no servidor mas está desativado hoje.
- "Preciso de um número mínimo/máximo de resets pra entrar no Devil Square/Chaos Castle/etc?" → Não, essa trava existe no motor mas está desligada.

## Status de publicação

`NEEDS_GAMEPLAY_VALIDATION`: nenhum destes valores foi testado ao vivo em jogo nesta sessão -- vêm de leitura direta do arquivo de configuração real do servidor (alta confiança, mas não é o mesmo que uma confirmação por gameplay real). Recomenda-se uma checagem rápida em jogo (dar um reset real, conferir o ganho de pontos) antes de publicar isso como página oficial da Wiki.
