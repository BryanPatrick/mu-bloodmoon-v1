// Pure state-decision logic for the Community home left rail (avatar, main
// character, guild, achievements, shortcuts). Extracted out of
// pages/comunidade/index.vue specifically so it's unit-testable without a
// Nuxt/Vue mounting environment -- see test/community-left-rail-view.test.mjs.
//
// This function exists to close one bug for good: the left rail must never
// render the guest sign-in CTA just because auth hasn't resolved yet
// (cookie/localStorage not read), and it must never render blank/empty
// while an authenticated user's profile is in flight. Three explicit auth
// states in, five view states out -- see AuthStatus/CommunityLeftRailView.

export type AuthStatus = 'loading' | 'authenticated' | 'guest'

export type CommunityLeftRailView =
  | 'hidden' // not the home section -- rail/banner don't apply here at all
  | 'skeleton' // auth still loading, OR authenticated with profile in flight
  | 'rail' // authenticated, profile loaded -- render CommunityUserRail
  | 'load-error' // authenticated, profile fetch settled but came back empty
  | 'guest-banner' // auth resolved, genuinely no session

export type CommunityLeftRailParams = {
  activeSection: string
  authStatus: AuthStatus
  hasProfile: boolean
  profilePending: boolean
}

export function resolveCommunityLeftRailView(params: CommunityLeftRailParams): CommunityLeftRailView {
  if (params.activeSection !== 'home') return 'hidden'
  // Guest is only ever reachable once auth has actually resolved --
  // authStatus can't be 'guest' while still 'loading' by construction (see
  // useAuth's authStatus computed), but the check stays explicit here too
  // so this function's contract doesn't silently rely on that invariant.
  if (params.authStatus === 'guest') return 'guest-banner'
  if (params.hasProfile) return 'rail'
  if (params.authStatus === 'loading' || params.profilePending) return 'skeleton'
  return 'load-error'
}
