# Supabase Setup Guide

This guide covers setting up and managing the Supabase backend for the SOYL Ecommerce Demo.

## Initial Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click **New Project**
4. Fill in:
   - **Name**: `soyl-ecommerce-demo`
   - **Database Password**: Generate strong password (save it!)
   - **Region**: `asia-south1` (Mumbai) or nearest
5. Wait for provisioning (2-3 minutes)

### 2. Apply Database Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Open `supabase/schema.sql` from this repository
3. Copy entire contents
4. Paste into SQL Editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Verify success message

### 3. Apply Migrations

Run these migrations in order:

1. `supabase/migrations/001_initial_schema.sql` (if not using schema.sql directly)
2. `supabase/migrations/002_vector_search_function.sql`

### 4. Enable Extensions

#### pgvector Extension

1. Go to **Database** → **Extensions**
2. Search for `vector`
3. Click **Enable**

**Note**: pgvector may require Pro plan or higher. If unavailable:
- Upgrade Supabase plan, or
- Use self-hosted Postgres with pgvector

#### uuid-ossp Extension

Usually enabled by default. If not:
1. Go to **Database** → **Extensions**
2. Enable `uuid-ossp`

### 5. Configure Storage

#### Create Storage Bucket

1. Go to **Storage** in Supabase dashboard
2. Click **New bucket**
3. Name: `product-images`
4. **Public bucket**: ✅ (for public product images)
5. Click **Create bucket**

#### Set Up Policies

1. Go to **Storage** → **Policies** → `product-images`
2. Add policy for public read:

```sql
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');
```

3. Add policy for admin upload:

```sql
CREATE POLICY "Admin Upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated' AND
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
```

## API Keys

### Get Your Keys

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **KEEP SECRET**

### Key Usage

- **anon key**: Client-side operations (browser)
- **service_role key**: Server-side only (Netlify Functions)
- **Never expose service_role key to client!**

## Database Management

### Using Supabase CLI (Optional)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --linked > types/supabase.ts
```

### Using SQL Editor

- Go to **SQL Editor** in dashboard
- Write and run SQL queries
- Save frequently used queries

### Using Table Editor

- View and edit data directly
- Useful for quick data updates
- Respects RLS policies

## Row Level Security (RLS)

### Verify RLS is Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All tables should have `rowsecurity = true`.

### Test Policies

```sql
-- Test as anonymous user
SET ROLE anon;
SELECT * FROM products; -- Should work

-- Test as authenticated user
SET ROLE authenticated;
INSERT INTO orders (...) VALUES (...); -- Should work if authenticated

-- Test as admin
-- (Requires actual admin user session)
```

## Seeding Data

### Run Seed Script

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run seed
npm run seed
```

This creates:
- 10 sample products
- Admin user (email: `admin@soyl.test`, password: `Admin@123!`)
- Sample coupons

### Manual Seeding

You can also seed via SQL Editor or Table Editor.

## Monitoring

### Database Metrics

- Go to **Database** → **Reports**
- View:
  - Database size
  - Connection count
  - Query performance
  - Index usage

### API Metrics

- Go to **Settings** → **API**
- View:
  - Request count
  - Error rate
  - Response times

### Logs

- Go to **Logs** in dashboard
- Filter by:
  - API requests
  - Database queries
  - Auth events
  - Storage operations

## Backup & Restore

### Automatic Backups

Supabase Pro plan includes:
- Daily backups
- Point-in-time recovery
- 7-day retention (configurable)

### Manual Backup

```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Or use pg_dump directly
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -f backup.sql
```

### Restore

```bash
# Using Supabase CLI
supabase db reset

# Or restore from SQL file
psql -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -f backup.sql
```

## Performance Tuning

### Indexes

Already created in `schema.sql`:
- `idx_products_slug` - Fast product lookups
- `idx_events_created_at` - Fast event queries
- `idx_embeddings_vector` - Fast vector search

### Query Optimization

- Use `EXPLAIN ANALYZE` to analyze queries
- Monitor slow queries in **Database** → **Reports**
- Add indexes for frequently queried columns

### Connection Pooling

Supabase handles connection pooling automatically. For high-traffic:
- Use connection pooler URL (found in **Settings** → **Database**)
- Configure pool size based on traffic

## Troubleshooting

### pgvector Not Available

**Error**: `extension "vector" does not exist`

**Solution**:
1. Check if extension is enabled in **Database** → **Extensions**
2. If not available, upgrade to Pro plan or use self-hosted Postgres

### RLS Policy Errors

**Error**: `permission denied for table`

**Solution**:
1. Verify RLS is enabled: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
2. Check policies exist: `SELECT * FROM pg_policies WHERE tablename = 'table_name';`
3. Verify user role in `profiles` table

### Connection Issues

**Error**: `Connection timeout` or `Too many connections`

**Solution**:
1. Check connection pooler settings
2. Reduce connection pool size
3. Use connection pooler URL instead of direct connection

### Migration Errors

**Error**: `relation already exists` or `duplicate key`

**Solution**:
1. Check if schema already applied
2. Use `IF NOT EXISTS` in migrations
3. Drop and recreate if needed (⚠️ data loss)

## Best Practices

1. **Never commit secrets**: Use environment variables
2. **Use migrations**: Don't modify schema directly in production
3. **Test RLS policies**: Verify access control works
4. **Monitor usage**: Watch API usage and database size
5. **Regular backups**: Ensure backups are configured
6. **Update Supabase**: Keep Supabase CLI and SDK updated

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

## Support

For Supabase-specific issues:
- Check [Supabase Status](https://status.supabase.com)
- Open issue in [Supabase GitHub](https://github.com/supabase/supabase)
- Contact Supabase support (Pro plan)

