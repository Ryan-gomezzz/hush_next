# Quick Setup Guide

This guide will help you get the application running quickly.

## Prerequisites

- Node.js 20+ installed
- A Supabase account (free tier works)
- An OpenAI API key (for chatbot features)

## Step 1: Clone and Install

```bash
git clone https://github.com/Ryan-gomezzz/hush_next.git
cd hush_next
npm install
cd app/storefront && npm install && cd ../..
```

## Step 2: Set Up Supabase

### 2.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Fill in:
   - **Name**: `hush-ecommerce` (or any name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose `asia-south1` (Mumbai) or nearest
4. Wait 2-3 minutes for project to be created

### 2.2 Apply Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Open `supabase/schema.sql` from this repository
3. Copy the entire SQL content
4. Paste into SQL Editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Wait for success message

### 2.3 Run Migrations

1. In SQL Editor, run `supabase/migrations/002_vector_search_function.sql`
2. Run `supabase/migrations/003_inventory_functions.sql`

### 2.4 Enable pgvector Extension

1. Go to **Database** → **Extensions**
2. Search for `vector`
3. Click **Enable**

**Note**: If pgvector is not available, you may need to upgrade to Pro plan or use self-hosted Postgres.

### 2.5 Get API Keys

1. Go to **Settings** → **API**
2. Copy these values (you'll need them in Step 3):
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)
   - **service_role** key (long string, keep this secret!)

## Step 3: Configure Environment Variables

### 3.1 Create `.env.local` File

In the root directory, create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
OPENAI_API_KEY=sk-your-openai-api-key-here
PGVECTOR_DIMENSION=1536
```

Replace the placeholder values with your actual keys from Step 2.5.

### 3.2 Get OpenAI API Key (Optional - for chatbot)

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign in or create account
3. Go to **API Keys**
4. Click **Create new secret key**
5. Copy the key (starts with `sk-`)

**Note**: Chatbot features require OpenAI API key. You can skip this for now if you only want to test the storefront.

## Step 4: Seed the Database

Run the seed script to create sample data:

```bash
npm run seed
```

This will:
- Create 10 sample cosmetics products
- Create an admin user:
  - Email: `admin@soyl.test`
  - Password: `Admin@123!`
- Create sample coupons

**Important**: Change the admin password after first login!

## Step 5: Start Development Server

```bash
npm run dev
```

Visit:
- **Storefront**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin/login

## Step 6: Test the Application

1. **Storefront**:
   - Browse products on homepage
   - Click a product to see details
   - Add items to cart
   - Go to checkout (creates PENDING order)

2. **Admin Panel**:
   - Login with: `admin@soyl.test` / `Admin@123!`
   - View dashboard
   - Manage products
   - Update inventory
   - Create coupons
   - View analytics

## Troubleshooting

### "Failed to fetch" Error

This means Supabase is not configured. Check:
- `.env.local` file exists and has correct values
- Supabase project is active (not paused)
- Environment variables are spelled correctly

### "Missing Supabase environment variables"

- Verify `.env.local` file is in the root directory
- Restart the development server after creating `.env.local`
- Check that variable names match exactly (case-sensitive)

### Database Errors

- Verify you ran `supabase/schema.sql` completely
- Check Supabase dashboard → Table Editor to see if tables exist
- Review SQL Editor for any error messages

### Build Errors

- Ensure all environment variables are set
- Check Node.js version is 20+
- Clear `.next` folder and rebuild: `rm -rf app/storefront/.next && npm run build`

## Next Steps

- Deploy to Vercel (see `docs/DEPLOYMENT.md`)
- Set up custom domain
- Configure email notifications
- Add payment gateway integration

## Need Help?

- Check `README.md` for detailed documentation
- Review `docs/DEPLOYMENT.md` for deployment help
- See `supabase/README_SUPABASE.md` for Supabase-specific issues

