# MuServer export module

Modulo somente leitura para expor os dados extraidos do backup do MuServer.

Fonte atual:

```text
references/game-data/muserver-export
```

Objetivo:

- permitir que Wiki, CMS e painel administrativo visualizem dados reais do servidor;
- comparar base local/portal com arquivos do MuServer;
- alimentar futuras telas de importacao/revisao/aprovacao;
- manter escrita no servidor do jogo fora desta camada.

Regra:

Este modulo nao escreve no SQL Server nem nos arquivos do MuServer. Escrita futura deve passar por modulo separado de ponte com permissao, auditoria, transacao e rollback.
