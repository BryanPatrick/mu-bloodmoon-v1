# BloodMoon Launcher

Launcher Windows do cliente MU BloodMoon. A aplicacao aplica as configuracoes,
sincroniza noticias e conta pela API, atualiza o cliente e inicia `main.exe`.

## Estrutura

- `Assets/`: arte visual empacotada no executavel.
- `Models/`: contratos de configuracao, API, manifesto e progresso.
- `Services/`: atualizacao, rollback, self-update, links, conta e execucao.
- `MainWindow.*`: composicao visual e orquestracao da interface.

O cliente completo nao pertence ao repositorio. O launcher publicado deve ficar
na raiz do cliente, ao lado de `main.exe`.

## Desenvolvimento

```powershell
npm run launcher:build
npm run launcher:preview
npm run launcher:publish
```

O pacote publicado inclui `BloodMoonLauncher.exe`,
`BloodMoonLauncherUpdater.exe` e `launcher.settings.json`. Ambos os executaveis
sao self-contained e nao exigem .NET instalado no computador do jogador.

Pacote público atual:
`https://update.mubloodmoon.com.br/launcher/BloodMoonLauncher-v1.1.0.zip`.

## Atualizacao automatica

Ao abrir, o launcher:

1. bloqueia o botao Jogar;
2. baixa o manifesto por HTTPS;
3. valida a assinatura RSA e o hash do conteudo;
4. verifica cada arquivo gerenciado por SHA-256;
5. baixa arquivos invalidos para staging;
6. confirma novamente o SHA-256;
7. substitui os arquivos e guarda os anteriores em `.bloodmoon/transactions`;
8. aplica remocoes de forma recuperavel;
9. libera Jogar somente depois da verificacao completa.

Se o manifesto anunciar uma versao nova do launcher, o
`BloodMoonLauncherUpdater.exe` faz a troca depois que o processo principal
encerra e abre o launcher atualizado.

## Manifesto assinado

```json
{
  "schemaVersion": 2,
  "channel": "production",
  "version": "1.0.1",
  "publishedAt": "2026-07-28T12:00:00Z",
  "baseUrl": "https://update.mubloodmoon.com.br/launcher/files/",
  "files": [
    {
      "path": "Data/Local/item.bmd",
      "sha256": "SHA256_HEXADECIMAL_DE_64_CARACTERES",
      "size": 123456
    }
  ],
  "delete": ["Data/arquivo-obsoleto.bmd"],
  "launcher": {
    "version": "1.1.0",
    "url": "https://update.mubloodmoon.com.br/launcher/BloodMoonLauncher-1.1.0.exe",
    "sha256": "SHA256_HEXADECIMAL_DE_64_CARACTERES",
    "size": 123456
  },
  "contentSha256": "HASH_DO_CONTEUDO_CANONICO",
  "signature": "ASSINATURA_RSA_EM_BASE64"
}
```

## Preparar um patch

A chave privada fica somente em `work/launcher/signing` e esta ignorada pelo
Git. Nunca copie essa chave para o site, API, cliente ou painel administrativo.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File scripts/Publish-BloodMoonPatch.ps1 `
  -ClientDirectory 'C:\caminho\cliente-validado' `
  -Version '1.0.1' `
  -Channel test `
  -PreviousManifest 'work\patch-repository\test\manifest.json' `
  -LauncherExecutable 'work\launcher\publish\BloodMoonLauncher.exe' `
  -LauncherVersion '1.0.1'
```

O resultado fica em `work/patch-repository/<canal>`. Publique primeiro
`files/` e o executavel do launcher. O `manifest.next.json` deve ser renomeado
para `manifest.json` por ultimo; essa troca atomica ativa a versao.

Depois de validar o canal `test`, repita com `-Channel production`. O cliente
comum nunca recebe a URL de teste.

## Operacao no painel

As configuracoes publicas da categoria `launcher` ficam em
`Painel > Conteudo CMS > Configuracoes`. Alteracoes geram `AuditEvent`.
Atualize em conjunto:

- `launcher-client-version`;
- `launcher-last-patch`;
- `launcher-manifest-url`;
- `launcher-patch-notes`;
- status e manutencao do servidor.

Regras de seguranca:

- somente HTTPS;
- assinatura RSA antes de confiar no manifesto;
- cada arquivo e verificado por SHA-256;
- caminhos absolutos e travessia por `..` sao rejeitados;
- downloads sao preparados antes de substituir arquivos;
- arquivos substituidos e removidos ficam disponiveis para rollback;
- a chave privada nao entra no banco nem no painel.
