-- Phase CF-R2-03: purely additive, non-destructive. Two new nullable
-- columns on ReferenceAsset -- no DROP, no NOT NULL, no type change, no new
-- constraint, no data backfill. Every pre-existing row (1537 in production
-- as of 2026-07-16, prisma/README.md) gets storageProvider/storageKey = NULL,
-- which is their correct, honest state: they predate this StorageProvider
-- integration and were never written through it. Hand-authored (no live
-- database was available in this environment to run `prisma migrate dev`'s
-- auto-diff) -- validated via `prisma validate`/`prisma format` at authoring
-- time. Update, Phase CF-R2-04 (2026-09-23): applied for real via
-- `prisma migrate deploy` against a disposable MySQL 8.0.46 instance
-- (same no-Docker methodology as CF-DB-01) -- `prisma migrate status`
-- reported zero drift, both columns confirmed present with the exact types
-- above, and a simulated pre-existing row (no storageProvider/storageKey
-- supplied) inserted cleanly. Still not applied to any production database
-- -- that remains a separate, later, explicitly-authorized step.
ALTER TABLE `ReferenceAsset`
    ADD COLUMN `storageProvider` VARCHAR(20) NULL,
    ADD COLUMN `storageKey` VARCHAR(512) NULL;
