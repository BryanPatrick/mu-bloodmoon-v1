-- Phase 3D-B Part 0 -- isolate Claude's local test/dev database from the
-- shared bloodmoon_local, after the 2026-08-24 concurrent-reset incident.
-- Reuses the existing `bloodmoon` login (same DPAPI-stored credential
-- already on this machine) -- only grants it rights on a NEW, second
-- database. Does not touch bloodmoon_local, its data, or its existing
-- grant in any way.

CREATE DATABASE IF NOT EXISTS bloodmoon_local_claude
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON bloodmoon_local_claude.* TO 'bloodmoon'@'localhost';

FLUSH PRIVILEGES;
