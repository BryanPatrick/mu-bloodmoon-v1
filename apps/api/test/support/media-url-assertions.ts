// Phase CF-R2-05: shared helpers so community-media.e2e-spec.ts and
// guilds.e2e-spec.ts can assert real, semantically-correct behavior under
// BOTH the local StorageProvider (the suites' existing default) and a real
// R2StorageProvider (MEDIA_STORAGE_PROVIDER=r2 / GUILD_MEDIA_STORAGE_PROVIDER=r2)
// without hardcoding one specific test bucket hostname -- these assertions
// never weaken what's checked, they check the CORRECT shape for whichever
// provider is actually active. RUNTIME_CODE_CHANGED = NO: nothing here
// touches src/, only how the existing e2e suites assert against it.

// A relative app path ("/api/media/community/<uuid>.webp") under the local
// provider, or a well-formed absolute R2 URL
// ("https://<any-host>/<namespace-prefix>available/<uuid>.<ext>") under R2 --
// the host itself is intentionally never pinned to one literal hostname.
export function expectMediaUrlShape(url: string, extension: string, localPrefix: string) {
	if (process.env.MEDIA_STORAGE_PROVIDER === 'r2' || process.env.GUILD_MEDIA_STORAGE_PROVIDER === 'r2') {
		expect(url).toMatch(new RegExp(`^https://[^/]+/(?:[^/]+/)?available/[a-f0-9-]+\\.${extension}$`))
	} else {
		expect(url).toMatch(new RegExp(`^${localPrefix}/[a-f0-9-]+\\.${extension}$`))
	}
}

// Fetches a media URL the way it would actually be reached by a real
// client: relative paths go through the app under test (supertest, so
// cookies/headers/the same HTTP server apply exactly as before); absolute
// URLs (R2's real public URL) are fetched for real over the network --
// supertest cannot dispatch a request to a different origin than the app
// it wraps, and pretending otherwise is exactly the CF-R19 gap being fixed
// here. Returns a minimal { status } shape, matching what every call site
// in these suites actually asserts on -- callers pass an already-awaited
// supertest response (or anything else shaped like one) for the local path.
export async function fetchMediaUrl(url: string, localRequest: () => Promise<{ status: number }>): Promise<{ status: number }> {
	if (/^https?:\/\//.test(url)) {
		const response = await fetch(url)
		return { status: response.status }
	}
	return localRequest()
}
