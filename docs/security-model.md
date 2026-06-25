# Modelo de seguranca

Este documento resume como devemos pensar seguranca no Blood Moon.

## Regra principal

Tudo que roda no navegador deve ser tratado como publico.

Isso inclui:

- paginas;
- componentes;
- composables;
- dados mockados;
- regras visuais;
- qualquer segredo colocado no frontend por engano.

O frontend pode esconder botoes, melhorar experiencia e orientar o usuario, mas nao pode ser a barreira final de seguranca.

## O que fica protegido

Codigo do backend, variaveis de ambiente, chaves privadas, conexoes com banco e regras reais ficam protegidas enquanto estiverem apenas no servidor.

Exemplos:

- hash de senha;
- token secrets;
- credenciais de banco;
- credenciais do servidor MU;
- regras reais de credito de moeda;
- entrega de item;
- logs de auditoria;
- validacao de permissao.

## Se alguem invadir a aplicacao

Depende do tipo de invasao:

- Se a pessoa apenas abrir o navegador/devtools, ela ve o frontend, mas nao deve conseguir ver segredos do backend.
- Se a pessoa explorar uma falha no frontend, ela ainda nao deveria conseguir alterar moedas, contas ou personagens sem passar pela API.
- Se a pessoa invadir o servidor/VPS com acesso a arquivos ou root, ela pode ver codigo, `.env`, banco e tudo que estiver no servidor. Nesse caso, a protecao vira resposta a incidente: backups, rotacao de senhas, logs, isolamento e restauracao.

## Medidas obrigatorias para producao

- Nunca colocar segredo no frontend.
- Usar HTTPS.
- Usar `.env` fora do repositorio.
- Hash de senha com bcrypt/argon2.
- Sessao com cookie seguro ou tokens bem controlados.
- Permissao validada no backend.
- Auditoria salva em banco.
- Rate limit em login, recuperacao e endpoints sensiveis.
- Validacao de entrada com DTO/schema.
- Upload de imagens com validacao de tipo/tamanho.
- Banco do portal separado do banco do jogo.
- Integracao com MU passando por servicos auditados.
- Backups automaticos.

## Encapsulamento recomendado

- `apps/web`: nao contem segredos.
- `apps/api`: contem regras sensiveis e valida tudo.
- `packages/shared`: contem apenas tipos e constantes publicas.
- `.env`: nunca versionar.
- banco do jogo: acessado apenas por `game-integration`.
