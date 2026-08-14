import assert from 'node:assert/strict'
import { test } from 'node:test'

// This imports the compiled-at-test-time TS source directly via Node's
// native TypeScript stripping (Node 22+, matches the other .mjs tests in
// this suite which also run straight against source, no build step).
import { resolveCommunityLeftRailView } from '../features/community/left-rail-view.ts'

const base = { activeSection: 'home', authStatus: 'loading', hasProfile: false, profilePending: false }

test('auth loading never renders the guest CTA', () => {
  const view = resolveCommunityLeftRailView({ ...base, authStatus: 'loading' })
  assert.notEqual(view, 'guest-banner')
  assert.equal(view, 'skeleton')
})

test('authenticated with a loaded profile renders the rail', () => {
  const view = resolveCommunityLeftRailView({ ...base, authStatus: 'authenticated', hasProfile: true })
  assert.equal(view, 'rail')
})

test('guest (auth resolved, no session) renders the guest CTA', () => {
  const view = resolveCommunityLeftRailView({ ...base, authStatus: 'guest' })
  assert.equal(view, 'guest-banner')
})

test('transition: loading -> authenticated (profile still in flight) mounts a skeleton, then the rail once the profile arrives', () => {
  // Simulates the actual sequence on a real refresh: loadSession() resolves
  // synchronously (loading -> authenticated), but the own-profile fetch is
  // still an in-flight network request for a moment.
  const loading = resolveCommunityLeftRailView({ ...base, authStatus: 'loading' })
  assert.equal(loading, 'skeleton')

  const authenticatedPending = resolveCommunityLeftRailView({
    ...base,
    authStatus: 'authenticated',
    hasProfile: false,
    profilePending: true
  })
  assert.equal(authenticatedPending, 'skeleton')
  assert.notEqual(authenticatedPending, 'guest-banner')

  const authenticatedLoaded = resolveCommunityLeftRailView({
    ...base,
    authStatus: 'authenticated',
    hasProfile: true,
    profilePending: false
  })
  assert.equal(authenticatedLoaded, 'rail')
})

test('transition: authenticated -> guest (logout) removes the rail and shows the guest CTA, not a blank column', () => {
  const authenticated = resolveCommunityLeftRailView({ ...base, authStatus: 'authenticated', hasProfile: true })
  assert.equal(authenticated, 'rail')

  const afterLogout = resolveCommunityLeftRailView({ ...base, authStatus: 'guest', hasProfile: false })
  assert.equal(afterLogout, 'guest-banner')
})

test('authenticated with a settled-but-empty profile fetch shows a retry state, not an infinite skeleton or the guest CTA', () => {
  const view = resolveCommunityLeftRailView({
    ...base,
    authStatus: 'authenticated',
    hasProfile: false,
    profilePending: false
  })
  assert.equal(view, 'load-error')
})

test('outside the home section, the rail/banner never render, regardless of auth state', () => {
  for (const authStatus of ['loading', 'authenticated', 'guest']) {
    const view = resolveCommunityLeftRailView({ ...base, activeSection: 'explorar', authStatus, hasProfile: true })
    assert.equal(view, 'hidden')
  }
})
