# Health module

Added 2026-09-15 while diagnosing a production LSAPI/CloudLinux Node.js
Selector hosting outage on `bmapi`/`bmweb` -- that investigation found the
API had no dedicated health route at all (the only status route was
`GET /api`, `AppController`, which is a general "what am I running"
endpoint, not a liveness/readiness signal). These two routes fill that
gap. **They do not fix the LSAPI incident** -- that is a hosting-layer
problem (the CloudLinux Node.js Selector's own launcher scripts), outside
anything this API's own code controls. Their value is diagnostic speed,
future automation, and a real readiness signal for monitoring/orchestration
to consume going forward.

## `GET /api/health` -- liveness

"Is the process alive and can it handle a request at all?" Never touches
the database or any other dependency -- only proves the Nest process
booted and the HTTP pipeline works. Always `200 { "status": "ok" }` when
the process can respond at all.

Deliberately DB-independent: liveness failures are typically acted on by
killing/restarting the process, which is the wrong response to "the
database is temporarily slow" -- that is what readiness is for.

## `GET /api/ready` -- readiness

"Is the process ready to serve real, DB-backed traffic right now?" Runs
`SELECT 1` through Prisma (`PrismaService.$queryRaw`) -- the minimal
proof the connection pool can reach the database, no real schema/data
touched.

- DB reachable: `200 { "status": "ready" }`
- DB unreachable: `503 { "status": "not_ready" }`

The 503 path is returned via `@Res({ passthrough: true })`, not a thrown
`HttpException` -- so it never goes through `SafeExceptionFilter`'s 5xx
branch (`ObservabilityService.recordSystemError` + `Http5xxBurstDetector`).
That branch exists for real application errors surfaced to real users; a
readiness probe polling every few seconds during a genuine DB outage would
otherwise generate a SystemError (and could itself trip a false 5xx-burst
alert) for every single poll, which is noise on top of an outage that a
real request already reports through the normal path.

## Security

Both routes are intentionally public (no guard, same as `AppController`'s
existing `GET /api`) so external monitoring can reach them without
credentials. Both are hard-capped to `{ status }` (plus an explicit code on
failure) -- neither ever includes environment variables, hostnames, file
paths, tokens, the database URL/credentials, or a stack trace. `/ready`'s
failure branch is a bare `catch { ... }` with the underlying error
discarded, specifically so a Prisma error message (which can include
connection-string fragments) never reaches the response body.

## Future monitoring recommendation (not configured in this phase)

An external uptime/monitoring tool should watch, at minimum:

- `GET /api/health`
- `GET /api/ready`
- the web homepage

No actual monitoring integration was set up as part of this change --
recorded here as a follow-up only.
