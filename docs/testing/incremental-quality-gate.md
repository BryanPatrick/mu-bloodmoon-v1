# Quality gate incremental

## Objetivo

O repositorio possui divida historica de formatacao. A politica pre-beta preserva essa divida sem
reescrever arquivos em massa, mas impede que arquivos novos ampliem o problema.

## Comando

```powershell
npm run quality:changed
```

O comando considera arquivos adicionados ou modificados no worktree e executa:

1. `git diff --check` para espacos em branco invalidos;
2. ESLint nos arquivos JavaScript, TypeScript e Vue tocados;
3. Prettier nos arquivos relevantes tocados;
4. comparacao das divergencias com a baseline legada em
   `scripts/quality/prettier-legacy-files.txt`.

Arquivos fora da baseline que nao passam no Prettier fazem o gate falhar. Arquivos ja registrados na
baseline sao informados como divida legada, sem provocar uma reformatacao global. Ao corrigir
definitivamente um arquivo legado, sua entrada deve ser removida da baseline no mesmo commit.

## Divida registrada

Na criacao deste gate, o repositorio possuia:

- 248 arquivos divergentes do Prettier;
- 1 erro de lint `no-useless-assignment`, corrigido de forma semanticamente neutra;
- 51 avisos de lint preservados: 50 `no-unused-vars` e 1 `vue/attributes-order`.

Os avisos foram classificados como `DEAD_CODE` ou `STYLE`, preexistentes e sem evidencia de risco de
seguranca. Eles devem ser reduzidos em tarefas pequenas e especificas, sem refatoracao ampla antes do
beta.

## Limite conhecido

O Prettier valida o arquivo inteiro. Por isso, um arquivo legado tocado continua temporariamente
isento de falha de formatacao ate ser migrado por completo. ESLint e `git diff --check` continuam
ativos nesse arquivo. Essa excecao nao se aplica a arquivos novos.
