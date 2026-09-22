// Phase 17R (2026-09-21): tightens script-src on real SSR page renders from 'self' + Turnstile down to
// exactly that plus the specific inline scripts Nuxt itself emits -- no 'unsafe-inline'.
//
// Verified in the actual built output of this app (apps/web/.output, not assumed): every SSR page
// carries two inline, non-JSON <script> blocks with no attacker-controlled content --
//   1. the color-mode module's pre-hydration bootstrap (reads localStorage, sets the dark/light class
//      before paint) -- fixed source, no server-interpolated values;
//   2. `window.__NUXT__.config = {...}` -- the public runtime config payload (apiBase, turnstileSiteKey,
//      buildId, etc.), fixed for the lifetime of this running server process, never per-visitor.
// (A third <script type="application/json" id="__NUXT_DATA__"> carries the page's hydration data --
// that MIME type is never subject to script-src, so it needs no allowance here.)
//
// Rather than reconstruct that markup to guess its hash (a byte-for-byte mismatch would silently break
// the CSP again), this hashes the SAME html Nitro is about to send, on the `render:response` hook that
// fires once per real page render, with the final HTML already produced. Verified empirically (Phase
// 17R): `response.headers` on this hook is Nitro's own render-context object, NOT the event's response
// headers that server/middleware/00.security-headers.ts already set (setResponseHeader there and this
// hook's `response.headers` are two different places -- checked by curling a build where this plugin
// only tried to read-and-append the middleware's value: no hash ever appeared). So this sets the whole
// header here, from the same buildCsp() the middleware uses, rather than trying to append to a value
// that was never visible here in the first place; Nitro merges `response.headers` onto the event's
// headers right after this hook runs, so this is authoritative for the page it renders.
//
// Non-HTML responses (assets, 404s, API-less routes) never reach this hook and keep the plain baseline
// CSP the middleware set directly on the event.
import { createHash } from 'node:crypto'

export default defineNitroPlugin((nitroApp) => {
	nitroApp.hooks.hook('render:response', (response, { event }) => {
		const body = response?.body
		if (typeof body !== 'string' || !body.includes('<html')) return // only real HTML page renders

		const hashes = new Set<string>()
		const scriptTag = /<script(?![^>]*\btype=["']application\/json["'])[^>]*>([\s\S]*?)<\/script>/gi
		let match: RegExpExecArray | null
		while ((match = scriptTag.exec(body))) {
			const content = match[1]
			if (!content.trim()) continue // external <script src="..."> already covered by 'self'
			hashes.add(`'sha256-${createHash('sha256').update(content, 'utf8').digest('base64')}'`)
		}

		const config = useRuntimeConfig(event)
		const apiOrigin = originOf(String(config.public.apiBase || ''), 'http://localhost:3333')
		response.headers = response.headers || {}
		response.headers['Content-Security-Policy'] = buildCsp(apiOrigin, [...hashes])
	})
})
