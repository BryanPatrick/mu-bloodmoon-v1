# Guild — Guia do Tester (Beta)

**Status:** BETA READY · **Última revisão:** 2026-08-18

Este é o roteiro operacional de testes do módulo de Guildas. Não é preciso conhecimento técnico para executá-lo — siga os passos, compare o resultado obtido com o esperado, e marque PASS ou FAIL.

**Antes de começar:** você precisa de uma conta autenticada com pelo menos dois personagens sem guilda. Alguns casos precisam de uma **segunda conta** (para representar outro jogador) — se você não tiver acesso a uma segunda conta, pule os casos marcados com 👥 e reporte isso na observação.

Para o comportamento esperado em detalhe, consulte a [Especificação Funcional](01-functional-specification.md). Para saber quem pode fazer o quê, consulte [Permissões e Segurança](05-permissions-and-security.md).

## Como reportar um problema

Se encontrar um comportamento diferente do esperado, registre:

- **Página/tela** onde aconteceu.
- **Ação** que você tentou fazer.
- **Resultado esperado** (o que deveria ter acontecido).
- **Resultado recebido** (o que aconteceu de fato — mensagem de erro exata, se houver).
- **Personagem** e **guilda** envolvidos.
- **Horário aproximado**.
- **Print de tela**, se possível.
- **Passos para reproduzir**, na ordem exata que você fez.

**Nunca inclua sua senha, código de autenticador ou código de recuperação no relato** — se o problema aconteceu numa dessas telas, descreva o que apareceu, sem colar os valores digitados.

---

## Matriz de Testes

### Criação e Perfil

**TEST GUILD-001 — Criação de Guilda**

*Pré-condição:* conta autenticada, com um personagem sem guilda.

*Passos:*
1. Acesse o Diretório de Guildas (`/guilds`).
2. Toque em "Criar guilda".
3. Preencha nome e tag válidos, escolha o personagem.
4. Confirme.

*Resultado esperado:* guilda criada, você é redirecionado para o perfil dela, aparece como Líder.

*Resultado obtido:* [ ]

*Status:* [ ] PASS [ ] FAIL

*Observação:* ___________________________

---

**TEST GUILD-002 — Criação com nome/tag já em uso**

*Pré-condição:* uma guilda ativa já existente com um nome/tag conhecido.

*Passos:*
1. Tente criar uma nova guilda usando o mesmo nome (ou a mesma tag) de uma guilda ativa existente.

*Resultado esperado:* erro claro informando que o nome/tag já está em uso; nenhuma guilda é criada.

*Resultado obtido:* [ ]

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-003 — Edição de Perfil**

*Pré-condição:* você é Líder ou Oficial de uma guilda.

*Passos:*
1. Abra o perfil da guilda → "Editar perfil".
2. Altere descrição, modo de recrutamento e ao menos um foco.
3. Salve.

*Resultado esperado:* mudanças refletidas imediatamente no perfil após salvar.

*Resultado obtido:* [ ]

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-004 — Upload de Emblema**

*Pré-condição:* você é Líder ou Oficial.

*Passos:*
1. No editor de perfil, envie uma imagem JPG ou PNG válida como emblema.

*Resultado esperado:* pré-visualização atualiza, imagem aparece no cabeçalho do perfil após salvar/fechar.

*Resultado obtido:* [ ]

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-005 — Upload de Banner**

*Mesmos passos do GUILD-004, para o campo de banner.*

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-006 — Upload de arquivo inválido**

*Passos:*
1. Tente enviar um arquivo que não é imagem (ex.: um `.txt` renomeado para `.jpg`, ou um arquivo maior que 8 MB).

*Resultado esperado:* erro claro, upload rejeitado, imagem anterior (se houver) permanece intacta.

*Status:* [ ] PASS [ ] FAIL

---

### Recrutamento — Aberto

**TEST GUILD-007 — Entrada Direta (OPEN)**

*Pré-condição:* uma guilda com recrutamento "Aberto"; um personagem seu sem guilda.

*Passos:*
1. Abra o perfil da guilda.
2. Escolha o personagem, toque em "Entrar na guilda".

*Resultado esperado:* você vira Membro imediatamente, sem etapa de aprovação.

*Status:* [ ] PASS [ ] FAIL

---

### Recrutamento — Aprovação

**TEST GUILD-008 — Solicitação de Entrada 👥**

*Pré-condição:* uma guilda com recrutamento "Requer aprovação"; um personagem seu sem guilda; acesso a uma conta Líder/Oficial dessa guilda.

*Passos:*
1. Solicite entrada com seu personagem.
2. Confirme que a tela mostra "Solicitação enviada — aguardando aprovação".
3. Com a outra conta, acesse a guilda e aprove a solicitação.

*Resultado esperado:* após a aprovação, seu personagem aparece como Membro na lista de membros.

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-009 — Rejeição de Solicitação 👥**

*Mesma pré-condição do GUILD-008, mas rejeite em vez de aprovar.*

*Resultado esperado:* seu personagem **não** vira membro; a solicitação some da lista de pendentes.

*Status:* [ ] PASS [ ] FAIL

---

### Recrutamento — Convite

**TEST GUILD-010 — Enviar Convite**

*Pré-condição:* você é Líder/Oficial; existe um personagem elegível (sem guilda) para convidar.

*Passos:*
1. Na aba Visão Geral, busque o nome do personagem (mínimo 2 letras) em "Convidar jogador".
2. Toque em "Convidar".

*Resultado esperado:* mensagem "Convite enviado.", o convite aparece em "Convites pendentes".

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-011 — Aceitar Convite 👥**

*Pré-condição:* um convite pendente para uma conta que você controla.

*Passos:*
1. Com a conta convidada, acesse o Painel (`/painel`).
2. Localize "Convites de Guild", toque em "Aceitar".

*Resultado esperado:* vira Membro imediatamente; o convite some do Painel.

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-012 — Recusar Convite 👥**

*Mesma pré-condição do GUILD-011, mas toque em "Recusar".*

*Resultado esperado:* convite some, personagem **não** vira membro.

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-013 — Cancelar Convite**

*Pré-condição:* um convite pendente enviado por você.

*Passos:*
1. Na aba Visão Geral da guilda, em "Convites pendentes", toque em "Cancelar convite".

*Resultado esperado:* o convite some da lista; se o convidado tentar aceitar depois, deve receber erro.

*Status:* [ ] PASS [ ] FAIL

---

### Recrutamento — Fechado

**TEST GUILD-014 — Guilda Fechada não aceita entrada**

*Pré-condição:* uma guilda com recrutamento "Fechado".

*Passos:*
1. Tente entrar/solicitar entrada nessa guilda com um personagem sem guilda.

*Resultado esperado:* nenhuma via de entrada disponível; mensagem informando que o recrutamento está fechado.

*Status:* [ ] PASS [ ] FAIL

---

### Membros e Papéis

**TEST GUILD-015 — Lista de Membros**

*Passos:*
1. Abra a aba "Membros" de qualquer guilda.

*Resultado esperado:* nome, papel, XP e contribuição de cada membro visíveis; coluna de Ações só aparece se você for Líder/Oficial.

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-016 — Promover Membro**

*Pré-condição:* você é Líder; há um Membro comum na guilda.

*Passos:*
1. Na aba Membros, mude o papel do membro para "Oficial" no seletor.
2. Toque em "Aplicar".

*Resultado esperado:* papel muda imediatamente, badge atualiza.

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-017 — Rebaixar Membro**

*Mesmo fluxo do GUILD-016, escolhendo um papel inferior.*

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-018 — Oficial não pode trocar papéis (negação de permissão)**

*Pré-condição:* você é Oficial (não Líder) de uma guilda.

*Passos:*
1. Verifique se o controle de troca de papel (seletor + "Aplicar") aparece para você na aba Membros.

*Resultado esperado:* o controle **não deve aparecer** para um Oficial — apenas o Líder vê essa opção.

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-019 — Remover Membro (Kick)**

*Pré-condição:* você é Líder ou Oficial; há um membro removível na guilda.

*Passos:*
1. Toque em "Remover" ao lado do membro.
2. Digite um motivo com pelo menos 3 caracteres.
3. Confirme.

*Resultado esperado:* membro removido imediatamente da lista.

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-020 — Kick sem motivo é bloqueado**

*Passos:*
1. Tente confirmar a remoção de um membro sem digitar motivo (ou com menos de 3 caracteres).

*Resultado esperado:* botão de confirmação bloqueado ou erro claro; membro **não** é removido.

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-021 — Líder não pode ser removido**

*Pré-condição:* você é Líder ou Oficial de uma guilda com um Líder ativo.

*Passos:*
1. Verifique a linha do Líder na tabela de membros.

*Resultado esperado:* nenhuma ação de remoção disponível na linha do Líder, mesmo para outro Oficial.

*Status:* [ ] PASS [ ] FAIL

---

### Saída e Liderança

**TEST GUILD-022 — Sair da Guilda (membro comum)**

*Pré-condição:* você é Membro (não Líder) de uma guilda.

*Passos:*
1. Na aba Visão Geral, toque em "Sair da guilda".

*Resultado esperado:* você deixa a guilda imediatamente.

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-023 — Líder não consegue sair sem transferir**

*Pré-condição:* você é Líder de uma guilda com pelo menos mais um membro ativo.

*Passos:*
1. Tente sair da guilda diretamente.

*Resultado esperado:* ação bloqueada com uma mensagem explicando que é preciso transferir a liderança primeiro.

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-024 — Transferir Liderança**

*Pré-condição:* você é Líder; há outro membro ativo elegível.

*Passos:*
1. Na aba Membros, toque em "Transferir liderança" ao lado do membro escolhido.
2. Leia o aviso, confirme.

*Resultado esperado:* o membro vira Líder, você vira Oficial imediatamente; botões exclusivos de Líder (ex.: "Encerrar guilda") somem da sua tela sem precisar recarregar a página.

*Status:* [ ] PASS [ ] FAIL

---

### Encerramento

**TEST GUILD-025 — Encerrar Guilda**

*Pré-condição:* você é Líder de uma guilda de teste (⚠️ ação permanente — use uma guilda dedicada a testes, não uma guilda em uso real).

*Passos:*
1. Toque em "Encerrar guilda".
2. Digite sua senha atual (e o código de autenticador, se sua conta tiver 2FA).
3. Digite o nome ou a tag exata da guilda no campo de confirmação.
4. Confirme.

*Resultado esperado:* guilda encerrada, você é levado de volta ao Diretório; a guilda some da listagem pública.

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-026 — Encerrar com confirmação errada**

*Passos:*
1. Repita o GUILD-025, mas digite um texto diferente do nome/tag no campo de confirmação.

*Resultado esperado:* ação recusada com erro claro; guilda continua ativa.

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-027 — Encerrar com senha errada**

*Passos:*
1. Repita o GUILD-025, digitando uma senha incorreta.

*Resultado esperado:* ação recusada; guilda continua ativa.

*Status:* [ ] PASS [ ] FAIL

---

### Negações de Permissão

**TEST GUILD-028 — Não-membro não vê ações de gestão**

*Passos:*
1. Acesse o perfil de uma guilda da qual você **não** é membro.

*Resultado esperado:* nenhum botão de "Editar perfil", "Encerrar guilda", convidar, aprovar, remover ou trocar papel aparece.

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-029 — Membro comum não vê ações de gestão**

*Pré-condição:* você é Membro comum (não Líder/Oficial).

*Passos:*
1. Acesse o perfil da sua própria guilda.

*Resultado esperado:* mesmo resultado do GUILD-028 — apenas "Sair da guilda" disponível.

*Status:* [ ] PASS [ ] FAIL

---

### Estados de Erro

**TEST GUILD-030 — Erro de carregamento com nova tentativa**

*Passos:*
1. Force uma falha de conexão (ex.: desligue o Wi-Fi por um instante) ao abrir uma aba do perfil (Membros, Solicitações, Projetos, Tesouraria ou Cofre).
2. Reconecte e toque em "Tentar novamente".

*Resultado esperado:* mensagem de erro clara na primeira tentativa; a aba carrega normalmente após "Tentar novamente".

*Status:* [ ] PASS [ ] FAIL

---

### Mobile

**TEST GUILD-031 — Diretório em tela pequena**

*Passos:*
1. Acesse `/guilds` em um celular (ou reduza a janela do navegador para largura de celular).

*Resultado esperado:* sem rolagem horizontal; filtros acessíveis por um botão "Filtros" que abre uma gaveta.

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-032 — Tabela de Membros em tela pequena**

*Passos:*
1. Acesse a aba "Membros" de uma guilda com vários membros, em um celular.

*Resultado esperado:* a tabela vira uma lista de cartões empilhados, com rótulos antes de cada valor; botões de ação continuam tocáveis, sem sobreposição.

*Status:* [ ] PASS [ ] FAIL

---

**TEST GUILD-033 — Modais em tela pequena**

*Passos:*
1. Em um celular, abra cada um dos quatro modais: Criar Guilda, Editar Perfil, Transferir Liderança, Encerrar Guilda.

*Resultado esperado:* nenhum modal ultrapassa a largura da tela; botões de rodapé ficam legíveis e empilhados verticalmente quando necessário.

*Status:* [ ] PASS [ ] FAIL
