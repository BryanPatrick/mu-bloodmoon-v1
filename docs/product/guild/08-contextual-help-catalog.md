# Guild — Catálogo de Ajuda Contextual

**Status:** conceitual, não implementado · **Última revisão:** 2026-08-18

> **Este documento não implementa nenhum botão "?" na interface.** Ele existe para servir, no futuro, como a fonte de conteúdo caso o portal ganhe um sistema de ajuda contextual. Nenhuma mudança de UI foi feita como parte desta tarefa.

## Como usar este catálogo

Cada item tem um `HELP_ID` único, o local onde apareceria na interface, um título curto, um resumo (para um tooltip ou popover pequeno) e um texto expandido (para um painel de ajuda completo). Todo o conteúdo abaixo foi escrito com base no comportamento real documentado em [01 — Especificação Funcional](01-functional-specification.md) — nada aqui descreve uma funcionalidade que não existe.

---

### `guild.recruitment-mode`

- **LOCATION:** Editor de Perfil da Guilda, campo "Recrutamento"
- **TITLE:** Como funciona o recrutamento?
- **SHORT_HELP:** Define como novos jogadores podem entrar na guilda.
- **EXPANDED_HELP:** Existem quatro modos. **Aberto**: qualquer jogador entra na hora, sem aprovação. **Aprovação necessária**: o jogador pede para entrar e um Líder ou Oficial decide. **Somente convite**: só entra quem for convidado por um Líder ou Oficial — não é possível pedir para entrar. **Fechado**: ninguém entra até o modo ser trocado de novo. Você pode alternar entre os quatro a qualquer momento.
- **TARGET_AUDIENCE:** Líder, Oficial
- **PRIORITY:** HIGH

---

### `guild.roles`

- **LOCATION:** Aba Membros, cabeçalho da coluna "Papel"
- **TITLE:** O que cada papel pode fazer?
- **SHORT_HELP:** Líder, Oficial, Tesoureiro, Membro e Recruta têm autoridades diferentes na guilda.
- **EXPANDED_HELP:** **Líder** decide tudo: troca papéis, transfere a liderança e encerra a guilda — só existe um por vez. **Oficial** gerencia o dia a dia (edita o perfil, convida, aprova solicitações, remove membros) mas não altera papéis nem encerra a guilda. **Tesoureiro** pode criar projetos da guilda. **Membro** e **Recruta** têm as mesmas permissões básicas: participar, criar solicitações de recursos, e sair quando quiserem.
- **TARGET_AUDIENCE:** Todos
- **PRIORITY:** HIGH

---

### `guild.transfer-leadership`

- **LOCATION:** Aba Membros, botão "Transferir liderança"
- **TITLE:** O que acontece ao transferir a liderança?
- **SHORT_HELP:** Você entrega o comando da guilda para outro membro e vira Oficial imediatamente.
- **EXPANDED_HELP:** O membro escolhido vira o novo Líder na hora. Você é rebaixado a Oficial automaticamente, no mesmo instante. Esta ação não pode ser desfeita por você sozinho depois — apenas o novo líder poderá transferir de volta, se quiser.
- **TARGET_AUDIENCE:** Líder
- **PRIORITY:** HIGH

---

### `guild.disband`

- **LOCATION:** Cabeçalho do perfil, botão "Encerrar guilda"
- **TITLE:** O que acontece ao encerrar a guilda?
- **SHORT_HELP:** Encerra a guilda permanentemente — ela some do diretório, mas o histórico é preservado.
- **EXPANDED_HELP:** Exige confirmar sua senha atual (e o código de autenticação em duas etapas, se estiver ativado) e digitar o nome ou a tag exata da guilda. Depois de confirmado: todos os convites e solicitações pendentes são cancelados; a guilda some do diretório público; mas membros, tesouraria e projetos **não são apagados** — o histórico continua existindo. Esta ação não pode ser desfeita.
- **TARGET_AUDIENCE:** Líder
- **PRIORITY:** HIGH

---

### `guild.treasury`

- **LOCATION:** Aba Tesouraria
- **TITLE:** O que é a Tesouraria?
- **SHORT_HELP:** Um cofre de recursos da guilda — hoje só para consulta.
- **EXPANDED_HELP:** A Tesouraria guarda saldos de recursos da guilda (Zen, WCoin, jóias e outros). Nesta fase, os saldos existem mas nenhuma movimentação real (depósito ou saque) é possível ainda — é uma funcionalidade em construção.
- **TARGET_AUDIENCE:** Todos
- **PRIORITY:** MEDIUM

---

### `guild.vault`

- **LOCATION:** Aba Cofre
- **TITLE:** O que é o Cofre?
- **SHORT_HELP:** Um espaço para itens compartilhados da guilda — hoje ainda vazio.
- **EXPANDED_HELP:** O Cofre é onde, no futuro, a guilda poderá guardar itens compartilhados entre os membros. Nesta fase ele existe mas está sempre vazio — nenhuma funcionalidade de depósito de itens está disponível ainda.
- **TARGET_AUDIENCE:** Todos
- **PRIORITY:** LOW

---

### `guild.projects`

- **LOCATION:** Aba Projetos
- **TITLE:** Para que servem os Projetos da guilda?
- **SHORT_HELP:** Organize metas coletivas da guilda, com título, descrição e prazo.
- **EXPANDED_HELP:** Qualquer Líder, Oficial ou Tesoureiro pode criar um projeto — um objetivo coletivo da guilda, com título, meta e prazo opcional. Projetos passam por status (Planejamento, Ativo, Em espera, Concluído, Cancelado) conforme avançam.
- **TARGET_AUDIENCE:** Líder, Oficial, Tesoureiro
- **PRIORITY:** MEDIUM

---

### `guild.focus-tags`

- **LOCATION:** Editor de Perfil, seção "Foco da guild"
- **TITLE:** O que são os focos da guilda?
- **SHORT_HELP:** Etiquetas que mostram no que sua guilda mais gosta de jogar.
- **EXPANDED_HELP:** Escolha quantas etiquetas quiser entre PvP, PvE, Castle Siege, Boss, Farm, Eventos, Casual e Competitivo. Elas aparecem no perfil e no card da guilda no diretório, e ajudam outros jogadores a encontrar guildas com o mesmo estilo de jogo.
- **TARGET_AUDIENCE:** Líder, Oficial
- **PRIORITY:** MEDIUM

---

### `guild.join-request`

- **LOCATION:** Aba Visão Geral (guilda com recrutamento "Requer aprovação")
- **TITLE:** Como funciona pedir para entrar?
- **SHORT_HELP:** Você solicita, um Líder ou Oficial decide.
- **EXPANDED_HELP:** Escolha o personagem e, se quiser, escreva uma mensagem para quem for decidir. Depois de enviar, a solicitação fica pendente até um Líder ou Oficial da guilda aprovar ou recusar — você não precisa fazer nada além de esperar.
- **TARGET_AUDIENCE:** Todos
- **PRIORITY:** HIGH

---

### `guild.invite-only`

- **LOCATION:** Aba Visão Geral (guilda com recrutamento "Somente convite")
- **TITLE:** Por que não consigo pedir para entrar?
- **SHORT_HELP:** Esta guilda só aceita quem for convidado.
- **EXPANDED_HELP:** Guildas "Somente convite" não têm um caminho de auto-cadastro — a entrada só acontece se um Líder ou Oficial da guilda te convidar diretamente. Se você receber um convite, ele aparece no seu Painel.
- **TARGET_AUDIENCE:** Todos
- **PRIORITY:** MEDIUM

---

### `guild.member-kick`

- **LOCATION:** Aba Membros, botão "Remover"
- **TITLE:** O que acontece ao remover um membro?
- **SHORT_HELP:** O membro deixa a guilda imediatamente; é preciso informar um motivo.
- **EXPANDED_HELP:** Remover um membro exige escrever um motivo (mínimo de 3 caracteres) antes de confirmar. O Líder nunca pode ser removido por esta ação, mesmo por um Oficial.
- **TARGET_AUDIENCE:** Líder, Oficial
- **PRIORITY:** MEDIUM

## Classificação por prioridade

| Prioridade | Itens |
|---|---|
| **HIGH** | `guild.recruitment-mode`, `guild.roles`, `guild.transfer-leadership`, `guild.disband`, `guild.join-request` |
| **MEDIUM** | `guild.treasury`, `guild.projects`, `guild.focus-tags`, `guild.invite-only`, `guild.member-kick` |
| **LOW** | `guild.vault` |

A classificação prioriza pontos onde uma decisão tem consequência real e pouco óbvia (recrutamento, papéis, transferência, encerramento) sobre pontos puramente informativos.

## Conexão futura com feedback

> Conceito apenas — **não implementado nesta tarefa.**

No rodapé de cada painel de ajuda contextual, quando esse sistema existir, faz sentido incluir uma chamada do tipo:

> **"Não encontrou sua dúvida?"** → [Enviar feedback / dúvida]

conectando a um sistema de feedback do jogador que ainda não existe no portal. Registrado aqui apenas como ponto de integração natural para quando ambos os sistemas (ajuda contextual e feedback) forem construídos.
