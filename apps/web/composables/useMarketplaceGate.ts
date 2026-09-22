// Open Beta Plan B (2026-09-18, resumed in Phase 17R 2026-09-21): the player-to-player
// marketplace stays OFF for the initial Beta. This is only the presentation mirror of the
// server-side fail-closed gate (marketplace.service.ts assertMarketplaceEnabled()); the API
// enforces MARKETPLACE_ENABLED independently, so hiding the UI is never the only protection.
// Missing or any value other than the literal string "true" means disabled.
export const useMarketplaceGate = () => {
  const config = useRuntimeConfig()
  const marketplaceEnabled = computed(() => config.public.marketplaceEnabled === true)
  return { marketplaceEnabled }
}
