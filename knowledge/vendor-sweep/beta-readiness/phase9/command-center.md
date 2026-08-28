---
status: DRAFT_READY_WITH_MINOR_GAPS
category: beta-readiness/phase9
audience: player-facing -- this page replaces comandos.md (Phase 8) for Open Beta publication purposes
confidence: BLOODMOON_CONFIRMED only -- see exclusion note below
lastVerified: 2026-08-28
publish: NOT_PUBLISHED -- draft only
---

# Central de Comandos

**Regra desta página**: só entra aqui um comando cuja sintaxe exata de digitação (a palavra depois da barra) está confirmada por configuração real do servidor, não apenas um recurso cuja existência está confirmada. Isso é mais rígido que o guia de comandos da Fase 8 -- vários comandos que lá apareciam como "existe, sintaxe inferida" foram removidos daqui e movidos para a seção de exclusão no final.

## Comandos de evento (`BLOODMOON_CONFIRMED`)

| Comando | O que faz |
|---|---|
| `/participar <evento>` | Entra no evento que um GM tiver aberto, para uma lista fixa de eventos: `russian`, `absorption`, `tvt`, `runandcatch`, `bbb`, `ctf`, `pvpall`, `stopordie`, `pandora` (e o evento genérico do GM). A maioria destes está desativada hoje -- ver a Central de Eventos antes de tentar. |

## Comandos de progressão (`BLOODMOON_CONFIRMED`)

| Comando | O que faz |
|---|---|
| `/reset` | Reseta seu personagem no nível 400, sem custo, concede 450 ou 500 pontos de status. Ver o guia de Reset. |
| `/masterreset` | Existe mas **está desativado hoje**. Não vai funcionar mesmo cumprindo os requisitos. |

## Comandos de conta/jogabilidade

Nenhum outro comando tem sintaxe exata de digitação confirmada nesta fase -- ver a seção de exclusão abaixo.

## Comandos de troca/social

Nenhum confirmado com sintaxe exata nesta fase.

## Comandos utilitários

Nenhum confirmado com sintaxe exata nesta fase.

---

## O que NÃO está aqui e por quê

Os seguintes recursos foram confirmados como **existentes e ativos** no servidor (por configuração real), mas a sintaxe exata do comando digitado pelo jogador **não foi confirmada em cliente real** em nenhuma fase deste projeto -- por isso não entram nesta página, para não apresentar algo inferido como se fosse confirmado:

- Empacotar/desempacotar joias (bless, soul, life, creation, guardian, genstone, harmony, chaos, refino) -- recurso confirmado ativo, comando exato não confirmado.
- Correio/postagem (enviar, comprar, vender por correio) -- confirmado ativo, comando não confirmado.
- Distribuição de pontos de status.
- Limpar status de PK.
- Moeda eletrônica/loja.
- Trocar personagem/classe.
- Armazém pessoal (Ware).
- Limpar inventário.
- Renomear personagem.
- Trancar/destrancar.
- Amigo do Discord.
- Sistema de indicação.
- Comando do Leilão (participação no Auction).
- Auto-poção.

**Ação recomendada antes da publicação**: testar cada um destes em cliente real para confirmar a sintaxe exata, ou aceitar publicar a página sem eles até que sejam confirmados -- não adivinhar.

## Comandos nunca expostos aqui (GM/Admin/Internal)

Por design, esta página nunca lista: `/openevent` e variantes (comando de GM), qualquer comando de moderação, qualquer comando de debug/operacional. Ver o guia interno de comandos GM (Fase 7/8) para esses, restrito à equipe.
