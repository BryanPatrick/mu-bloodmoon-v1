#!/usr/bin/env node
// Cloudflare migration Phase CF-01 -- builds apps/web against Nitro's cloudflare_module preset,
// entirely SEPARATE from the production `npm run web:build` (node-server preset). Uses a Node wrapper
// rather than a shell env-var prefix (`NITRO_PRESET=... nuxt build`) so this one script works the same
// from Bash and PowerShell without adding a cross-env dependency for a single script.
//
// Does NOT run scripts/patch-nitro-output.mjs -- that patch exists for a node-server-specific ESM
// resolution quirk (tailwindcss/colors) and has not been verified to apply, or apply the same way,
// under the Cloudflare preset's own bundling. See docs/cloudflare-migration/WEB_MIGRATION.md.
import { spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateCloudflareWebRcEnv } from './cloudflare-web-rc-config.mjs'

const publicConfig = validateCloudflareWebRcEnv(process.env)
console.log(
	`[cloudflare-web-rc] Public config accepted: api=${publicConfig.apiBase}; ` +
		'Turnstile=configured (value not displayed); payments=false; marketplace=false'
)

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nuxtBin = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'nuxt.cmd' : 'nuxt')

const result = spawnSync(nuxtBin, ['build', 'apps/web'], {
	stdio: 'inherit',
	cwd: root,
	shell: process.platform === 'win32',
	env: { ...process.env, NITRO_PRESET: 'cloudflare_module' }
})
if (result.error) {
	console.error(result.error)
	process.exit(1)
}
process.exit(result.status ?? 1)
