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
		'img-src': ["'self'", 'data:', apiOrigin],
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
