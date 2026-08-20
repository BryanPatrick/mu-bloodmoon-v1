// AGENT_SECRETS_JSON / API_READ_SECRETS_JSON are Worker secrets (`wrangler
// secret put`), JSON-encoded maps of clientId -> HMAC secret. Two
// independent scopes: the Agent's write credential can never reach the
// read endpoint, and apps/api's read credential can never reach ingest.
export interface Env {
  DB: D1Database
  AGENT_SECRETS_JSON: string
  API_READ_SECRETS_JSON: string
}
