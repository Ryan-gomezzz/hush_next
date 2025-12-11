# Deployment Guide

This guide covers deploying the SOYL Supabase Ecommerce Demo to production.

## Prerequisites

- Supabase project (free tier or higher)
- Netlify account
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

## Step 3: Netlify Deployment

### 3.1 Connect Repository

1. Go to [Netlify](https://netlify.com) and sign in
2. Click **Add new site** → **Import an existing project**
3. Connect your GitHub repository
4. Select the repository

### 3.2 Configure Build Settings

Netlify should auto-detect Next.js. The `netlify.toml` is already configured, but verify these settings in Netlify UI:

- **Build command**: `cd app/storefront && npm install && npm run build`
- **Publish directory**: `app/storefront/.next`
- **Base directory**: `.` (root of repository)

**Important**: The Netlify Next.js plugin (`@netlify/plugin-nextjs`) is configured in `netlify.toml` and will be automatically installed during build. This plugin is required for proper Next.js routing on Netlify.

### 3.3 Set Environment Variables

**CRITICAL**: These environment variables MUST be set in Netlify before building, as Next.js needs them during the build process.

In Netlify dashboard → **Site settings** → **Environment variables** → **Edit variables**, add:

**Public variables** (exposed to client - required for build):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Private variables** (server-only - required for Netlify Functions):
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
PGVECTOR_DIMENSION=1536
```

⚠️ **Important**: 
- Never commit service role keys or API keys to Git!
- These variables must be set BEFORE the first build, otherwise the build will fail
- After adding variables, trigger a new deploy

### 3.4 Deploy

1. Click **Deploy site**
2. Wait for build to complete (5-10 minutes)
3. Your site will be live at `https://your-site.netlify.app`

## Step 4: Post-Deployment

### 4.1 Test Storefront

1. Visit your deployed site
2. Browse products
3. Add items to cart
4. Complete checkout (creates PENDING order)

### 4.2 Test Admin Panel

1. Go to `/admin/login`
2. Log in with admin credentials from seed script
3. Verify you can:
   - View dashboard
   - Manage products
   - Update inventory
   - Create coupons
   - View analytics

### 4.3 Set Up Chatbot

1. In admin panel, go to **Chatbot**
2. Ingest product descriptions or FAQs:
   - Document Type: `product`
   - Document ID: Product UUID
   - Content: Product description or FAQ text
3. Test chatbot queries

### 4.4 Generate Analytics Data

If you want sample analytics:

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run traffic simulation
npm run simulate
```

## Step 5: Custom Domain (Optional)

1. In Netlify dashboard → **Domain settings**
2. Click **Add custom domain**
3. Follow DNS configuration instructions
4. SSL certificate is automatically provisioned

## Step 6: Monitoring & Alerts

### 6.1 Netlify Logs

- View function logs: **Functions** → Select function → **Logs**
- View build logs: **Deploys** → Select deploy → **Deploy log**

### 6.2 Supabase Logs

- Go to Supabase dashboard → **Logs**
- Monitor API requests, database queries, auth events

### 6.3 Error Tracking (Optional)

Consider integrating Sentry or similar:

1. Create Sentry project
2. Add `SENTRY_DSN` to Netlify environment variables
3. Install Sentry SDK in Next.js app

## Troubleshooting

### Build Fails

- Check Netlify build logs for errors
- Verify all environment variables are set
- Ensure Node.js version is 20+ (set in `netlify.toml`)

### Functions Not Working

- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Netlify
- Check function logs for authentication errors
- Ensure RLS policies allow service role access

### Chatbot Errors

- Verify `OPENAI_API_KEY` is set
- Check OpenAI API usage limits
- Review function logs for embedding errors

### Database Connection Issues

- Verify Supabase project is active
- Check API keys are correct
- Ensure RLS policies are configured

## CI/CD with GitHub

Netlify automatically deploys on:
- Push to `main` branch (production)
- Pull requests (preview deployments)

To customize:

1. Create `netlify.toml` (already included)
2. Configure branch deploys in Netlify dashboard
3. Set up deploy contexts for staging/production

## Rollback

If deployment fails:

1. Go to **Deploys** in Netlify dashboard
2. Find last successful deploy
3. Click **Publish deploy** to rollback

## Performance Optimization

1. **Enable ISR**: Use Next.js ISR for product pages
2. **CDN**: Netlify automatically uses CDN
3. **Image Optimization**: Use Next.js Image component
4. **Database Indexes**: Already configured in schema.sql

## Security Checklist

- [ ] Service role key only in Netlify (never in client)
- [ ] RLS policies enabled on all tables
- [ ] Admin authentication required for admin routes
- [ ] Rate limiting on chatbot endpoint
- [ ] Security headers configured (CSP, HSTS)
- [ ] Environment variables secured in Netlify

## Next Steps

- Set up custom domain
- Configure email notifications (Supabase Auth)
- Add payment gateway integration (Stripe, Razorpay)
- Set up monitoring and alerts
- Configure backup strategy

For more details, see [ARCHITECTURE.md](ARCHITECTURE.md) and [SECURITY.md](../SECURITY.md).

