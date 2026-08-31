export const launcherContentFixtures = {
  empty: { schemaVersion: 1, contentVersion: 0, generatedAt: '2026-08-30T00:00:00.000Z', slots: [], assets: [] },
  legacyRemote: { id: 'home.hero.image', page: 'HOME', value: 'asset-legacy', tokens: {}, status: 'PUBLISHED' },
  legacyNull: { id: 'home.hero.image', page: 'HOME', value: null, tokens: {}, status: 'PUBLISHED' },
  inherited: { id: 'home.hero.image', page: 'HOME', value: null, tokens: {}, status: 'PUBLISHED', assetState: 'INHERIT_DEFAULT' },
  remote: { id: 'home.hero.image', page: 'HOME', value: 'asset-current', tokens: {}, status: 'PUBLISHED', assetState: 'REMOTE_ASSET' },
  none: { id: 'home.hero.image', page: 'HOME', value: null, tokens: {}, status: 'PUBLISHED', assetState: 'NONE' },
  mixedStates: {
    schemaVersion: 1, contentVersion: 7, generatedAt: '2026-08-30T00:00:00.000Z',
    slots: [
      { id: 'home.hero.image', page: 'HOME', value: 'asset-current', tokens: {}, status: 'PUBLISHED', assetState: 'REMOTE_ASSET' },
      { id: 'home.campaign.image', page: 'HOME', value: null, tokens: {}, status: 'PUBLISHED', assetState: 'INHERIT_DEFAULT' },
      { id: 'home.brandLogo', page: 'HOME', value: null, tokens: {}, status: 'PUBLISHED', assetState: 'NONE' }
    ],
    assets: [{ id: 'asset-current', url: 'https://cdn.example.test/hero.png', contentType: 'image/png', hash: 'a'.repeat(64), size: 1024, width: 1280, height: 720 }]
  },
  invalidAsset: { id: 'home.hero.image', page: 'HOME', value: 'missing-asset', tokens: {}, status: 'PUBLISHED', assetState: 'REMOTE_ASSET' },
  unknownSlot: { id: 'future.unknown.image', page: 'HOME', value: null, tokens: {}, status: 'PUBLISHED', assetState: 'NONE' },
  contentVersionChange: { before: 7, after: 8 },
  unknownState: { id: 'home.hero.image', page: 'HOME', value: null, tokens: {}, status: 'PUBLISHED', assetState: 'UNKNOWN' },
  malformed: { schemaVersion: 1, contentVersion: 8, generatedAt: 'invalid', slots: [{ id: 'home.hero.image' }], assets: [] },
  serverError: { statusCode: 500, message: 'Internal server error', requestId: 'sanitized-fixture' }
} as const
