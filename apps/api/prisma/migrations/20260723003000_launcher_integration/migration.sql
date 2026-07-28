INSERT IGNORE INTO `SiteSetting`
  (`id`, `key`, `category`, `label`, `description`, `value`, `isPublic`, `status`, `createdAt`, `updatedAt`)
VALUES
  (UUID(), 'launcher-server-name', 'launcher', 'Nome do servidor', 'Nome exibido no launcher.', JSON_QUOTE('BloodMoon'), true, 'PUBLISHED', NOW(), NOW()),
  (UUID(), 'launcher-realm-name', 'launcher', 'Nome do reino', 'Reino exibido no resumo do servidor.', JSON_QUOTE('BloodMoon'), true, 'PUBLISHED', NOW(), NOW()),
  (UUID(), 'launcher-server-status', 'launcher', 'Status do servidor', 'ONLINE, OFFLINE ou MAINTENANCE.', JSON_QUOTE('ONLINE'), true, 'PUBLISHED', NOW(), NOW()),
  (UUID(), 'launcher-online-players', 'launcher', 'Jogadores online', 'Valor publicado pelo integrador do servidor.', 0, true, 'PUBLISHED', NOW(), NOW()),
  (UUID(), 'launcher-maintenance', 'launcher', 'Manutenção', 'Estado e mensagem de manutenção.', JSON_OBJECT('active', false, 'message', 'Nenhuma manutenção programada.'), true, 'PUBLISHED', NOW(), NOW()),
  (UUID(), 'launcher-client-version', 'launcher', 'Versão do cliente', 'Versão atual esperada pelo launcher.', JSON_QUOTE('1.0.0'), true, 'PUBLISHED', NOW(), NOW()),
  (UUID(), 'launcher-last-patch', 'launcher', 'Último patch', 'Data ou rótulo do último patch.', JSON_QUOTE(''), true, 'PUBLISHED', NOW(), NOW()),
  (UUID(), 'launcher-manifest-url', 'launcher', 'Manifesto de atualização', 'URL HTTPS do manifesto assinado por hash.', JSON_QUOTE('https://update.mubloodmoon.com.br/launcher/manifest.json'), true, 'PUBLISHED', NOW(), NOW()),
  (UUID(), 'launcher-patch-notes', 'launcher', 'Notas do patch', 'Lista curta exibida no launcher.', JSON_ARRAY(), true, 'PUBLISHED', NOW(), NOW()),
  (UUID(), 'launcher-website-url', 'launcher', 'Site', NULL, JSON_QUOTE('https://mubloodmoon.com.br'), true, 'PUBLISHED', NOW(), NOW()),
  (UUID(), 'launcher-news-url', 'launcher', 'Notícias', NULL, JSON_QUOTE('https://mubloodmoon.com.br/noticias'), true, 'PUBLISHED', NOW(), NOW()),
  (UUID(), 'launcher-discord-url', 'launcher', 'Discord', NULL, JSON_QUOTE('https://discord.gg/'), true, 'PUBLISHED', NOW(), NOW()),
  (UUID(), 'launcher-instagram-url', 'launcher', 'Instagram', NULL, JSON_QUOTE('https://instagram.com/'), true, 'PUBLISHED', NOW(), NOW()),
  (UUID(), 'launcher-youtube-url', 'launcher', 'YouTube', NULL, JSON_QUOTE('https://youtube.com/'), true, 'PUBLISHED', NOW(), NOW()),
  (UUID(), 'launcher-x-url', 'launcher', 'X', NULL, JSON_QUOTE('https://x.com/'), true, 'PUBLISHED', NOW(), NOW());
