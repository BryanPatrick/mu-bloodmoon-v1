# Pages

As paginas seguem o roteamento do Nuxt. Evite renomear pastas sem revisar as URLs.

- `index.vue`: home.
- `login.vue`, `registrar.vue`, `recuperar-conta.vue`: acesso e conta publica.
- `painel`: area logada do jogador.
- `painel/admin`: area administrativa.
- `guias`: wiki/guias do servidor.
- `dev`: rotas antigas de desenvolvimento; novas ferramentas devem preferir `painel/admin`.

Quando uma pagina ficar grande demais, mova componentes internos para `components` ou crie composables especificos para regras de tela.
