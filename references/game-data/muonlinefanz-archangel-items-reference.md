# MU Online Fanz - Archangel Items

Fonte inicial:

- https://muonlinefanz.com/tools/items/data/itemdb/Divine%20Sword%20of%20Archangel.php
- https://muonlinefanz.com/guide/items/archangel-items/

Status desta coleta: parcial. O terminal local nao conseguiu conectar ao dominio `muonlinefanz.com` nesta passagem, entao a captura numerica confirmada veio da imagem enviada pelo usuario. A estrutura completa ja foi criada em `muonlinefanz-archangel-items-data.json` para preencher as outras armas conforme conseguirmos acessar cada pagina.

## Divine Sword of Archangel

Dados confirmados pelo print:

- Nome: `Divine Sword of Archangel`
- Tipo: arma fisica de uma mao
- Dano em `+0`: `220 ~ 230`
- Attack Speed: `45`
- Strength requerida: `381`
- Agility requerida: `149`
- Classes permitidas: `Dark Knight`, `Magic Gladiator`, `Dark Lord`

## Curva de upgrade por level

Pelo seletor da pagina, cada item level adiciona bonus ao valor minimo e maximo de dano. Para a Sword, isso gera:

| Level | Bonus | Divine Sword dano |
| --- | ---: | --- |
| +0 | 0 | 220 ~ 230 |
| +1 | 3 | 223 ~ 233 |
| +2 | 6 | 226 ~ 236 |
| +3 | 9 | 229 ~ 239 |
| +4 | 13 | 233 ~ 243 |
| +5 | 17 | 237 ~ 247 |
| +6 | 21 | 241 ~ 251 |
| +7 | 26 | 246 ~ 256 |
| +8 | 31 | 251 ~ 261 |
| +9 | 36 | 256 ~ 266 |
| +10 | 42 | 262 ~ 272 |
| +11 | 48 | 268 ~ 278 |
| +12 | 54 | 274 ~ 284 |
| +13 | 61 | 281 ~ 291 |
| +14 | 68 | 288 ~ 298 |
| +15 | 75 | 295 ~ 305 |

Essa curva deve ser usada como referencia tecnica inicial para armas fisicas e magicas, sempre validando por item quando a pagina especifica abrir.

## Armas catalogadas para completar

- Divine Sword of Archangel
- Blessed Divine Sword of Archangel
- Divine Staff of Archangel
- Blessed Divine Staff of Archangel
- Divine Crossbow of Archangel
- Blessed Divine Crossbow of Archangel
- Divine Scepter of Archangel
- Blessed Divine Scepter of Archangel
- Divine Stick of Archangel
- Blessed Divine Stick of Archangel
- Divine Claws of Archangel
- Blessed Divine Claws of Archangel
- Divine Lance of Archangel
- Blessed Divine Lance of Archangel

## Regras visuais

- Armas Archangel usam nome rosado/magenta.
- Armas fisicas devem exibir dano fisico.
- Staff/Stick devem usar campos de dano magico, wizardry ou magic power.
- Additional/Harmony amarelo nao faz parte do dano base.
- Excellent azul nao deve ser misturado com upgrade `+1` ate `+15`.

## Pendencias

- Confirmar todos os valores de base das versoes Blessed.
- Confirmar se Claws e Lance existem exatamente com estes nomes na base da MU Online Fanz.
- Capturar imagens locais quando disponiveis.
- Cruzar cada arma com classe, versao e rota de obtencao.
