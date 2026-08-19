# Media

Pipeline central de arquivos publicados pela Community. Guild tem seu
proprio pipeline separado (`guilds-media.service.ts`), nao alterado por este
modulo -- a abstracao de storage abaixo foi escrita para que Guild possa
reaproveita-la depois, sem redesenho.

## Regras

- endpoint autenticado `POST /api/community/media` com campo multipart `file`;
- limite atual de 8 MB por arquivo;
- formatos aceitos: JPEG, PNG, WebP e GIF;
- SVG e arquivos cujo MIME nao corresponde ao conteudo real sao rejeitados;
- imagens estaticas sao redimensionadas para no maximo 2048 px e convertidas
  para WebP sem metadados;
- GIF permanece animado e fica preparado para conversao futura em WebM/MP4;
- largura ou altura acima de 8000 px e mais de 40 milhoes de pixels sao
  recusadas;
- cada arquivo pertence a uma conta e somente o proprietario pode anexa-lo;
- arquivos removidos permanecem rastreaveis no banco por status.

## Pipeline (quarentena -> validacao -> disponivel)

1. Os bytes crus vao para quarentena e uma linha `CommunityMedia` com
   status `TEMPORARY` e criada -- antes da validacao rodar. Mesmo um upload
   rejeitado deixa uma linha e um arquivo reais para revisao de abuso.
2. `validateAndProcessImage` (`validation/image-validation.ts`, funcao pura,
   sem I/O) confere extensao/mimetype declarado/formato decodificado/
   dimensoes, e reencoda para WebP (GIF permanece GIF, com quadros
   animados).
3. Sucesso: bytes processados vao para o diretorio publicado; a linha vira
   `READY` com sua `url` real; a copia em quarentena e apagada.
4. Rejeicao: a linha vira `REJECTED` com `rejectionReason`; a copia em
   quarentena e mantida (e ela a evidencia).

## Storage

`storage/storage-provider.ts` define a interface `StorageProvider`
(`LocalStorageProvider`, `R2StorageProvider`); `MediaStorageService` escolhe
uma via `MEDIA_STORAGE_PROVIDER` (`local` por padrao, ou `r2`). Local e o
unico provider em uso em qualquer ambiente hoje -- R2 existe e tem testes,
mas nao esta ligado a nenhum ambiente implantado ainda (`PRESIGNED_UPLOAD`
fica para depois).

Tres diretorios, nunca sobrepostos:
- `COMMUNITY_MEDIA_DIR` -- publicado (`express.static` em `main.ts`).
  Caminho inalterado, compativel com toda URL ja existente.
- `MEDIA_QUARANTINE_DIR` -- uploads crus, nunca publicado.
- `MEDIA_REMOVED_DIR` -- arquivos moderados/substituidos, nunca publicado.
  Arquivos sao movidos para ca em vez de apagados, entao um engano de
  moderacao continua recuperavel.

## Ciclo de vida

O `status` de uma linha `CommunityMedia` e a localizacao do seu arquivo se
movem juntos, via `MediaService.releaseMedia`/`restoreMedia`/`releaseByUrl`/
`attachByUrl`:

- Post ocultado/removido (autor ou moderacao) -> midia vira `REMOVED`,
  arquivo sai do diretorio publicado.
- Post restaurado -> midia vira `ATTACHED`, arquivo volta.
- Avatar/capa substituidos -> o arquivo anterior (localizado pela URL; nao
  existe coluna `avatarMediaId`) e liberado da mesma forma. Salvar a mesma
  URL de novo e um no-op, nao libera o arquivo em uso.

## Limpeza de orfaos

`npm run media:cleanup:orphans -- [--apply] [--older-than-hours=24]`
(`MediaOrphanCleanupService`). Varre linhas `TEMPORARY`/`REJECTED` mais
velhas que a janela configurada e apaga a linha e o arquivo em quarentena.
Dry run por padrao. Nao e um cron de producao -- rodar manualmente.

## R2

`MEDIA_STORAGE_PROVIDER=r2` exige `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` (ver
`apps/api/.env.example`). Nunca logado, nunca commitado. Faltando qualquer
um deles, falha rapido na construcao do provider, nao silenciosamente.
