# How to Create New Seed Data

This guide explains how to create a complete backup of the production database for both disaster recovery and local development.

## Prerequisites

- **Database password**: Get the production database password from Supabase dashboard
- **Database host**: Available in Supabase project settings > Database > Connection string

## Steps

### 1. Create the Database Dump

Run the following command, replacing `YOUR_PASSWORD` with the actual database password:

```bash
pg_dump --table='"Talents"' --table='"Cards"' --table='metadata' --no-owner --no-privileges "postgresql://postgres:YOUR_PASSWORD@db.ffclklevsquhuuzepxsf.supabase.co:5432/postgres" > supabase/seed-data-new.sql
```

### 2. Clean Up the Dump

Remove the `\restrict` and `\unrestrict` lines, and add DROP statements:

```bash
# First, remove the restrict/unrestrict lines
sed '/\\restrict/d; /\\unrestrict/d' supabase/seed-data-new.sql > supabase/seed-data-temp.sql

# Now add DROP statements at the beginning (after the SET commands, before CREATE TABLE)
# Find the line with "SET row_security = off;"
LINE=$(grep -n "SET row_security = off;" supabase/seed-data-temp.sql | cut -d: -f1)

# Insert DROP statements after that line
sed -i '' "${LINE}a\\
\\
DROP POLICY IF EXISTS \"Enable read access for all users\" ON public.\"Talents\";\\
DROP POLICY IF EXISTS \"Enable read access for all users\" ON public.\"Cards\";\\
DROP POLICY IF EXISTS \"Allow all access to metadata\" ON public.metadata;\\
DROP INDEX IF EXISTS public.\"Talents_expansion_idx\";\\
DROP INDEX IF EXISTS public.\"Talents_color_idx\";\\
DROP INDEX IF EXISTS public.\"Cards_expansion_idx\";\\
DROP INDEX IF EXISTS public.\"Cards_color_idx\";\\
DROP INDEX IF EXISTS public.\"Cards_name_idx\";\\
ALTER TABLE IF EXISTS ONLY public.metadata DROP CONSTRAINT IF EXISTS metadata_pkey;\\
ALTER TABLE IF EXISTS ONLY public.\"Talents\" DROP CONSTRAINT IF EXISTS \"Talents_pkey\";\\
ALTER TABLE IF EXISTS ONLY public.\"Talents\" DROP CONSTRAINT IF EXISTS \"Talents_id_key\";\\
ALTER TABLE IF EXISTS ONLY public.\"Cards\" DROP CONSTRAINT IF EXISTS \"Cards_pkey\";\\
ALTER TABLE IF EXISTS ONLY public.\"Cards\" DROP CONSTRAINT IF EXISTS \"Cards_id_key\";\\
DROP TABLE IF EXISTS public.metadata;\\
DROP TABLE IF EXISTS public.\"Talents\";\\
DROP TABLE IF EXISTS public.\"Cards\";
" supabase/seed-data-temp.sql
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
' supabase/seed-data-temp.sql
```

**Why this is needed:**
The `--no-privileges` flag excludes permission grants. Without these, your application (using the `anon` or `authenticated` role) won't have access to the tables.

### 4. Verify the Cleaned Dump

Check that the cleaned file looks correct:

```bash
# Should show CREATE TABLE statements for Cards, Talents, and metadata
grep "^CREATE TABLE" supabase/seed-data-temp.sql

# Should show no restrict/unrestrict lines (no output expected)
grep "\\restrict\|\\unrestrict" supabase/seed-data-temp.sql

# Verify event_requirement_matrix column exists in Talents schema
grep "event_requirement_matrix" supabase/seed-data-temp.sql | head -2

# Verify permissions were added
grep "GRANT USAGE ON SCHEMA" supabase/seed-data-temp.sql

# Count data rows
echo -n "Talents: " && grep -A 10000 'COPY public."Talents"' supabase/seed-data-temp.sql | grep -c "^[0-9]"
echo -n "Cards: " && grep -A 10000 'COPY public."Cards"' supabase/seed-data-temp.sql | grep -c "^[0-9]"
```

### 5. Test the New Backup

Before replacing the old seed data, test that it works correctly:

```bash
# Stop local Supabase if running
npx supabase stop

# Start fresh
npx supabase start

# Import the NEW backup
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f supabase/seed-data-temp.sql

# Verify data was imported correctly
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "SELECT COUNT(*) as talents_count FROM \"Talents\";"
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "SELECT COUNT(*) as cards_count FROM \"Cards\";"
```

**Expected results:**
- Talents count: ~376
- Cards count: ~1740

**Test the application:**
```bash
# Start the dev server
npm run dev

# Navigate to http://localhost:3000/codex
# Verify talents and cards display correctly
```

If everything works correctly, proceed to step 6. If there are issues, investigate before replacing the old backup.

### 6. Replace the Old Seed Data

Once verified and tested, replace the old seed data and clean up temporary files:

```bash
# Replace the old seed data with the cleaned version
mv supabase/seed-data-temp.sql supabase/seed-data.sql

# Remove the temporary dump file
rm supabase/seed-data-new.sql
```

The updated [seed-data.sql](seed-data.sql) is now ready to use for both local development and disaster recovery!

## What This Seed Data Includes

- **Complete table schemas**: CREATE TABLE statements with all columns, constraints, and sequences
- **Talents table**: All talent/skill data from production (376+ rows)
- **Cards table**: All card data from production (1740+ rows) - **NEW: included for disaster recovery**
- **metadata table**: Schema preserved (data is empty but gets populated during sync)
- **Format**: PostgreSQL COPY format for efficient loading
- **Indexes and constraints**: Primary keys, unique constraints, and indexes
- **Permissions**: Supabase role permissions (postgres, anon, authenticated, service_role)

## What's Excluded

- **Auth tables**: Not needed for local development
- **Ownership information**: Excluded via `--no-owner` flag

## How to Use This Backup

### For Local Development

After starting Supabase, import the seed data:

```bash
# Start local Supabase
npx supabase start

# Import the seed data
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f supabase/seed-data.sql
```

**Note:** `supabase db reset` alone is not sufficient - you must run the psql command to import the data.

### For Production Disaster Recovery

⚠️ **DANGER: This will DELETE all production data!** Only use in emergency:

```bash
# Replace YOUR_PASSWORD with actual production database password
psql "postgresql://postgres:YOUR_PASSWORD@db.ffclklevsquhuuzepxsf.supabase.co:5432/postgres" \
  < supabase/seed-data.sql
```

This will:
1. Drop all existing tables (Talents, Cards, metadata)
2. Recreate the schemas
3. Import all data from the backup
4. Restore indexes, constraints, and permissions

## Important Notes

- This dump includes **both schema and data**, so it will DROP and recreate the tables
- **Suitable for disaster recovery**: This backup can restore both Talents and Cards tables if production fails
- If you add new columns to production tables, they will automatically be included in future dumps
- The `\restrict` and `\unrestrict` lines are Supabase-specific and must be removed for local imports
