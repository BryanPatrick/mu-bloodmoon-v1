# Design system Blood Moon

Este documento registra o padrao visual que vamos seguir daqui para frente.

## Direcao visual

Padrao: liquid glass / glassmorphism.

Caracteristicas:

- superficies translucidas;
- blur forte;
- bordas claras;
- reflexo interno;
- sombras suaves e profundas;
- botoes arredondados;
- cards com profundidade;
- componentes com aparencia premium, sem perder leitura.

## Classes principais

- `bm-liquid-shell`: container principal grande, usado em dashboards, painels e areas de destaque.
- `bm-liquid-card`: cards internos, metricas, blocos e formularios.
- `bm-liquid-field`: inputs, selects e textareas.
- `bm-liquid-primary`: botao principal com gradiente liquid glass.
- `bm-panel`: painel glass antigo, ainda aceito durante transicao.
- `bm-glass`: dropdowns, header e containers flutuantes.
- `bm-button-glass`: botao secundario glass.

## Nuxt UI

O projeto esta preparado para `@nuxt/ui`, mas o pacote ainda depende de instalacao pelo npm.

Quando o pacote estiver instalado, novos componentes devem preferir:

- `UButton` para botoes;
- `UInput` para campos de texto;
- `USelect` ou `USelectMenu` para seletores;
- `UCard` para cards;
- `UModal` para modais;
- `UDropdownMenu` para menus;
- `UTable` para tabelas;
- `UTabs` para abas;
- `UApp` no app root.

Mesmo usando Nuxt UI, a aparencia deve ser customizada para seguir as classes/tokens Blood Moon.

## Regra de migracao

Nao converter tudo de uma vez sem revisar a tela.

Ordem recomendada:

1. componentes globais;
2. login/cadastro/recuperacao;
3. dashboard e painel;
4. formularios administrativos;
5. tabelas/listagens;
6. guias e paginas publicas;
7. loja/recarga.

## Cuidados

- nao criar cards dentro de cards sem necessidade;
- manter textos legiveis em fundo translucido;
- em telas administrativas, priorizar espaco e leitura;
- em mobile, reduzir efeitos se prejudicarem desempenho;
- todo componente novo reutilizavel deve ganhar lugar claro em `apps/web/components`.
