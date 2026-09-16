# Host storage preflight

Referenced by `AGENTS.md`'s invariant 23. Applies before any host action
that can consume or temporarily duplicate space on the cPanel account:
deploy, upload, archive extraction, `npm install`, `prisma generate`,
backup, restore, `.output` replacement, runtime update, package creation,
or any other operation that writes a non-trivial amount to disk.

Written 2026-09-15 after a 503 outage on `bmapi`/`bmweb` where the
hosting provider suggested storage/quota as a possible cause. A full
read-only audit that day found the account and host filesystem both
healthy (see the worked example at the end of this document) — but the
audit itself, done ad hoc under incident pressure, is what this document
turns into a standing, repeatable procedure so the next check doesn't
have to be reinvented, and so a real deploy/backup/restore never gets
launched blind.

## Why three separate numbers, not one

**Quota vs. filesystem are different things, checked differently.**
`ACCOUNT_QUOTA_*` is this cPanel account's own allotment (in 2026-09-15's
case, 4,000 MB) — read from the cPanel dashboard's "Disk Usage" stat or
the dedicated Disk Usage tool (`.../frontend/jupiter/diskusage/index.html`),
**not** from a shell `quota` command — that command does not exist inside
this host's jailshell (confirmed: `quota: comando não encontrado`).
`HOST_FILESYSTEM_*` is the underlying shared filesystem's own total/used/
free (`df -h`) — on this host, `/dev/mapper/almalinux-root`, mounted at
both `/` and `/tmp`. The account quota is almost always the binding
constraint on shared hosting (this account's own 4 GB vs. the host
filesystem's 897 GB) — but both must be checked, because a healthy
account quota says nothing about the shared filesystem, and vice versa.

**Inode exhaustion is a distinct failure mode from disk-space
exhaustion**, and a plain percentage-full check misses it entirely — an
account or filesystem can be nowhere near its byte quota while being out
of inodes (this happens with a very large number of small files, e.g. an
unbounded npm cache or a runaway diagnostic-script habit) and would then
fail to create a single new file despite reporting "plenty of space
left." Check with `df -hi` (or the CageFS-visible equivalent) alongside
`df -h`, not instead of it.

**CageFS limitations**: everything above is checked *from inside this
account's own jail* (CloudLinux CageFS). That view does **not** include:
other accounts' usage on the same shared node, the true LSAPI/Node
Selector global state, host-level file-descriptor limits, or anything
about the root-level LiteSpeed installation. A clean preflight reading
from inside this account proves this account isn't the problem — it does
**not** prove the shared host has no problem. If a real incident's
storage preflight comes back healthy but the symptom (e.g. a persistent
5xx) continues, that is itself useful, reportable evidence for a hosting
support ticket — see this document's own worked example.

## What to collect

```
ACCOUNT_QUOTA_LIMIT
ACCOUNT_QUOTA_USED
ACCOUNT_QUOTA_FREE
ACCOUNT_QUOTA_PERCENT

HOST_FILESYSTEM_USED
HOST_FILESYSTEM_FREE
HOST_FILESYSTEM_PERCENT

INODE_PERCENT

ESTIMATED_OPERATION_PEAK_EXTRA_SPACE
```

## Estimating peak extra space

Not the operation's total footprint — only the **extra**, temporary
space it needs *on top of* what already exists, since this project's own
established deploy pattern is rename-based (the live `.output`/`dist` is
renamed to a timestamped backup, never copied), so the old content
coexisting with the new is not additional consumption.

Two real, different patterns exist in this project's own history —
budget for whichever one the operation actually is, not a generic guess:

1. **Pre-built package, upload + extract only** (the pattern used for
   most recent deploys — build happens locally on the operator's own
   machine, only the built artifact is uploaded): peak ≈ new compressed
   archive size + new extracted size. Real observed sizes: a `bmweb`
   archive has run ~116-121 MB compressed, extracting to ~150-160 MB;
   a `bmapi` archive has run ~3-3.3 MB compressed, extracting to a
   ~6-7 MB `dist/`. Peak extra for a web deploy this way: **~270-280 MB**.
   Peak extra for an API deploy this way: **~40-50 MB**.
2. **`npm install` (or `prisma generate`) actually running on the host**:
   a materially different and larger case — historically observed in
   this project's own 2026-09-10 predeploy audit to resolve to roughly
   **100-300 MB** for this stack's `node_modules`, on top of whatever
   registry/build cache `npm` itself uses during the install. Never
   assume the smaller "just extract a prebuilt package" number applies
   if the operation under preflight actually runs `npm install` or
   `prisma generate` on the host itself — check which pattern is
   actually happening before estimating.

When genuinely uncertain which pattern applies, budget for the larger
one — an over-conservative PASS is free; an under-estimated FAIL found
mid-operation is not.

## Classification

Percentage alone is never sufficient — a 95%-full multi-terabyte
filesystem may have more absolute free space than a 50%-full one; a
small operation can safely PASS at a usage level that would FAIL a large
one. Absolute free space, the specific operation's own estimated peak,
and inode health are evaluated together:

```
PASS:
  free >= 2x estimated operation peak
  AND account usage < 85%
  AND inode usage < 80%

WARN:
  free between 1x and 2x estimated operation peak
  OR account usage 85%-95%
  OR inode usage 80%-90%

FAIL:
  free < 1x estimated operation peak
  OR account usage >= 95%
  OR inode usage >= 90%
```

**FAIL means STOP.** Do not proceed with the operation until the space
is resolved (freed, or the quota/plan increased) or until fresh, explicit
authorization to proceed anyway is obtained — never inferred from an
earlier, differently-scoped approval, matching invariant 21's general
rule.

A WARN result is not a stop condition by itself, but should be reported
plainly before proceeding, not silently absorbed — the person approving
the operation should know the margin is thin.

## Worked example — 2026-09-15 audit (historical numbers, not a hardcoded target)

The numbers below are what this account looked like on that date. They
are an example of the procedure, not a permanent baseline to re-check
against — re-run the real collection steps above for any future
preflight rather than reusing these.

```
ACCOUNT_QUOTA_LIMIT = 4,000.00 MB
ACCOUNT_QUOTA_USED = 3,091.17 MB
ACCOUNT_QUOTA_FREE = 908.83 MB
ACCOUNT_QUOTA_PERCENT = 77.28%

HOST_FILESYSTEM_USED = 724 GB
HOST_FILESYSTEM_FREE = 173 GB
HOST_FILESYSTEM_PERCENT = 81%

INODE_PERCENT = 4% (14M used / 365M total)
```

For a typical web deploy under pattern 1 above (~275 MB peak): 908.83 MB
free is ~3.3x the peak, account usage 77.28% < 85%, inodes 4% < 80% —
**PASS**, though margin (<1 GB free in absolute terms) was noted as worth
watching, not generous.

This same audit is also what grounded the 503 incident's own storage
correlation that day: `ACCOUNT_STORAGE_CAUSE = UNLIKELY`,
`VISIBLE_HOST_FILESYSTEM_CAUSE = UNLIKELY`, `INODE_EXHAUSTION = NO` — all
three read healthy from inside this account's CageFS view, which is
useful, real evidence *against* account storage exhaustion for that
specific incident, while explicitly not proving the shared host had no
problem (see CageFS limitations above). The earlier statement that
~~the outage's real cause turned out to be at the LSAPI/CloudLinux Node
Selector layer, not storage~~ was too definitive: the missing host
launchers identify the most likely failing **layer**, but the exact
root cause and recovery mechanism remain unconfirmed. See the
[incident closeout](../incidents/2026-09-15-production-node-lsapi-503.md).

## Prior art

An earlier, informal version of this exact check exists in
`docs/deployments/predeploy-2026-09-10-open-beta-consolidation/deploy-manifest.md`'s
own `STORAGE_STATE` section — this document formalizes that one-off
assessment into a standing, repeatable procedure rather than something
re-derived ad hoc each time.
