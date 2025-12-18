# How to Create New Seed Data

This guide explains how to create a fresh dump of the production database for development use.

## Prerequisites

- **Database password**: Get the production database password from Supabase dashboard
- **Database host**: Available in Supabase project settings > Database > Connection string

## Steps

### 1. Create the Database Dump

Run the following command, replacing `YOUR_PASSWORD` with the actual database password:

```bash
pg_dump --table='"Talents"' --table='metadata' --no-owner --no-privileges "postgresql://postgres:YOUR_PASSWORD@db.ffclklevsquhuuzepxsf.supabase.co:5432/postgres" > supabase/seed-data-new.sql
```

### 2. Clean Up the Dump

Remove the `\restrict` and `\unrestrict` lines, and add DROP statements:

```bash
# First, remove the restrict/unrestrict lines
# Find the line numbers first:
grep -n "\\restrict" supabase/seed-data-new.sql

# Then remove them (update line numbers as needed - usually 5 and 554)
sed '5d; 554d' supabase/seed-data-new.sql > supabase/seed-data-temp.sql

# Now add DROP statements at the beginning (after the SET commands, before CREATE TABLE)
# Find the line with "SET row_security = off;"
LINE=$(grep -n "SET row_security = off;" supabase/seed-data-temp.sql | cut -d: -f1)

# Insert DROP statements after that line
sed -i '' "${LINE}a\\
\\
DROP POLICY IF EXISTS \"Enable read access for all users\" ON public.\"Talents\";\\
DROP POLICY IF EXISTS \"Allow all access to metadata\" ON public.metadata;\\
DROP INDEX IF EXISTS public.\"Talents_expansion_idx\";\\
DROP INDEX IF EXISTS public.\"Talents_color_idx\";\\
ALTER TABLE IF EXISTS ONLY public.metadata DROP CONSTRAINT IF EXISTS metadata_pkey;\\
ALTER TABLE IF EXISTS ONLY public.\"Talents\" DROP CONSTRAINT IF EXISTS \"Talents_pkey\";\\
ALTER TABLE IF EXISTS ONLY public.\"Talents\" DROP CONSTRAINT IF EXISTS \"Talents_id_key\";\\
DROP TABLE IF EXISTS public.metadata;\\
DROP TABLE IF EXISTS public.\"Talents\";
" supabase/seed-data-temp.sql

# Rename to clean
mv supabase/seed-data-temp.sql supabase/seed-data-clean.sql
```

**Why DROP statements are needed:**
When importing the seed data, the tables might already exist. The DROP statements ensure a clean slate by removing existing tables, indexes, and constraints before recreating them.

### 3. Add Permissions to the Dump

Add Supabase role permissions to the end of the dump (before the "dump complete" comment):

```bash
# Add permissions after the ROW LEVEL SECURITY section
sed -i '' '/PostgreSQL database dump complete/i\
--\
-- Grant permissions to Supabase roles\
--\
\
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;\
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;\
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;\
\
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;\
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;\
\
' supabase/seed-data-clean.sql
```

**Why this is needed:**
The `--no-privileges` flag excludes permission grants. Without these, your application (using the `anon` or `authenticated` role) won't have access to the tables.

### 4. Verify the Cleaned Dump

Check that the cleaned file looks correct:

```bash
# Should show CREATE TABLE statements for Talents and metadata
grep "^CREATE TABLE" supabase/seed-data-clean.sql

# Should show no restrict/unrestrict lines (no output expected)
grep "\\restrict\|\\unrestrict" supabase/seed-data-clean.sql

# Verify event_requirement_matrix column exists in schema
grep "event_requirement_matrix" supabase/seed-data-clean.sql | head -2

# Verify permissions were added
grep "GRANT" supabase/seed-data-clean.sql

# Count Talents rows (should be ~376 or more)
grep "^[0-9]" supabase/seed-data-clean.sql | wc -l
```

### 5. Replace the Old Seed Data

Once verified, replace the old seed data and clean up temporary files:

```bash
# Replace the old seed data with the cleaned version
mv supabase/seed-data-clean.sql supabase/seed-data.sql

# Remove the temporary dump file
rm supabase/seed-data-new.sql
```

The updated [seed-data.sql](seed-data.sql) is now ready to use for local development!

## What This Seed Data Includes

- **Complete table schemas**: CREATE TABLE statements with all columns, constraints, and sequences
- **Talents table**: All talent/skill data from production (376+ rows)
- **metadata table**: Currently empty, but structure is preserved
- **Format**: PostgreSQL COPY format for efficient loading
- **Indexes and constraints**: Primary keys, unique constraints, and indexes

## What's Excluded

- **Cards table**: Excluded because it syncs from the Blightbane API
- **Auth tables**: Not needed for local development
- **Policies and permissions**: Excluded via `--no-privileges` flag
- **Ownership information**: Excluded via `--no-owner` flag

## Important Notes

- This dump includes **both schema and data**, so it will DROP and recreate the tables
- If you add new columns to the production Talents table, they will automatically be included in future dumps
- The `\restrict` and `\unrestrict` lines are Supabase-specific and must be removed for local imports
