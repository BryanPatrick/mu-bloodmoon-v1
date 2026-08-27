---
status: DRAFT_READY_FOR_REVIEW
category: beta-readiness
audience: player-facing template + internal triage fields
lastVerified: 2026-08-27
publish: NOT_PUBLISHED -- draft only
---

# Template de Bug Report -- Bug Hunters

## Campos do jogador

| Campo | Obrigatório | Descrição |
|---|---|---|
| Título | Sim | Resumo curto e específico (não "bug no jogo") |
| Categoria | Sim | Evento / Item / Personagem / Comando / Loja / Guild / Ranking / Launcher / Conta / Outro |
| Personagem | Sim | Nome exato do personagem no momento do bug |
| Data/hora | Sim | Data e hora exatas (incluir fuso horário) |
| Mapa | Se aplicável | Nome do mapa onde ocorreu |
| O que aconteceu | Sim | Descrição do comportamento observado |
| Comportamento esperado | Sim | O que deveria ter acontecido |
| Passos para reproduzir | Sim | Passo a passo numerado |
| Frequência | Sim | Sempre / às vezes / uma vez só |
| Screenshot/vídeo | Recomendado | Anexo visual |
| Impacto | Sim | Cosmético / Incômodo / Bloqueia progresso / Exploit-possível / Perda de item ou moeda |
| Outras notas | Não | Qualquer contexto adicional |

## Campos internos de triagem (não visíveis ao jogador no formulário)

| Campo | Descrição |
|---|---|
| ID único do report | Gerado automaticamente |
| Hash de duplicidade | Combinação normalizada de categoria + mapa + palavras-chave do título, para sugerir possíveis duplicatas antes de abrir um novo report |
| Reports similares sugeridos | Lista de IDs com hash de duplicidade próximo, para o triador revisar manualmente antes de confirmar como duplicata -- **nunca fechar automaticamente sem revisão humana** |
| Status | Novo / Em análise / Confirmado / Não reproduzido / Duplicado / Corrigido / Não é bug |
| Severidade (interna) | Baixa / Média / Alta / Crítica -- definida pelo time, não pelo jogador |
| Responsável | Quem está investigando |

## Explicitamente fora de escopo desta fase

- Lógica de recompensa por bug encontrado (pontos, prêmios, ranking de Bug Hunters) -- **não implementada aqui por instrução explícita**. Isso é `POLICY_REQUIRED`/`PRODUCT_REQUIRED`, decisão de produto separada.
