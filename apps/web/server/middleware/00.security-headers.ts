// Phase 17R (2026-09-21): the 2026-09-17 readiness audit found the web origin sends none of the
// standard security headers -- confirmed again here (curl against a local build before this file
// existed showed the same). apps/api already sets these via helmet(); this brings the player-facing
// web origin (the one the login/register/recovery pages live on) to the same baseline.
//
// Runs on EVERY request (Nitro convention: server/middleware/*, "00." prefix orders it first) so it
// covers SSR HTML, static assets and any future server route the same way, with no per-route opt-in
// to forget. The Content-Security-Policy set here is a baseline WITHOUT the hashes of Nuxt's own
// inline scripts -- those only exist on a real page render, and are added on top of this by
// server/plugins/csp-inline-script-hashes.ts, which runs later in the same response for real HTML
// (this baseline is what stays in force for assets, 404s and redirects, none of which carry those
// scripts). apiOrigin comes from the same runtime config the app itself uses (NUXT_PUBLIC_API_BASE),
// so a deploy that points the web app at a different API origin gets a CSP that matches it without
// editing this file.
//
// Origins actually required by this app, and no others (checked in the source, not assumed):
//   - API calls (fetch/XHR): NUXT_PUBLIC_API_BASE's origin (apps/web/composables/use*Api.ts, useAuth.ts)
//   - Fonts: fonts.googleapis.com (stylesheet, nuxt.config.ts app.head.link) + fonts.gstatic.com (the
//     actual font files that stylesheet references)
//   - Cloudflare Turnstile (login/register/recovery CAPTCHA widget): challenges.cloudflare.com, script
//     + the widget's own iframe (components/auth/TurnstileWidget.vue)
//   - No analytics, no other third-party script, no other third-party frame anywhere in apps/web.
let cached: { csp: string; apiOrigin: string } | null = null

export default defineEventHandler((event) => {
	const config = useRuntimeConfig(event)
	const apiOrigin = originOf(String(config.public.apiBase || ''), 'http://localhost:3333')
	if (!cached || cached.apiOrigin !== apiOrigin) {
		cached = { apiOrigin, csp: buildCsp(apiOrigin) }
	}

	setResponseHeader(event, 'Content-Security-Policy', cached.csp)
	setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
	// Distinct from the CSP's own frame-ancestors 'none' above -- kept together for browsers that
	// only understand this older header, the same defense-in-depth apps/api's helmet() already applies.
	setResponseHeader(event, 'X-Frame-Options', 'DENY')
	setResponseHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
	// Deny every browser feature this app does not use; nothing here calls the camera, microphone,
	// geolocation, payment UI or USB/serial APIs.
	setResponseHeader(
		event,
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()'
	)
	// HSTS: TLS terminates at cPanel/the host in front of this Nitro server (see
	// docs/deployment-architecture.md), which is exactly why this header belongs here rather than in
	// that layer's own config -- the app controls this file, the TLS termination point is outside the
	// deploy this repo ships. max-age is 6 months; includeSubDomains because api.<domain> is a sibling
	// subdomain on the same certificate/policy. No preload yet -- that is a one-way submission with real
	// consequences if a subdomain is ever added that can't do HTTPS, a decision for Bryan, not baked in here.
	setResponseHeader(event, 'Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
})
