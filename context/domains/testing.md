---
status: ACTIVE
category: context-pack-domain
lastVerified: 2026-09-17
classification: PARTIAL
---

# Domain: Testing

**State**: committed test guidance exists in
[`../../docs/testing/`](../../docs/testing/) and executable API tests
exist in `apps/api/test/`. A test file's existence does not prove
that it passes against the current production environment.

The Phase 5 Asaas continuation independently passed local MySQL and
MariaDB disposable-DB suites; it did not validate the real Asaas
Sandbox or production. See `../domains/payments.md` for that boundary.
