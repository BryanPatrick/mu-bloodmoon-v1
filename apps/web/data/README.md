# Data

Dados locais e mocks usados pelo frontend.

- `security.ts`: permissoes, roles e regras de acesso.
- `management.ts`: dados mockados de contas, personagens, loja e recarga.
- `devReferenceAssets.ts`: referencias visuais e tecnicas.
- `externalMuReferences.ts`: dados coletados de fontes externas.
- `equipmentOptionRules.ts`: regras reutilizaveis de qualidade/opcoes de equipamentos, como Normal, Excellent, Ancient, Socket, Mastery Ancient, Lucky, Harmony e Guardian.
- `guiamuReferences.ts`: mapa de coleta do Guia MU Online para drops, skills, mapas, spots, eventos, quests, NPCs, tutoriais e itens.
- `jewelReferenceRules.ts`: base de joias, aplicacao visual e fontes para Bless, Soul, Life, Harmony, Guardian e Seed Sphere.
- `implementationRoadmap.ts`: pendencias e mapa de implementacao.
- `site.ts`: conteudo publico do site.

Regra importante: dado sensivel real nao deve ficar aqui. Tudo nesta pasta vai para o bundle do frontend ou pode ser inspecionado pelo usuario.

Imagens externas com marca dagua ou origem de terceiros devem ser guardadas apenas como referencia interna com fonte. Para publicar no Blood Moon, criar/remasterizar assets proprios e revisar coerencia com o jogo antes de exibir no site publico.
