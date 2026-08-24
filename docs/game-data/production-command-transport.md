# Production game command transport

Phase 3D-A selects **Cloudflare Queues + D1 durable command state**.

```text
Portal (business state + AES-GCM encryptor)
  -> HMAC POST /internal/game-commands
  -> Worker stores CREATED in D1
  -> dedicated Cloudflare Queue (at-least-once buffer)
  -> Worker queue consumer marks AVAILABLE in D1

Windows GameBridge Agent
  -> outbound HMAC POST /game-commands/claim
  <- one environment/server-scoped command + durable lease
  -> decrypt immediately before dbo.DmN_CreateGameAccount
  -> persistent SQLite execution ledger
  -> outbound HMAC POST /game-commands/result
  -> D1 result persisted
  -> Portal HMAC reconciliation -> GameAccountIdentity ACTIVE/FAILED
```

## Decision

The evaluated patterns were:

1. **Queues only.** Queues supports HTTP pull outside Workers, but the Agent
   would need a Cloudflare account API token with Queue read/write permission,
   and the Queue is not a queryable reconciliation record.
2. **D1 as a homemade queue.** Possible, but it discards native buffering,
   retry and DLQ now that a real delivery need exists.
3. **Queues + D1. Chosen.** Queue supplies at-least-once buffering. A Worker
   consumer writes D1. The Agent uses route-bound HMAC and holds no Cloudflare
   account token.

Cloudflare documents at-least-once delivery and possible duplicates, so
`commandId` is an idempotency key at every layer and the Agent SQLite ledger is
the final write-side authority. Queues does not guarantee order; D1 claim orders
eligible work by `created_at`, scoped by environment/server, and production
claims one command at a time.

References: https://developers.cloudflare.com/queues/reference/delivery-guarantees/
and https://developers.cloudflare.com/queues/configuration/pull-consumers/.

## State ownership

| State | Owner |
|---|---|
| Provisioning `PENDING/PROVISIONING/ACTIVE/FAILED` | Portal MySQL |
| `CREATED/QUEUED/AVAILABLE/CLAIMED/SUCCEEDED/FAILED_RETRYABLE/FAILED_FINAL/EXPIRED` | D1 transport |
| `EXECUTING/SUCCEEDED`, request hash and safe result | Agent SQLite ledger |
| `MEMB_INFO` + `AccountCharacter` | MU SQL final representation |

`EXECUTING` is intentionally not duplicated in D1. D1 knows delivery is
claimed; only the local ledger knows whether SQL started or already succeeded.

## Claims, crashes, retries and expiry

Claims use a conditional D1 update and a 60-second lease. Two Agents may select
the same candidate, but only one conditional update can change it to `CLAIMED`.
A crashed Agent's lease returns to `AVAILABLE`. If the MU write succeeds and
result delivery is lost, reclaim reads the persistent ledger and reports the
prior result without invoking the write twice.

Commands expire after one hour and expired work is never claimed. A controlled
retry of a corrected, non-expired `FAILED_FINAL` command is Portal-HMAC-only and
reuses command/provisioning identities. Polling is 10 seconds idle, one second
after work, and exponential with jitter up to 120 seconds after failure.

Final D1 metadata is retained 90 days and deleted by a daily scheduled handler.
Alertable conditions are persistent `FAILED_FINAL`, repeated retryable failure,
SQL unavailable, missing key version, decrypt failure, Agent offline, work stuck
`AVAILABLE`/`CLAIMED`, or high `attempt_count`.

Resources are `bloodmoon-production-game-commands`,
`bloodmoon-production-game-commands-dlq`, `bloodmoon-game-data` D1 and
`bloodmoon-game-data-worker`. Knowledge Hub resources are not reused.
