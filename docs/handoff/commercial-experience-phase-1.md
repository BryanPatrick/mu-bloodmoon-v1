# Experiencia comercial publica - Fase 1

## Decisao arquitetural

`/marketplace` e a rota publica canonica para compras. A interface oferece dois contextos claramente identificados:

- **Jogadores** usa os endpoints de `marketplace`, com vendedor, anuncio, escrow e compra protegida entre contas.
- **Loja WCoin** usa os endpoints de `shop`, mostra somente produtos oficiais ativos e encaminha para o detalhe oficial em `/loja/:slug`.

Os motores comerciais, modelos de banco, pedidos, entregas, saldos e paineis administrativos permanecem separados. A unificacao existe somente na navegacao e apresentacao publica.

## Compatibilidade de URLs

- `/marketplace`: mercado de jogadores por padrao.
- `/marketplace?mercado=oficial`: Loja Oficial dentro da experiencia canonica.
- `/loja`: redirecionamento HTTP 301 para `/marketplace?mercado=oficial`.
- `/loja/:slug`: preservada para detalhe e compra de produto oficial.

## Funcional nesta fase

- alternancia desktop e mobile entre as duas origens;
- busca compartilhada aplicada ao contexto ativo;
- filtros reais por categoria e moeda;
- ordenacao e paginacao por contexto;
- cards distintos com `Loja Oficial` ou dados do vendedor;
- drawer de filtros em telas menores;
- compra e denuncia P2P preservadas;
- detalhe e compra da Loja Oficial preservados;
- paineis administrativos sem alteracao.

## Preparado, mas nao simulado

- busca simultanea nas duas origens: a busca atual respeita o contexto selecionado. O componente e o estado centralizados permitem evoluir para resultados combinados quando houver contrato de API dedicado.
- filtros avancados compartilhados: somente filtros suportados pelos contratos atuais foram publicados.

## Limites de escopo respeitados

Nao foram alterados preco, escrow, entrega, saldo, Mercado Pago, `PaymentProvider`, `RechargeIntent` nem as regras administrativas da Loja ou do Marketplace.

## Validacao

- ESLint dos arquivos alterados: aprovado.
- Lint global: zero erros; permanecem avisos preexistentes fora deste escopo.
- API check: aprovado.
- Web build: aprovado.
- Smoke tests: 15 testes aprovados.
- QA de navegacao: back/forward restaura `Jogadores` e `Loja WCoin` pela URL; a troca de mercado remove parametros incompativeis.
- QA de URLs: `/marketplace`, `/marketplace?mercado=oficial`, o redirect de `/loja` e o detalhe real `/loja/extra-reset` foram aprovados. O detalhe foi validado no ambiente integrado porque a API publica rejeita requisicoes CORS originadas do localhost.
- QA visual: desktop e mobile de 390 px aprovados para alternancia, filtros e drawer; o drawer mobile fecha depois da aplicacao do filtro.
- Typecheck Nuxt: o projeto ainda nao possui configuracao propria e, ao executar uma verificacao temporaria, foram encontrados erros sintaticos preexistentes nos arquivos abaixo. Nenhum erro apontou para os arquivos desta fase; a correcao global deve ser tratada como debito tecnico separado.

### Debito preexistente de typecheck

- `apps/web/components/community/CommunityPagination.vue`
- `apps/web/components/community/CommunityToolbar.vue`
- `apps/web/components/marketplace/ActionButton.vue`
- `apps/web/components/marketplace/EmptyState.vue`
- `apps/web/components/marketplace/ListToolbar.vue`
- `apps/web/components/marketplace/Metric.vue`
- `apps/web/components/marketplace/NumberField.vue`
- `apps/web/pages/painel/admin/personagens.vue`
- `apps/web/pages/painel/admin/tickets.vue`
- `apps/web/pages/painel/compras.vue`
- `apps/web/pages/painel/notificacoes.vue`
- `apps/web/pages/painel/suporte.vue`
