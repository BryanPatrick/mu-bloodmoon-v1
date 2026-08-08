# Media

Pipeline central de arquivos publicados pela Community.

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

Os binarios ficam fora do banco, em `COMMUNITY_MEDIA_DIR` ou
`storage/community-media`. A API publica somente o caminho controlado
`/api/media/community/*`.
