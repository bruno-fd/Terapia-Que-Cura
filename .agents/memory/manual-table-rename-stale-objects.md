---
name: Manual table rename leaves stale dependent object names
description: ALTER TABLE RENAME does not rename PK/unique constraints, their indexes, or sequences; Drizzle publish diff then reflects the old names and creates noise.
---

# Manual table rename leaves stale dependent object names

When you rename a table in Postgres via `ALTER TABLE old RENAME TO new` (e.g. done by hand during a rebrand/migration), Postgres does **not** rename the table's dependent objects:
- primary key constraint + its backing index (`old_pkey`)
- unique constraints + their indexes (`old_col_unique`)
- owned sequences (`old_id_seq`)

Those keep the *old* table's name. Drizzle's schema (using `.primaryKey()`, `.unique()`, `serial()` without explicit names) expects the auto-generated names based on the *new* table name (`new_pkey`, `new_col_unique`, `new_id_seq`). The mismatch shows up as:
- the publish-time SQL diff reflecting the old names in generated `CREATE TABLE ... CONSTRAINT "old_col_unique"` statements, and
- ongoing drizzle-kit push diff noise that wants to drop/recreate the constraints.

**Fix (dev only):** rename the dependent objects to the Drizzle-expected names. Renaming a PK/unique *constraint* also renames its backing index, so you don't need a separate `ALTER INDEX`:
```sql
ALTER TABLE new RENAME CONSTRAINT old_pkey TO new_pkey;
ALTER TABLE new RENAME CONSTRAINT old_col_unique TO new_col_unique;
ALTER SEQUENCE old_id_seq RENAME TO new_id_seq;  -- column default re-resolves by OID, safe
```

**Why:** keeps the dev DB in sync with Drizzle's implicit naming so future publishes/pushes produce clean diffs.

**How to apply:** whenever a table was renamed by hand (not via a Drizzle-generated migration), audit `pg_constraint`/`pg_indexes`/`information_schema.sequences` for the old table name and rename the leftovers. Never run this against production — production schema changes go through the Publish flow only.
