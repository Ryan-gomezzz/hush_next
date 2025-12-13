# Deployment Guide

This guide covers deploying the SOYL Supabase Ecommerce Demo to production using Vercel.

## Prerequisites

- Supabase project (free tier or higher)
- Vercel account
- OpenAI API key
- GitHub repository (for CI/CD)

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose region: `asia-south1` (Mumbai) or nearest available
3. Wait for project to be provisioned (2-3 minutes)

### 1.2 Apply Database Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Open `supabase/schema.sql` from this repository
3. Copy and paste the entire SQL into the editor
4. Click **Run** to execute
5. Verify tables were created in **Table Editor**

### 1.3 Apply Migrations

1. In SQL Editor, run `supabase/migrations/002_vector_search_function.sql`
2. This creates the `match_embeddings` function for vector search

### 1.4 Enable pgvector Extension

1. Go to **Database** → **Extensions**
2. Search for `vector` and enable it
3. If not available, you may need to upgrade your Supabase plan (Pro or higher)

### 1.5 Get API Keys

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## Step 2: Seed Database

### 2.1 Local Seeding

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run seed script
npm run seed
```

This creates:
- 10 sample cosmetics products
- Admin user (email: `admin@soyl.test`, password: `Admin@123!`)
- Sample coupons

### 2.2 Verify Data

1. Go to Supabase **Table Editor**
2. Check `products`, `inventory`, `profiles`, and `coupons` tables
3. Verify admin user exists with `role = 'admin'`

## Step 3: Vercel Deployment

### 3.1 Connect Repository

1. Go to [Vercel](https://vercel.com) and sign in
2. Click **Add New Project**
3. Import your GitHub repository
4. Select the repository

### 3.2 Configure Build Settings

Vercel should auto-detect Next.js. The `vercel.json` is already configured with:
- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `app/storefront` (this tells Vercel where your Next.js app is located)
- **Build Command**: `npm run build` (runs in the root directory)
- **Output Directory**: `.next` (default for Next.js)

**Important**: The `rootDirectory` setting tells Vercel to:
1. Change to `app/storefront` directory first
2. Install dependencies from `app/storefront/package.json`
3. Run the build command there
4. Deploy the `.next` output directory

**Note**: Vercel automatically handles Next.js routing and serverless functions. No additional plugins needed.

### 3.3 Set Environment Variables

**CRITICAL**: These environment variables MUST be set in Vercel before building, as Next.js needs them during the build process.

📖 **For a complete guide with detailed instructions, see [VERCEL_ENV_VARS.md](../VERCEL_ENV_VARS.md)**

**Quick Reference:**

**Public variables** (exposed to client - required for build):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Private variables** (server-only - required for API routes):
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key  (only if using chatbot)
PGVECTOR_DIMENSION=1536  (only if using chatbot)
```

⚠️ **Important**: 
- Never commit service role keys or API keys to Git!
- These variables must be set BEFORE the first build, otherwise the build will fail
- You can set different values for Production, Preview, and Development environments
- After adding variables, trigger a new deploy

### 3.4 Deploy

1. Click **Deploy**
2. Wait for build to complete (2-5 minutes)
3. Your site will be live at `https://your-project.vercel.app`

## Step 4: Configure Storage Bucket

### 4.1 Create Storage Bucket

1. Go to Supabase dashboard → **Storage**
2. Click **New bucket**
3. Name: `product-images`
4. **Public bucket**: ✅ (for public product images)
5. Click **Create bucket**

### 4.2 Set Up Storage Policies

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
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
```

4. Add policy for admin update/delete:

```sql
CREATE POLICY "Admin Manage" ON storage.objects
FOR ALL USING (
  bucket_id = 'product-images' AND
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
```

## Step 5: Post-Deployment

### 5.1 Test Storefront

1. Visit your deployed site
2. Browse products
3. Add items to cart
4. Complete checkout (creates PENDING order)

### 5.2 Test Admin Panel

1. Go to `/admin/login`
2. Log in with admin credentials from seed script
3. Verify you can:
   - View dashboard
   - Manage products
   - Update inventory
   - Create coupons
   - View analytics

### 5.3 Set Up Chatbot

1. In admin panel, go to **Chatbot**
2. Ingest product descriptions or FAQs:
   - Document Type: `product`
   - Document ID: Product UUID
   - Content: Product description or FAQ text
3. Test chatbot queries

### 5.4 Generate Analytics Data

If you want sample analytics:

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run traffic simulation
npm run simulate
```

## Step 6: Custom Domain (Optional)

1. In Vercel dashboard → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain name
4. Follow DNS configuration instructions
5. SSL certificate is automatically provisioned

## Step 7: Monitoring & Alerts

### 7.1 Vercel Logs

- View function logs: **Deployments** → Select deployment → **Functions** tab
- View build logs: **Deployments** → Select deployment → **Build Logs**
- Real-time logs: **Logs** tab in project dashboard

### 7.2 Supabase Logs

- Go to Supabase dashboard → **Logs**
- Monitor API requests, database queries, auth events

### 7.3 Error Tracking (Optional)

Consider integrating Sentry or similar:

1. Create Sentry project
2. Add `SENTRY_DSN` to Vercel environment variables
3. Install Sentry SDK in Next.js app

## Troubleshooting

### Build Fails

- Check Vercel build logs for errors
- Verify all environment variables are set
- Ensure Node.js version is 20+ (Vercel auto-detects from `package.json`)
- Verify `rootDirectory` is set to `app/storefront` in `vercel.json`
- If "next: command not found" error: Ensure `rootDirectory` is correctly set so dependencies install in the right location

### API Routes Not Working

- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
- Check function logs in Vercel dashboard
- Ensure RLS policies allow service role access
- Verify API routes are in `app/storefront/pages/api/` directory

### Chatbot Errors

- Verify `OPENAI_API_KEY` is set
- Check OpenAI API usage limits
- Review function logs for embedding errors

### Database Connection Issues

- Verify Supabase project is active
- Check API keys are correct
- Ensure RLS policies are configured

## CI/CD with GitHub

Vercel automatically deploys on:
- Push to `main` branch (production)
- Pull requests (preview deployments)

To customize:

1. Configure in Vercel dashboard → **Settings** → **Git**
2. Set up branch protection rules
3. Configure preview deployments for feature branches

## Rollback

If deployment fails:

1. Go to **Deployments** in Vercel dashboard
2. Find last successful deploy
3. Click **⋯** → **Promote to Production** to rollback

## Performance Optimization

1. **Enable ISR**: Use Next.js ISR for product pages
2. **CDN**: Vercel automatically uses global CDN
3. **Image Optimization**: Use Next.js Image component with Vercel's image optimization
4. **Database Indexes**: Already configured in schema.sql
5. **Edge Functions**: Consider using Vercel Edge Functions for low-latency API routes

## Security Checklist

- [ ] Service role key only in Vercel (never in client)
- [ ] RLS policies enabled on all tables
- [ ] Admin authentication required for admin routes
- [ ] Rate limiting on chatbot endpoint
- [ ] Security headers configured (CSP, HSTS)
- [ ] Environment variables secured in Vercel
- [ ] Storage bucket policies configured correctly

## Next Steps

- Set up custom domain
- Configure email notifications (Supabase Auth)
- Add payment gateway integration (Stripe, Razorpay)
- Set up monitoring and alerts
- Configure backup strategy

For more details, see [ARCHITECTURE.md](ARCHITECTURE.md) and [SECURITY.md](../SECURITY.md).

