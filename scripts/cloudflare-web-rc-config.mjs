const EXPECTED_API_BASE = 'https://api.mubloodmoon.com.br/api'

const requiredValue = (env, name, issues) => {
	const value = String(env[name] ?? '').trim()
	if (!value) issues.push(`${name} must be explicitly set`)
	return value
}

export function validateCloudflareWebRcEnv(env = process.env) {
	const issues = []
	const apiBase = requiredValue(env, 'NUXT_PUBLIC_API_BASE', issues)
	const turnstileSiteKey = requiredValue(env, 'NUXT_PUBLIC_TURNSTILE_SITE_KEY', issues)
	const paymentsEnabled = requiredValue(env, 'NUXT_PUBLIC_REAL_MONEY_PAYMENTS_ENABLED', issues)
	const marketplaceEnabled = requiredValue(env, 'NUXT_PUBLIC_MARKETPLACE_ENABLED', issues)

	if (apiBase && apiBase !== EXPECTED_API_BASE) {
		issues.push(`NUXT_PUBLIC_API_BASE must equal ${EXPECTED_API_BASE}`)
	}
	if (paymentsEnabled && paymentsEnabled !== 'false') {
		issues.push('NUXT_PUBLIC_REAL_MONEY_PAYMENTS_ENABLED must equal false for this release candidate')
	}
	if (marketplaceEnabled && marketplaceEnabled !== 'false') {
		issues.push('NUXT_PUBLIC_MARKETPLACE_ENABLED must equal false for this release candidate')
	}

	if (issues.length) {
		throw new Error(`Cloudflare Web RC configuration rejected:\n- ${issues.join('\n- ')}`)
	}

	return {
		apiBase,
		turnstileSiteKey,
		paymentsEnabled: false,
		marketplaceEnabled: false
	}
}

export { EXPECTED_API_BASE }
