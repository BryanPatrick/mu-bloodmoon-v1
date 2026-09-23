---
status: ACTIVE
category: infrastructure
lastVerified: 2026-09-23
---

# Database migration — CF-API-02R3 MySQL 8 proof

Two independent disposable real-MySQL validations closed the compatibility
gate without touching production:

- MySQL Community Server 8.0.46 on loopback: all 55 canonical Prisma migrations
  applied from zero with `migrate deploy`; status clean; migration diff empty.
- MySQL 8.4.11 inside the Cloudflare Container validation image: all 55
  migrations applied; status clean; TLS available.

No `db push`, baseline, production dump, production database or production
credential was used. Serializable commit, rollback, unique-key idempotency,
two-session concurrent row-lock behavior and `GET_LOCK`/`RELEASE_LOCK` all
passed. The local instance was shut down and deleted; the Container database
was disposable and is not a production topology decision.

`MYSQL_8_MIGRATION_REPLAY = PROVEN`
