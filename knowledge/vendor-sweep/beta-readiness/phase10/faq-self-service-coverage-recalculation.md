---
status: DRAFT
category: beta-readiness/phase10
audience: internal (product/support planning)
lastVerified: 2026-08-28
generatedBy: scripts/knowledge-faq-coverage-recalc.mjs (Knowledge Phase 10, Part N) -- generated from source, not hand-edited
---

# Recalculo de cobertura de autoatendimento do FAQ (Part N)

Recalculo completo das 45 perguntas de phase9/faq-completo.md, usando 4 categorias em vez do status anterior:

- `ANSWER_SEARCHABLE`: existe uma resposta real E a busca (knowledge-search-query.mjs, modo jogador) realmente encontra essa resposta para a pergunta literal, testado empiricamente, não presumido.
- `STAFF_REQUIRED`: nenhuma resposta estática existe -- sempre depende de um humano avaliar o caso especifico (inclui o antigo `TECHNICAL_REQUIRED`, ja que o caminho de resolucao para o jogador ainda passa por suporte).
- `POLICY_REQUIRED`: bloqueado exclusivamente por uma decisao de produto/negocio ainda nao tomada, nao por falta de pesquisa.
- (Uma quarta categoria, `ANSWER_EXISTS_NOT_SEARCHABLE`, existe no metodo mas teve 0 ocorrencias nesta rodada -- toda resposta real encontrada tambem foi encontravel pela busca apos as correcoes desta fase.)

## Metodologia

Cada pergunta foi executada literalmente (texto exato da coluna "Pergunta" do FAQ) contra `search(query, {mode: 'player'})`. "Buscavel" significa que o top-3 retornou um resultado real e topicamente relevante (verificado manualmente linha por linha nesta fase -- nao apenas "algum resultado nao-vazio", ja que essa versao mais fraca do teste escondeu 2 falsos positivos reais corrigidos durante esta mesma fase, ver secao de bugs abaixo).

## Resultado por pergunta

| Secao | Pergunta | Classificacao | Top resultado da busca |
|---|---|---|---|
| ACCOUNT | Como crio uma conta? | `ANSWER_SEARCHABLE` | ACCOUNT |
| ACCOUNT | Recebo e-mail de confirmação? | `ANSWER_SEARCHABLE` | ACCOUNT |
| ACCOUNT | E se eu esquecer minha senha e não receber o e-mail de recuperação? | `STAFF_REQUIRED` | ACCOUNT |
| ACCOUNT | Posso ter mais de uma conta? | `STAFF_REQUIRED` | CURRENT_REAL_STATE (confirmado por config real do servidor) |
| DOWNLOAD | Onde baixo o cliente/launcher? | `ANSWER_SEARCHABLE` | DOWNLOAD |
| DOWNLOAD | O download funciona em Mac/Linux? | `ANSWER_SEARCHABLE` | DOWNLOAD |
| INSTALLATION | Preciso de requisitos mínimos? | `STAFF_REQUIRED` | CURRENT_REAL_STATE (confirmado por config real do servidor) |
| INSTALLATION | O instalador pede antivírus desligado? | `STAFF_REQUIRED` | INSTALLATION |
| LAUNCHER | O launcher atualiza sozinho? | `ANSWER_SEARCHABLE` | LAUNCHER |
| LAUNCHER | O launcher trava ao abrir | `STAFF_REQUIRED` | LAUNCHER |
| LOGIN | Erro "usuário ou senha inválidos" | `ANSWER_SEARCHABLE` | LOGIN |
| LOGIN | Esqueci minha senha | `ANSWER_SEARCHABLE` | LOGIN |
| CHARACTER | Quais classes existem? | `ANSWER_SEARCHABLE` | CHARACTER |
| CHARACTER | Quantos personagens por conta? | `STAFF_REQUIRED` | CHARACTER |
| LEVELING | Onde devo caçar no início? | `STAFF_REQUIRED` | LEVELING |
| LEVELING | Existe boost de XP para novos jogadores? | `STAFF_REQUIRED` | LEVELING |
| RESET | Como funciona o Reset? | `ANSWER_SEARCHABLE` | CURRENT_REAL_STATE (confirmado por config real do servidor) |
| RESET | Existe requisito de reset para Blood Castle etc.? | `ANSWER_SEARCHABLE` | CURRENT_REAL_STATE (confirmado por config real do servidor) |
| MASTER_RESET | Existe Master Reset? | `ANSWER_SEARCHABLE` | CURRENT_REAL_STATE (confirmado por config real do servidor) |
| MASTER_RESET | Quando será ativado? | `POLICY_REQUIRED` | CURRENT_REAL_STATE (confirmado por config real do servidor) |
| EVENTS | Quais eventos estão ativos? | `ANSWER_SEARCHABLE` | CURRENT_REAL_STATE (confirmado por config real do servidor) |
| EVENTS | Como entro no Blood Castle/Chaos Castle/Devil Square? | `ANSWER_SEARCHABLE` | Eventos clássicos do motor MU |
| EVENTS | Por que /participar não funciona? | `ANSWER_SEARCHABLE` | Reconciliação do allowlist de `/participar` |
| EVENTS | Quando os outros eventos serão ativados? | `POLICY_REQUIRED` | EVENTS |
| COMMANDS | Quais comandos posso usar? | `ANSWER_SEARCHABLE` | COMMANDS |
| ITEMS | Como funciona empacotar joias? | `ANSWER_SEARCHABLE` | ITEMS |
| ITEMS | Perdi um item, o que faço? | `STAFF_REQUIRED` | ITEMS |
| TRADE | Como faço trade com outro jogador? | `STAFF_REQUIRED` | TRADE |
| MARKET | Como uso o Market? | `ANSWER_SEARCHABLE` | MARKET |
| GUILD | Como crio uma guild? | `ANSWER_SEARCHABLE` | Perguntas de jogador respondidas |
| GUILD | Como transfiro liderança? | `ANSWER_SEARCHABLE` | GUILD |
| RANKING | Existe ranking? | `ANSWER_SEARCHABLE` | Rankings |
| RANKING | O ranking aparece no site? | `STAFF_REQUIRED` | RANKING |
| COMMUNITY | Como uso o feed de comunidade? | `ANSWER_SEARCHABLE` | COMMUNITY |
| WIKI | Onde encontro informação do jogo? | `POLICY_REQUIRED` | WIKI |
| BUG_REPORT | Como reporto um bug? | `ANSWER_SEARCHABLE` | BUG_REPORT |
| BUG_REPORT | Ganho recompensa por reportar? | `POLICY_REQUIRED` | BUG_REPORT |
| SECURITY | Minha conta foi invadida, o que faço? | `STAFF_REQUIRED` | SECURITY |
| SECURITY | Existe 2FA? | `ANSWER_SEARCHABLE` | SECURITY |
| F2P | O servidor é gratuito? | `POLICY_REQUIRED` | CURRENT_REAL_STATE (confirmado por config real do servidor) |
| RMT | Posso comprar/vender itens com dinheiro real? | `POLICY_REQUIRED` | CURRENT_REAL_STATE (confirmado por config real do servidor) |
| CLAN_RECEPTION | Existe recompensa por migrar meu clã de outro servidor? | `POLICY_REQUIRED` | CLAN_RECEPTION |
| STAFF | Como me tornar staff/GM? | `POLICY_REQUIRED` | STAFF |
| OPEN_BETA | O que é o Open Beta? | `POLICY_REQUIRED` | FAQ completo -- Open Beta (Part D) |
| OPEN_BETA | O que acontece com meu personagem depois do Beta? | `POLICY_REQUIRED` | O QUE ACONTECE DEPOIS DO BETA |

## Metricas

```
TOTAL_QUESTIONS = 45
ANSWER_SEARCHABLE = 23
ANSWER_EXISTS_NOT_SEARCHABLE = 0
STAFF_REQUIRED = 12
POLICY_REQUIRED = 10

CONTENT_COVERAGE_PERCENT = 51.1
SEARCHABLE_SELF_SERVICE_COVERAGE_PERCENT = 51.1
```

As duas metricas coincidem (51.1%) nesta rodada -- apos as correcoes de bugs de busca feitas nesta mesma fase (ver abaixo), toda pergunta com uma resposta real por escrito tambem se mostrou encontravel pela busca real. Isso NAO significa que a busca esta perfeita (ver o gap de "como denunciar um jogador", corretamente NOT_FOUND, e o caso limite de RMT, ainda PARTIAL, no conjunto de 20 perguntas de teste) -- significa que, para este FAQ especifico, nenhuma resposta real ficou "enterrada" atras de um problema de busca.

Os 22 casos restantes (48.9%) nao sao um problema de busca -- sao gaps reais de conteudo (`STAFF_REQUIRED`, pesquisa/decisao tecnica pendente) ou decisoes de produto pendentes (`POLICY_REQUIRED`). Nenhum dos dois se resolve melhorando o indice de busca.

## Bugs de busca encontrados e corrigidos durante este recalculo

A primeira rodada deste script usou "buscavel = retornou algum resultado nao-vazio", o que escondeu 2 falsos positivos genuinos onde o topo do resultado era irrelevante (reset-master-reset.md respondendo perguntas sobre criacao de conta e recuperacao de senha, apenas por conter as palavras genericas "conta"/"existe" combinadas com o maior peso de tier do corpus). Investigar esses 2 casos revelou um problema estrutural real no motor de busca (nao apenas nestes 2 casos): o bonus de tier + o bonus de qualidade de secao eram somados de forma fixa, permitindo que 1 acerto fraco e coincidental em um documento de tier maximo superasse 2 acertos de conteudo genuinos em um documento de tier menor. Corrigido em `scripts/knowledge-search-query.mjs` escalando esses bonus pela cobertura real de conceitos da consulta (`relevanceRatio = hits / baseConceptCount`) em vez de aplica-los como uma constante fixa. Reconfirmado: 0 WRONG_RESULT no conjunto de 20 perguntas apos a correcao, e os 2 casos especificos ("Como crio uma conta?", "Esqueci minha senha") agora apontam para o conteudo correto.
