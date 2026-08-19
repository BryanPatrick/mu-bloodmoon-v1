# Guild — Visão Executiva

**Status: BETA READY** · Última revisão: 2026-08-18

## O que a Guild oferece

A Guild dá a qualquer jogador do Blood Moon a possibilidade de fundar, gerenciar e fazer crescer sua própria organização dentro do portal — nome, tag, identidade visual (emblema e banner), uma descrição pública, e um foco declarado (PvP, Castle Siege, Farm, e outros). Qualquer jogador pode criar a sua, sem depender da equipe do servidor.

## Por que isso importa

Guildas são o principal motor de retenção social em jogos como MU Online: jogadores que fazem parte de um grupo organizado jogam mais, voltam com mais frequência e recomendam o servidor a outros jogadores. Até esta etapa, esse sistema não existia no portal — jogadores não tinham nenhuma forma central de se organizar, recrutar ou administrar um grupo fora do próprio jogo.

## A experiência do jogador, do início ao fim

1. **Encontrar ou criar**: o jogador navega um diretório público de guildas, com busca e filtros, ou cria a própria em poucos passos.
2. **Recrutar do seu jeito**: cada guilda escolhe como aceita novos membros — porta aberta, por aprovação de um líder, só por convite, ou fechada temporariamente.
3. **Organizar a hierarquia**: cinco papéis (Líder, Oficial, Tesoureiro, Membro, Recruta) definem quem pode fazer o quê — promover, remover, editar o perfil, decidir quem entra.
4. **Passar a liderança adiante**: um líder pode entregar a guilda para outro membro de confiança a qualquer momento, com atualização imediata de quem manda em quê.
5. **Encerrar com segurança**: se a guilda chega ao fim, o encerramento exige confirmação forte (senha, segundo fator quando ativado, e digitar o nome da guilda) — não é uma ação de um clique só, e nada do histórico é apagado.

## Segurança, do jeito certo

Toda ação sensível é validada no servidor, nunca apenas na tela — um jogador não consegue burlar as regras manipulando o que vê na tela. As ações mais delicadas (trocar quem lidera, encerrar a guilda) têm proteção extra: a troca de liderança é uma operação única e atômica que nunca deixa a guilda sem líder nem por um instante, e o encerramento exige reconfirmação de identidade (senha e, se a conta tiver autenticação em duas etapas, o segundo fator também). O sistema foi testado extensivamente contra cenários de "duas ações ao mesmo tempo" (por exemplo, dois convites concorrendo pelo mesmo jogador) para garantir que nunca haja um resultado ambíguo ou corrompido.

## Status atual: BETA READY

O ciclo de vida completo já funciona de ponta a ponta e foi validado com testes automatizados extensivos (mais de cem cenários, incluindo casos de concorrência) e com uma sessão real de uso autenticado. Está pronto para exposição a beta testers.

**O que já está pronto:**
- Criação de guilda pelo próprio jogador.
- Perfil completo, editável, com upload de imagens.
- Os quatro modos de recrutamento, cada um funcionando de ponta a ponta.
- Gestão de membros e papéis, com as devidas proteções.
- Transferência de liderança e encerramento, ambos com salvaguardas fortes.
- Tesouraria, Cofre e Projetos já modelados no banco de dados (Tesouraria e Cofre ainda somente para consulta, sem movimentação real nesta fase).

**O que ainda não existe** (registrado honestamente, sem prometer prazo): um histórico visual de tudo que aconteceu na guilda, cargos totalmente customizáveis, um sistema de notificações automáticas, eleições internas, um sistema de "pontuação/poder" da guilda, metas e missões coletivas, e conquistas. Nada disso bloqueia o lançamento em beta — são evoluções natural do produto, já mapeadas e priorizadas para etapas futuras (ver [Limitações Conhecidas e Backlog](07-known-limitations-and-backlog.md)).

## Evolução futura

O sistema já foi desenhado para crescer sem precisar ser refeito: os modelos de dados de Tesouraria, Cofre e sincronização com o jogo real já existem no banco, prontos para receber funcionalidade real quando a prioridade de produto permitir. O próximo passo mais natural depende de decisão de produto — não técnica.
