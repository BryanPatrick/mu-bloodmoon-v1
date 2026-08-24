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
            API_READ_SECRETS_JSON: JSON.stringify({ 'test-api': 'test-api-secret' }),
            COMMAND_AGENT_SECRETS_JSON: JSON.stringify({ 'test-command-agent': 'test-command-agent-secret' }),
            COMMAND_AGENT_SCOPES_JSON: JSON.stringify({ 'test-command-agent': { environment: 'production', serverId: 'mu-primary' } }),
            COMMAND_PORTAL_SECRETS_JSON: JSON.stringify({ 'test-command-portal': 'test-command-portal-secret' })
          }
        }
      }
    }
  }
})
