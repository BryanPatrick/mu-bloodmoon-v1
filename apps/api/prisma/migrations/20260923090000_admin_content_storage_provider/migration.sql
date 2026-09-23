-- Phase CF-R2-03: purely additive, non-destructive. Two new nullable
-- columns on ReferenceAsset -- no DROP, no NOT NULL, no type change, no new
-- constraint, no data backfill. Every pre-existing row (1537 in production
-- as of 2026-07-16, prisma/README.md) gets storageProvider/storageKey = NULL,
-- which is their correct, honest state: they predate this StorageProvider
-- integration and were never written through it. Hand-authored (no live
-- database was available in this environment to run `prisma migrate dev`'s
-- auto-diff) -- validated via `prisma validate`/`prisma format` only, NOT
-- applied or tested against any real database this phase. Apply via
-- `prisma migrate deploy` and verify against a real target before treating
-- this as production-ready.
ALTER TABLE `ReferenceAsset`
    ADD COLUMN `storageProvider` VARCHAR(20) NULL,
    ADD COLUMN `storageKey` VARCHAR(512) NULL;
