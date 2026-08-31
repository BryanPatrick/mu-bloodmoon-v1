# Launcher Phase 2A — contrato CMS e recuperação

## Resultado e causa do incidente

Os dois `500` de produção têm a mesma origem: `_prisma_migrations` registra
`20260825190000_launcher_cms_studio` como aplicada, mas o backup de produção de
27/08/2026 não contém as cinco tabelas criadas por ela nem os novos campos de
`KnowledgeEntry`. Assim, `bootstrap()` falha quando o Prisma seleciona o modelo
completo de `KnowledgeEntry`; `resolvedContent()` falha ao consultar
`LauncherSlotContent`. DTO e serialização não chegam a ser a causa.

A correção local é a migration aditiva e idempotente
`20260830120000_launcher_cms_contract_repair`. Ela cria somente colunas, índice
e tabelas ausentes, com os nomes Prisma exatos. Foi validada sobre uma baseline
completa e sobre o estado inconsistente (migration antiga no ledger, DDL
ausente), inclusive duas execuções consecutivas. Não apaga ou reinterpreta
dados existentes. Em rollback da aplicação, os objetos aditivos podem ficar no
banco sem quebrar a versão anterior; removê-los apagaria histórico e não é o
rollback recomendado.

## Endpoints públicos

| Método e path | Auth | Request | Responsabilidade e resposta | Versão/cache | Erros |
|---|---|---|---|---|---|
| `GET /api/launcher/bootstrap` | pública | sem body | Metadados gerais: `schemaVersion`, `contentVersion`, `generatedAt`, `server`, `links`, `patchNotes`, `featured`, `news`, `campaign`, `socials`, `utilities`, `assets` | SHA-256 abreviado, determinístico sobre chave/id e `updatedAt` de `SiteSetting` público e `KnowledgeEntry` NEWS/EVENT publicado. Cache próprio do bootstrap. | Estado vazio é `200`; falha genuína de banco é `5xx` sanitizado. |
| `GET /api/launcher/content?page={PAGE}` | pública | query opcional da página allowlisted | Registro fixo resolvido: `schemaVersion`, versão de publicação, data, `slots[]` e manifesto dos assets realmente referenciados | Inteiro monotônico de `LauncherContentPublish`; rascunho não altera versão. Cache próprio de slots. | Página desconhecida: `400`; CMS vazio: `200` com defaults/UNSET; banco indisponível: `5xx` sanitizado e launcher usa cache. |
| `GET /api/launcher/events` | pública | sem body | Eventos editoriais publicados usados pela página Eventos | sem contrato de cache novo nesta fase | falha genuína: `5xx` |
| `GET /api/launcher/rankings?type=` | pública | tipo opcional | ranking usado pela página Ranking | sem contrato de cache novo nesta fase | validação/service conforme implementação atual |
| `GET /api/launcher/account`, `/me`, `/me/characters` | JWT | bearer token | dados de conta; fora do CMS editorial | não usa contentVersion | `401/403/404/5xx` tipados |
| `GET /api/launcher/store/terms/active` | pública | sem body | termos ativos ou `null` | versão própria de termos | ausência normal é `200/null` |

Rotas administrativas existentes sob `/api/admin/launcher-studio` reutilizadas:
`pages`, `registry`, `draft`, `slots/:slotId`, `publish`, `rollback`,
`publish-history`, `assets`, `assets/upload`, arquivamento de asset, `terms` e
`preview/fixtures`. Todas exigem JWT, role ADMIN/SUPER_ADMIN e a permissão
específica. Nenhum draft é devolvido por uma rota pública.

## Mapeamento real do payload

| API | Modelo WPF | Consumidor | Situação |
|---|---|---|---|
| `schemaVersion` | ambos os payloads | serviços de cache | REQUIRED; versão desconhecida usa cache/fallback |
| `contentVersion` | `string` no bootstrap; `int` no content | compare-before-write e indicador do shell | REQUIRED, domínios independentes |
| `generatedAt` | `DateTimeOffset` | diagnóstico/cache | usado como metadado |
| `server.*` | `LauncherServer` | shell/status | usado; status não é tratado como telemetria LIVE quando source é UNKNOWN |
| `links.*`, `socials[]`, `utilities[]` | tipos homônimos | shell/rail | usados, com limites fixos |
| `patchNotes`, `featured`, `news[]`, `campaign` | tipos editoriais | Home/News | usados; legado do bootstrap, ainda ativo |
| `bootstrap.assets[]` | `LauncherAssetManifestEntry` | cache de imagens de notícia/evento/social | usado |
| `content.slots[].id/page/value/tokens/status/assetState` | `ResolvedSlot` + `SlotRegistryMapper` | shell e páginas | usado; `status` é diagnóstico; `assetState` aplica-se somente a IMAGE |
| `content.assets[].id/url/contentType/hash/size/width/height` | manifesto | `SlotImageResolver`/`AssetCacheService` | usado; URL HTTPS, SHA-256, tamanho, tipo e dimensões são validados |
| campos JSON desconhecidos | ignorados pelo `System.Text.Json` | nenhum | compatibilidade futura |
| slot desconhecido | nunca consultado pelas views | nenhum | ignorado com segurança |

Não há campo de layout, posição, CSS, XAML ou código no contrato.

## Registro autoritativo de imagens CMS

`slot-registry.ts` é a fonte autoritativa dos seis slots sobrescrevíveis; o
catálogo WPF continua sendo a fonte dos 14 defaults empacotados e dos 16
contratos visuais auditados na Phase 1.5.

| Slot | Página | Tipo | Override | Default | Proporção | Render | NONE | Cache | Obrigatório |
|---|---|---|---|---|---|---|---|---|---|
| `home.brandLogo` | HOME | editorial | sim | nenhum | 1:1 | Uniform | collapse | LKG só em REMOTE | não |
| `home.hero.image` | HOME | editorial | sim | `home-hero.png` | 16:9 | UniformToFill | empty | LKG só em REMOTE | não |
| `home.campaign.image` | HOME | editorial | sim | `editorial-environment.png` | 21:9 | UniformToFill | empty | LKG só em REMOTE | não |
| `account.guildEmblem` | ACCOUNT | editorial | sim | nenhum | 1:1 | Uniform | neutral controlado | LKG só em REMOTE | não |
| `events.activeBanner` | EVENTS | editorial | sim | `editorial-environment.png` | 21:9 | UniformToFill | empty | LKG só em REMOTE | não |
| `store.featuredBannerImage` | STORE | editorial | sim | `editorial-environment.png` | 21:9 | UniformToFill | empty | LKG só em REMOTE | não |

Os outros dez contratos visuais permanecem estruturais/locais e não foram
silenciosamente adicionados ao CMS. `home.brandLogo` continua sendo mero acento
opcional ao wordmark textual: sem asset aprovado fica recolhido. Nenhum logo,
lança, tridente ou emblema foi criado.

## Estado fechado da imagem

- `INHERIT_DEFAULT`: valor normalizado para `null`; usa somente o default
  empacotado. Se não houver default, recolhe ou usa o neutral definido pelo
  contrato. Nunca consulta LKG remoto.
- `REMOTE_ASSET`: exige id de `LauncherAsset` existente. A API entrega apenas o
  manifesto correspondente; o launcher exige HTTPS, PNG/JPEG, SHA-256, tamanho
  e imagem decodificável (e confere dimensões quando declaradas). Ordem de
  recuperação: remoto válido → LKG → default → neutral.
- `NONE`: valor normalizado para `null`; não consulta remoto, LKG ou default
  decorativo. Aplica collapse/empty/neutral do slot.

Compatibilidade: JSON IMAGE legado com string não vazia é `REMOTE_ASSET`; valor
ausente/null é `INHERIT_DEFAULT`. Estado novo desconhecido recebido pelo
launcher degrada para `INHERIT_DEFAULT`; estado desconhecido em escrita admin é
`400`. `assetState` em slot não IMAGE também é `400`.

## Versão, cache e remoção de arte antiga

Bootstrap e content possuem versões independentes. O primeiro muda com os
registros gerais efetivamente consultados. O segundo muda somente em publish ou
rollback (que cria nova versão, preservando histórico); alterações de draft não
vazam nem invalidam clientes. Payload com mesma versão não regrava o cache.

Em versão nova, `REMOTE_ASSET` usa `assetId` + hash como identidade; URL sozinha
não é identidade. Assets inalterados permanecem reutilizáveis. Ao publicar
`INHERIT_DEFAULT` ou `NONE`, o payload cacheado passa a carregar essa intenção e
o resolver não lê o arquivo LKG antigo. O arquivo pode permanecer fisicamente
para recuperação histórica, mas não pode reaparecer na UI. Falha de CMS não
apaga um cache de payload válido; sem cache, bootstrap usa conteúdo empacotado e
content usa lista vazia/defaults por slot.

Metadados não secretos envolvidos: slot, assetId, SHA-256, URL HTTPS,
contentType, tamanho, largura/altura, contentVersion e timestamp do envelope.

## Validação e modelo de erro

A API rejeita slot/estado desconhecido em escrita, referência inexistente,
formato não PNG/JPEG, arquivo inválido ou acima de 5 MiB, URL não HTTP(S), token
visual fora da allowlist, listas acima do limite e campos extras em itens. O
launcher rejeita esquema futuro, JSON inválido, HTTP não HTTPS, tipo/tamanho/
hash/dimensão incorretos e imagem indecodificável; duplicatas convergem para o
último registro sem crash, propriedades desconhecidas são ignoradas.

Ausência de conteúdo, asset opcional ou registro legado é estado normal `200`,
não exceção. Somente indisponibilidade/erro real de persistência chega a `5xx`,
sempre pelo filtro sanitizado com requestId.

## Launcher Studio

O inspector de IMAGE agora apresenta em português “Usar padrão do launcher”,
“Usar asset publicado” e “Não exibir”. O picker/upload existente aparece apenas
para o estado remoto. O resumo mostra estado efetivo, id remoto atual e se há
default local. O upload existente foi reutilizado e grava largura/altura; não há
segundo pipeline. Estrutura, dimensões e navegação do preview não mudaram.

## Evidências locais

- API structure/typecheck/build: PASS.
- Migration MySQL 8 baseline + estado inconsistente + idempotência: PASS.
- HTTP real: bootstrap `200`, content `200`, JSON válido; amostra sanitizada:
  `{bootstrap:{contentVersion:"bd769da82480341d",assets:0},content:{schemaVersion:1,contentVersion:5,slots:27,assets:0,homeBrandLogo:"INHERIT_DEFAULT"}}`.
- Produção lida apenas: os dois endpoints continuam `500` até rollout; produção
  não foi alterada.
- Prova visual isolada do inspector: os estados `INHERIT_DEFAULT`,
  `REMOTE_ASSET` e `NONE` foram renderizados e capturados com os respectivos
  resultados efetivos. A página de prova era temporária e foi removida antes do
  commit; as imagens ficaram fora do repositório em `D:/MU/phase2a-evidence/`.
- Prova visual do launcher WPF: `REMOTE_ASSET` renderizou a arte remota
  controlada; a transição para `INHERIT_DEFAULT` renderizou imediatamente o
  default empacotado; a transição para `NONE` deixou o host no neutral previsto,
  sem reutilizar a arte remota/LKG. O cache artificial usado na captura foi
  removido ao final.

## Rollout e gaps conhecidos

Rollout futuro deve: fazer backup, confirmar o commit aprovado, executar
`prisma migrate deploy`, verificar os nomes exatos em MySQL Linux, reiniciar API
e validar ambos os endpoints antes de disponibilizar o launcher. A migration é
obrigatória em produção; este trabalho não a aplicou.

A Phase 2B deve realizar o rollout controlado da migration/API, smoke tests de
produção e uma rodada visual autenticada com assets editoriais explicitamente
aprovados, sem redesenhar o shell. As transições e a remoção de LKG antigo no
launcher estão cobertas pelos testes automatizados e pelas capturas locais; a
rodada em produção fica deliberadamente condicionada ao rollout futuro.
