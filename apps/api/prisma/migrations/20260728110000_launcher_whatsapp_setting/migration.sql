INSERT IGNORE INTO `SiteSetting`
  (`id`, `key`, `category`, `label`, `description`, `value`, `isPublic`, `status`, `createdAt`, `updatedAt`)
VALUES
  (
    UUID(),
    'launcher-whatsapp-url',
    'launcher',
    'WhatsApp',
    'Link oficial de atendimento exibido no launcher.',
    JSON_QUOTE('https://wa.me/'),
    true,
    'PUBLISHED',
    NOW(),
    NOW()
  );
