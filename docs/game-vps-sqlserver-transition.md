# Transicao para VPS do jogo com SQL Server

## Contexto

O deploy planejado inicialmente usava uma VPS separada com PostgreSQL para dados do portal e uma ponte futura para o servidor MU. A nova decisao operacional e publicar o site no mesmo VPS do jogo e usar o SQL Server existente.

Isso muda a prioridade da arquitetura: primeiro precisamos entender o banco real do servidor MU e depois adaptar o portal ao schema existente.

## Achados do AdminCP atual

O painel atual e PG MuCMS, originalmente DmN MuCMS. Ele ja conversa com o banco do jogo e possui mapeamentos uteis para orientar nossa integracao:

| Recurso | Banco/tabela/coluna observada |
| --- | --- |
| Reset | `Character.ResetCount` |
| Master Reset | `Character.MasterResetCount` |
| WCoin | `CashShopData.WCoinC` |
| Goblin Point | `CashShopData.GoblinPoint` |
| Master Level | `MasterSkillTree.MasterLevel` |
| Blood Castle ranking | `RankingBloodCastle.Score` |
| Devil Square ranking | `RankingDevilSquare.Score` |
| Chaos Castle ranking | `RankingChaosCastle.Score` |
| Castle Siege ranking | `RankingCastleSiege.Score` |

O AdminCP tambem mostra suporte a webshop, warehouse editor, ancient sets, harmony options e socket options. Isso indica que o banco provavelmente ja contem informacoes suficientes para leitura de conta/personagem/ranking, mas escrita em itens/moedas deve ser tratada com muito cuidado.

## Regra arquitetural

O site pode se comunicar com o SQL Server somente pelo lado servidor:

```text
Browser -> HTTPS -> Nuxt/API no VPS -> SQL Server local/privado
```

Nao colocar credenciais SQL no frontend, em JSON publico, em bundle Nuxt, nem em arquivos versionados.

## Situacao atual do nosso codigo

- `apps/web`: Nuxt 4.
- `apps/api`: NestJS.
- `apps/api/prisma/schema.prisma`: ainda usa `provider = "postgresql"`.
- A API atual modela um banco de portal proprio, nao diretamente o schema MU.
- O deploy Docker atual com PostgreSQL deve ser tratado como legado/ambiente alternativo ate concluirmos a migracao.

## Caminho tecnico recomendado

### 1. Criar camada de adaptadores SQL Server

Adicionar um modulo especifico para o banco do jogo, por exemplo:

```text
apps/api/src/modules/game-database
```

Esse modulo deve ler `MU_DATABASE_URL` e expor metodos de leitura:

- buscar conta;
- listar personagens;
- listar rankings;
- buscar saldo WCoin/GoblinPoint;
- ler status online;
- futuramente ler inventario/warehouse.

### 2. Manter a API interna

Mesmo no mesmo VPS, manter a API server-side evita expor SQL Server para o navegador e permite:

- validar permissoes;
- auditar acoes;
- limitar taxa;
- esconder credenciais;
- isolar escrita sensivel.

### 3. Decidir onde ficam dados editoriais

Temos duas opcoes:

- manter wiki/equipamentos como arquivos estaticos inicialmente;
- criar tabelas proprias no SQL Server para dados editoriais.

Para reduzir risco, a primeira publicacao pode usar arquivos estaticos e SQL Server apenas para dados vivos do jogo.

### 4. Migrar escrita por etapas

Operacoes como creditos, shop, marketplace, bau e inventario exigem:

- backup antes;
- transacao SQL;
- lock/idempotencia;
- logs;
- permissao administrativa;
- teste com conta falsa.

## O que nao fazer

- Nao abrir porta 1433 do SQL Server para a internet.
- Nao conectar o frontend diretamente ao SQL Server.
- Nao remover o PG MuCMS antes de termos backup e rota de rollback.
- Nao substituir `/admincp` sem confirmar que todas as funcoes criticas foram cobertas.
- Nao ativar marketplace com transferencia real de item antes de validar o formato do inventario/warehouse.

## Proxima auditoria quando houver acesso ao VPS

1. Confirmar sistema operacional.
2. Identificar web server e raiz do PG MuCMS.
3. Identificar versao SQL Server e bancos.
4. Listar tabelas principais sem alterar dados.
5. Exportar schema das tabelas usadas pelo AdminCP.
6. Verificar backups.
7. Verificar firewall.
8. Confirmar se Node.js pode rodar no mesmo VPS.
9. Definir se o deploy sera com Node direto, PM2, IIS reverse proxy, OpenLiteSpeed proxy ou Docker.
