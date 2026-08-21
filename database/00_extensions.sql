-- =====================================================================
-- GanaderoPro | Database Foundation
-- File: 00_extensions.sql
-- Purpose: Enable the PostgreSQL extensions required by the GanaderoPro
--          schema (types, indexes, and functions used later on).
--
-- Safety notes:
--   - Every statement uses IF NOT EXISTS -> safe to run multiple times.
--   - This file does NOT create, alter, or drop any table.
--   - This file does NOT touch the "public" schema or any data.
--   - Meant to be reviewed and executed manually (e.g. Supabase SQL
--     editor). It is not run automatically by this task.
-- =====================================================================

-- pgcrypto: provides gen_random_uuid(), which will be used as the
-- default value for primary keys across GanaderoPro tables
-- (ganado, sanidad, reproduccion, etc.). Most Supabase projects already
-- have this enabled; IF NOT EXISTS makes the statement a safe no-op
-- when that's the case.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- pg_trgm: adds trigram indexing/similarity search, needed later for
-- fast fuzzy lookups (e.g. finding an animal by partial tag or name,
-- "Vaca 231" matching "vaca231").
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- unaccent: strips accents for search purposes. Useful because most
-- GanaderoPro content (breeds, treatment notes, product names) will be
-- entered in Spanish, and "sanacion" should be able to match "sanación".
CREATE EXTENSION IF NOT EXISTS "unaccent";