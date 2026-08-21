-- =====================================================================
-- GanaderoPro | Database Foundation
-- File: 01_schemas.sql
-- Purpose: Create the logical schemas that will organize GanaderoPro's
--          tables by domain. NO TABLES are created in this file.
--
-- Safety notes:
--   - CREATE SCHEMA IF NOT EXISTS -> safe to run multiple times, never
--     errors if a schema already exists.
--   - Does NOT touch the "public" schema or any existing Supabase table.
--   - The "sanidad" schema below is created ONLY as an empty namespace.
--     Its tables are intentionally deferred to a separate future task,
--     as requested.
--   - Meant to be reviewed and executed manually (e.g. Supabase SQL
--     editor). It is not run automatically by this task.
-- =====================================================================

-- core: shared reference data used across every other schema
-- (enum types, lookup/reference tables, cross-domain utilities).
CREATE SCHEMA IF NOT EXISTS core;
COMMENT ON SCHEMA core IS
  'Shared reference data for GanaderoPro: enum types, lookup tables, and cross-domain utilities used by every other schema.';

-- ganado: livestock inventory itself (animals, herds, identification,
-- lineage, physical records).
CREATE SCHEMA IF NOT EXISTS ganado;
COMMENT ON SCHEMA ganado IS
  'Livestock inventory: animals, herds, identification, lineage, and physical records.';

-- sanidad: animal health domain. Namespace only for now -- no tables
-- are created here yet.
CREATE SCHEMA IF NOT EXISTS sanidad;
COMMENT ON SCHEMA sanidad IS
  'Animal health: treatments, vaccination/health campaigns, and sanitary products. Tables intentionally pending, to be created in a future task.';

-- reproduccion: breeding, gestation, births, genealogy tracking.
CREATE SCHEMA IF NOT EXISTS reproduccion;
COMMENT ON SCHEMA reproduccion IS
  'Reproduction management: breeding events, gestation, births, and genealogy tracking.';

-- costos: financial tracking tied to livestock operations.
CREATE SCHEMA IF NOT EXISTS costos;
COMMENT ON SCHEMA costos IS
  'Financial tracking: costs, expenses, and revenue tied to livestock operations.';

-- inventario: supplies and stock (sanitary products, feed, equipment)
-- and their movements.
CREATE SCHEMA IF NOT EXISTS inventario;
COMMENT ON SCHEMA inventario IS
  'Supplies and stock: sanitary products, feed, equipment, and their movements.';

-- reportes: reporting layer (views/materialized views for dashboards
-- and exports).
CREATE SCHEMA IF NOT EXISTS reportes;
COMMENT ON SCHEMA reportes IS
  'Reporting layer: views and materialized views aggregating data for dashboards and exports.';