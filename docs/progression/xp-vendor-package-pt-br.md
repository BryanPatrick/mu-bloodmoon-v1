---
status: READY — finalized, NOT sent
category: progression
audience: internal (product) — drafted for eventual external vendor contact
lastVerified: 2026-09-04
confidence: N/A (this document is a communication draft, not a technical finding)
---

# Pacote de perguntas ao fornecedor — versão final PT-BR (Phase W Part 12)

**Status: `VENDOR_XP_QUESTION_PACKAGE_PT_BR = READY`. Não enviado.**
Esta é a tradução final, revisada para tom profissional e concisão, das
8 perguntas técnicas já preparadas em
[`xp-formula-evidence-and-vendor-questions.md`](xp-formula-evidence-and-vendor-questions.md)
(Fase V, Parte 5). Nenhuma pergunta nova foi adicionada — o objetivo
desta fase era finalizar a redação em português, não reabrir a
investigação técnica.

## Mensagem pronta para envio

---

Olá,

Somos administradores de um servidor privado MU Online baseado no
eMuGS e temos algumas dúvidas técnicas específicas sobre o sistema de
experiência que não conseguimos resolver apenas com a documentação
disponível. Agradecemos desde já qualquer ajuda.

**1. Semântica de `AddExperienceRate_AL0-3`**

Este campo é um multiplicador literal aplicado à XP base do monstro
(`final = base × taxa`), um bônus percentual sobre uma base de 100
(`final = base × (taxa/100)` ou `final = base × (1 + (taxa-100)/100)`),
ou um valor que entra na fórmula de `ExperienceMultiplierConstA/B`
abaixo? Se possível, gostaríamos da expressão aritmética exata, não
apenas uma descrição.

**2. Fórmula de `ExperienceMultiplierConstA`/`ExperienceMultiplierConstB`**

Qual é a fórmula completa que converte o `Level` de um monstro
(coluna do `Monster.txt`) em XP base, usando essas duas constantes? A
documentação que temos apresenta apenas dois exemplos isolados de
resultado ("para `MaxLevel=1000` → 1" e "→ 6"), sem a fórmula que os
produz — e nosso `MaxLevel` real é 400, não 1000, então não
conseguimos aplicar o exemplo diretamente. Se possível, gostaríamos da
fórmula em si, não de outro exemplo pontual.

**3. Ordem de aplicação**

Para uma morte "normal" (sem evento, sem quest, sem grupo, sem
seals/buffs especiais), em que ordem os seguintes fatores são
aplicados: XP base (via `Level` + ConstA/B) → `AddExperienceRate_AL*`
→ `ExperienceRate` por mapa (`MapManager.txt`) →
`ExperienceRandomAditional`? Gostaríamos da sequência exata.

**4. Acúmulo evento + quest**

Para uma morte que ocorre durante um evento ativo E que também
concede XP de quest simultaneamente (se esse estado for realmente
possível), `AddEventExperienceRate_AL*` e `AddQuestExperienceRate_AL*`
se aplicam os dois (multiplicativa ou aditivamente — qual dos dois?),
um sobrescreve o outro, ou esse não é um estado real alcançável no
jogo?

**5. Acúmulo com grupo (party)**

`PartyGeneralExperience<N>`/`PartySpecialExperience<N>` (percentual
por tamanho de grupo) se aplica sobre a XP *base* (antes de
`AddExperienceRate_AL*`) ou sobre a XP *já multiplicada pelo tier da
conta*? Gostaríamos da posição exata na fórmula.

**6. Acúmulo entre AccountLevel (tier VIP) e Master XP**

`AddMasterExperienceRate_AL0-3` usa a mesma fórmula baseada em
`ExperienceMultiplierConstA/B` da XP normal (apenas com uma taxa de
entrada diferente), ou a Master XP é calculada por uma fórmula
estruturalmente diferente? Se for diferente, poderiam fornecê-la?

**7. `ExperienceRandomAditional`**

Quando esse valor é diferente de zero, qual é o mecanismo exato de
variação aleatória (faixa uniforme? percentual aleatório? aplicado
antes ou depois do multiplicador de tier)? Hoje está confirmado em 0
no nosso servidor, mas gostaríamos de entender o mecanismo antes de
eventualmente alterá-lo.

**8. Interação com `ExperienceTable.txt`**

Se adicionássemos uma linha real a esse arquivo (hoje vazio) — por
exemplo, um bônus temporário de XP de evento para personagens com
contagem de reset entre 10 e 20 —, o valor de `ExperienceRate` dessa
linha substitui `AddExperienceRate_AL*` para os personagens
correspondentes, ou se acumula com ele? A mesma dúvida
multiplicativo-vs-aditivo da pergunta 1, mas específica para esse
mecanismo.

Agradecemos muito a atenção e ficamos à disposição para qualquer
esclarecimento adicional sobre nossa configuração atual, se for útil
para responder.

Atenciosamente,
Equipe Blood Moon

---

```
VENDOR_XP_QUESTION_PACKAGE_PT_BR = READY (8 perguntas, tom
  profissional, tecnicamente precisas, tradução 1:1 do pacote em
  inglês da Fase V -- nenhuma pergunta nova, nenhuma reescrita de
  conteúdo técnico)
SENT = NO
```

## Related systems

`docs/progression/xp-formula-evidence-and-vendor-questions.md` (Phase
V, source of the 8 questions in English), `docs/progression/vendor-response-intake-template.md`
(Phase W Part 13 — how to record whatever answer eventually comes back).
