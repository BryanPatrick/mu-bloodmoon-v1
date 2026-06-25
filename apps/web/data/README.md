# Data

Dados locais e mocks usados pelo frontend.

- `security.ts`: permissoes, roles e regras de acesso.
- `management.ts`: dados mockados de contas, personagens, loja e recarga.
- `devReferenceAssets.ts`: referencias visuais e tecnicas.
- `externalMuReferences.ts`: dados coletados de fontes externas.
- `implementationRoadmap.ts`: pendencias e mapa de implementacao.
- `site.ts`: conteudo publico do site.

Regra importante: dado sensivel real nao deve ficar aqui. Tudo nesta pasta vai para o bundle do frontend ou pode ser inspecionado pelo usuario.
