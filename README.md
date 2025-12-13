# SOYL Supabase Ecommerce Demo

A complete ecommerce demo application built with Next.js, Supabase, and Vercel. Features a customer storefront, admin panel, and AI-powered chatbot with RAG (Retrieval Augmented Generation).

## Features

- **Customer Storefront**: Product catalog, product pages, shopping cart, checkout
- **Admin Panel**: Product management, inventory tracking, coupon management, analytics dashboard
- **AI Chatbot**: RAG-powered chatbot using OpenAI embeddings and pgvector
- **Analytics**: Pageviews, conversion tracking, top products, coupon usage
- **Security**: Row Level Security (RLS), admin authentication, secure API endpoints

## Tech Stack

- **Frontend**: Next.js 14 (TypeScript), Tailwind CSS
- **Backend**: Supabase (Postgres + Auth + Storage + pgvector)
- **Hosting**: Vercel (Next.js + Serverless Functions)
- **AI**: OpenAI (embeddings + chat completions)
- **Database**: PostgreSQL with pgvector extension

## Quick Start

### Prerequisites

- Node.js 20+
- Supabase account (free tier works)
- OpenAI API key
- Vercel account (for deployment)

### Local Development

1. **Clone and install dependencies**

```bash
git clone <repo-url>
cd soyl-supabase-demo
npm install
cd app/storefront && npm install
```

2. **Set up Supabase**

   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Note your project URL and anon key
   - Go to SQL Editor and run `supabase/schema.sql`
   - Run migration: `supabase/migrations/002_vector_search_function.sql`

3. **Configure environment variables**

   Create `.env.local` in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
PGVECTOR_DIMENSION=1536
```

4. **Seed the database**

```bash
npm run seed
```

This creates 10 sample cosmetics products and an admin user:
- Email: `admin@soyl.test`
- Password: `Admin@123!`

5. **Generate sample analytics data**

```bash
npm run simulate
```

6. **Start development server**

```bash
npm run dev
```

Visit `http://localhost:3000` for the storefront and `http://localhost:3000/admin` for the admin panel.

## Project Structure

```
soyl-supabase-demo/
├── app/storefront/          # Next.js application
│   ├── pages/               # Pages (storefront + admin)
│   ├── components/          # React components
│   ├── lib/                 # Utilities (Supabase client)
│   └── styles/              # Global styles
├── supabase/
│   ├── schema.sql          # Complete database schema
│   ├── migrations/         # SQL migrations
│   ├── functions/          # Supabase Edge Functions
│   └── seed/               # Seed scripts
├── app/storefront/pages/api/  # Next.js API routes (server-side APIs)
├── scripts/                # Utility scripts
└── docs/                   # Documentation
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Set Root Directory to `app/storefront` in Vercel project settings
3. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
   - `OPENAI_API_KEY` (server-only)
3. Deploy!

## Usage

### Storefront

- Browse products on the homepage
- View product details by clicking on a product
- Add items to cart (stored in localStorage)
- Checkout creates an order with status `PENDING`

### Admin Panel

Access at `/admin/login` with admin credentials.

**Products**: Create, edit, and manage products
**Inventory**: Update stock quantities
**Coupons**: Create discount codes (percentage or fixed amount)
**Analytics**: View pageviews, conversion rates, top products
**Chatbot**: Ingest documents and chat with AI assistant

### Chatbot

The chatbot uses RAG (Retrieval Augmented Generation):

1. **Ingest documents**: Upload product descriptions, FAQs, or manuals via admin panel
2. **Query**: Ask questions about products or store policies
3. **Response**: AI answers using relevant context from ingested documents

## Environment Variables

| Variable | Description | Client/Server |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Both |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Both |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin operations) | Server only |
| `OPENAI_API_KEY` | OpenAI API key | Server only |
| `PGVECTOR_DIMENSION` | Vector dimension (default: 1536) | Server only |

## Security

- All database access uses Row Level Security (RLS)
- Admin operations require authentication and role check
- Service role key never exposed to client
- Rate limiting on chatbot endpoint
- Security headers (CSP, HSTS) configured

See [SECURITY.md](SECURITY.md) for detailed security practices.

## Documentation

- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Deployment guide
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture
- [SECURITY.md](SECURITY.md) - Security best practices
- [supabase/README_SUPABASE.md](supabase/README_SUPABASE.md) - Supabase setup

## Troubleshooting

### pgvector extension not available

If you see errors about the `vector` extension:
- Ensure your Supabase plan supports pgvector (Pro plan or higher)
- Or use a self-hosted Postgres instance with pgvector

### Chatbot not working

- Verify `OPENAI_API_KEY` is set correctly
- Check that embeddings have been ingested (admin panel)
- Review Vercel function logs for errors

### RLS policy errors

- Ensure you've run `supabase/schema.sql` completely
- Check that admin user has `role = 'admin'` in profiles table

## License

MIT

## Support

For issues and questions, please open a GitHub issue.

