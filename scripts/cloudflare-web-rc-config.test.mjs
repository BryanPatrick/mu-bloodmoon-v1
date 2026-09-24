import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EXPECTED_API_BASE, validateCloudflareWebRcEnv } from './cloudflare-web-rc-config.mjs'

const validEnv = () => ({
	NUXT_PUBLIC_API_BASE: EXPECTED_API_BASE,
	NUXT_PUBLIC_TURNSTILE_SITE_KEY: 'public-test-site-key',
	NUXT_PUBLIC_REAL_MONEY_PAYMENTS_ENABLED: 'false',
	NUXT_PUBLIC_MARKETPLACE_ENABLED: 'false'
})

test('accepts the exact release-candidate public configuration', () => {
	assert.deepEqual(validateCloudflareWebRcEnv(validEnv()), {
		apiBase: EXPECTED_API_BASE,
		turnstileSiteKey: 'public-test-site-key',
		paymentsEnabled: false,
		marketplaceEnabled: false
	})
})

test('rejects a missing API base instead of falling back to localhost', () => {
	const env = validEnv()
	delete env.NUXT_PUBLIC_API_BASE
	assert.throws(() => validateCloudflareWebRcEnv(env), /NUXT_PUBLIC_API_BASE must be explicitly set/)
})

test('rejects a localhost API base', () => {
	const env = { ...validEnv(), NUXT_PUBLIC_API_BASE: 'http://localhost:3333/api' }
	assert.throws(() => validateCloudflareWebRcEnv(env), /must equal https:\/\/api\.mubloodmoon\.com\.br\/api/)
})

test('rejects any other API base', () => {
	const env = { ...validEnv(), NUXT_PUBLIC_API_BASE: 'https://example.invalid/api' }
	assert.throws(() => validateCloudflareWebRcEnv(env), /must equal https:\/\/api\.mubloodmoon\.com\.br\/api/)
})

test('rejects a missing Turnstile public site key', () => {
	const env = validEnv()
	delete env.NUXT_PUBLIC_TURNSTILE_SITE_KEY
	assert.throws(() => validateCloudflareWebRcEnv(env), /NUXT_PUBLIC_TURNSTILE_SITE_KEY must be explicitly set/)
})

test('rejects a missing payment feature flag', () => {
	const env = validEnv()
	delete env.NUXT_PUBLIC_REAL_MONEY_PAYMENTS_ENABLED
	assert.throws(() => validateCloudflareWebRcEnv(env), /NUXT_PUBLIC_REAL_MONEY_PAYMENTS_ENABLED must be explicitly set/)
})

test('rejects enabled payments', () => {
	const env = { ...validEnv(), NUXT_PUBLIC_REAL_MONEY_PAYMENTS_ENABLED: 'true' }
	assert.throws(() => validateCloudflareWebRcEnv(env), /must equal false for this release candidate/)
})

test('rejects a missing marketplace feature flag', () => {
	const env = validEnv()
	delete env.NUXT_PUBLIC_MARKETPLACE_ENABLED
	assert.throws(() => validateCloudflareWebRcEnv(env), /NUXT_PUBLIC_MARKETPLACE_ENABLED must be explicitly set/)
})

test('rejects an enabled marketplace', () => {
	const env = { ...validEnv(), NUXT_PUBLIC_MARKETPLACE_ENABLED: 'true' }
	assert.throws(() => validateCloudflareWebRcEnv(env), /must equal false for this release candidate/)
})
