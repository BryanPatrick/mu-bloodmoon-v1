---
status: DRAFT_READY_FOR_REVIEW
category: beta-readiness/wiki-drafts
audience: PLAYER_COMMAND section is player-facing; GM_COMMAND/ADMIN sections are INTERNAL_ONLY, never publish to public Wiki
confidence: CONFIRMED_BY_CONFIG for existence/enabled-state; syntax details partially inferred from config field names, not live-tested in client this session
source: GameServer/DATA/GameServerInfo - Command.dat, GameServerInfo - CommandGM.dat (real config, read 2026-08-27, Phase 6)
provenance: atomic-claims.json CLAIM-048, CLAIM-049, CLAIM-079, CLAIM-080, CLAIM-094, CLAIM-095
lastVerified: 2026-08-27
publish: NOT_PUBLISHED -- draft only; GM/ADMIN sections must NEVER be published even later
---

# Guia de Comandos

**Aviso de segurança**: as seções `GM_COMMAND` e `ADMIN/INTERNAL` deste documento nunca devem ir para a Wiki pública nem para material de jogador. Elas existem aqui só para o time de suporte interno saber o que existe.

## PLAYER_COMMAND (seguro para publicar)

| Comando | Função | Status | Fonte |
|---|---|---|---|
| `/reset` | Reseta o personagem (ver guia de Reset/Master Reset) | ATIVO | CommandResetSwitch=1 |
| `/masterreset` | Master reset do personagem | **DESATIVADO hoje** | CommandMasterResetSwitch=0 |
| `/join <nome-do-evento>` (participar) | Entra no evento que um GM tiver aberto, para uma lista fixa de 10 eventos | ATIVO como comando, mas a maioria dos 10 eventos-alvo está desativada hoje (ver Central de Eventos) | CLAIM-079 |
| `/pack <tipo>` | Empacota joias soltas em um pacote (bless/soul/life/creation/guardian/genstone/harmony/chaos/lowerrefining/highrefining) | ATIVO | CommandPackJewelSwitch=1 |
| `/unpack <tipo>` | Desempacota um pacote de joias de volta em unidades soltas, mesma lista de tipos | ATIVO | CommandUnPackJewelSwitch=1 |
| Comando de correio/post | Enviar/comprar/vender por correio in-game | ATIVO | CommandPostSwitch, CommandBuyPostSwitch, CommandSellPostSwitch = 1 |
| Comando de distribuição de pontos | Adicionar pontos de status manualmente | ATIVO | CommandAddPointSwitch=1 |
| Comando de limpar PK | Remove o status de PK do personagem | ATIVO | CommandPKClearSwitch=1 |
| Comando de e-money/moeda | Relacionado a moeda eletrônica/loja | ATIVO | CommandEMoneySwitch=1 |
| Comando de troca de personagem/classe | Muda aparência ou classe do personagem | ATIVO | CommandChangeSwitch, CommandChangeClassSwitch=1 |
| Comando de armazém (Ware) | Abre/gerencia o armazém pessoal | ATIVO | CommandWareSwitch, CommandOpenWareSwitch=1 |
| Comando de limpar inventário | Limpa o inventário do personagem | ATIVO | CommandClearINVSwitch=1 |
| Comando de re-adicionar | Função não totalmente documentada nesta sessão | ATIVO | CommandReAddSwitch=1 |
| Comando de renomear | Renomeia o personagem | ATIVO | CommandRenameSwitch=1 |
| Comando de trancar/destrancar | Tranca/destranca algo do personagem (não confirmado exatamente o quê -- provavelmente conta/personagem) | ATIVO | CommandLockSwitch, CommandUnLockSwitch=1 |
| Comando de amigo do Discord | Vincula/gerencia amigo via Discord | ATIVO | CommandDcFriendSwitch=1 |
| Comando de indicação | Sistema de indicação de amigos, com recompensa em moeda | ATIVO | CommandIndicationSwitch, CommandIndicationRewardCoinSwitch=1 |
| Comando de leilão | Interage com o CustomEventAuction (ver Central de Eventos) | ATIVO | CommandAuctionSwitch=1 |
| Comando de auto-poção | Configura reposição automática de vida/mana/AG/SD, dentro e fora de PvP | ATIVO | CommandAutoPotion* = 1 |

**`NEEDS_MORE_DATA`**: a sintaxe exata da barra (`/nome-do-comando`) de vários destes não foi confirmada ao vivo em cliente nesta sessão -- os nomes acima vêm dos nomes dos campos de configuração (ex.: `CommandLockSwitch` sugere um comando "lock", mas o texto exato digitado pelo jogador não foi verificado). Confirmar em jogo antes de publicar como referência exata de digitação.

## GM_COMMAND (`INTERNAL_ONLY` -- nunca publicar)

| Comando | Função |
|---|---|
| `/openevent` (Abrir Evento) | Abre um evento custom sob demanda -- sintaxe varia (índice + nome) conforme o evento suporta múltiplas instâncias ou não |
| Painel GM (tecla D) | Interface com botões para abrir a maioria dos eventos catalogados sem digitar comando |

## ADMIN/INTERNAL (`INTERNAL_ONLY` -- nunca publicar)

- Qualquer configuração feita diretamente nos arquivos `GameServerInfo-*.dat`/`Data/Custom/*.txt` -- edição de servidor, não comando de jogo.
- Registro completo `StartEventXxxSyntax`/`JoinEventXxxSyntax` (documentado na Central de Eventos, seção INTERNAL_ONLY).

## UNKNOWN (nem confirmado nem descartado)

- Existência de outros comandos de jogador além dos listados acima (o arquivo real tem centenas de linhas; esta sessão extraiu os principais, não fez uma varredura exaustiva de 100% dos campos).
- Sintaxe exata de digitação (barra + palavra) para a maioria dos comandos acima -- inferida do nome do campo de config, não confirmada em cliente real.

## Reconciliação do allowlist de `/participar`

Confirmado (CLAIM-079, `JoinEventXxxSyntax` real): exatamente **10 eventos** suportam `/join`: `EventGM`, `Russian` (Russian Roulette), `Absorption`, `TvT` (Team vs Team), `RunAndCatch`, `BBB`, `CTF`, `PvPAll`, `StopOrDie`, `Pandora`.

Confirmado que **NÃO** funcionam com `/join` (exigem clicar em NPC no mapa): CustomArena, Battle Royale, Drop Npc.

Todos os outros eventos custom catalogados (Robber, Guild vs Guild, Kill vs Kill, Racer, Zombie, Drop genérico) estão simplesmente fora da lista de 10 -- não é um bug se `/join` não funcionar para eles, é o comportamento real confirmado do servidor.
