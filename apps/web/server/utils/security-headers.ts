// Shared between server/middleware/00.security-headers.ts (sets a baseline CSP on every response) and
// server/plugins/csp-inline-script-hashes.ts (adds the exact hashes of Nuxt's own inline scripts, which
// only exist on a real HTML render). Kept in server/utils/ so Nitro auto-imports it into both -- one
// directive list, never two copies to keep in sync.
export function originOf(url: string, fallback: string): string {
	try {
		return new URL(url).origin
	} catch {
		return fallback
	}
}

export function buildCsp(apiOrigin: string, extraScriptSources: string[] = []): string {
	const directives: Record<string, string[]> = {
		'default-src': ["'self'"],
		'script-src': ["'self'", 'https://challenges.cloudflare.com', ...extraScriptSources],
		'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
		'font-src': ["'self'", 'https://fonts.gstatic.com'],
		// R2 shadow origin added Phase CF-R2-02 -- tested first without CSP
		// changes (confirmed blocked), then with exactly this one origin
		// (confirmed loads, zero other console errors) in CF-R2-01's local
		// wrangler-dev test before being applied here. Single origin, no
		// wildcard. Shadow-only: this Worker has no production hostname/
		// custom domain, so this never reaches production traffic.
		'img-src': ["'self'", 'data:', apiOrigin, 'https://pub-a4bacc79c5864ae9bec74ece3b3b2a30.r2.dev'],
		'connect-src': ["'self'", apiOrigin],
		'frame-src': ['https://challenges.cloudflare.com'],
		'frame-ancestors': ["'none'"],
		'object-src': ["'none'"],
		'base-uri': ["'self'"],
		'form-action': ["'self'"],
		'upgrade-insecure-requests': []
	}
	return Object.entries(directives)
		.map(([key, values]) => (values.length ? `${key} ${values.join(' ')}` : key))
		.join('; ')
}
