import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          // Local-only test secrets. Never real values -- see README.md.
          bindings: {
            AGENT_SECRETS_JSON: JSON.stringify({ 'test-agent': 'test-agent-secret' }),
            API_READ_SECRETS_JSON: JSON.stringify({ 'test-api': 'test-api-secret' })
          }
        }
      }
    }
  }
})
