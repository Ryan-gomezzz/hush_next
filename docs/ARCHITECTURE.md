# Architecture Documentation

## System Overview

The SOYL Supabase Ecommerce Demo is a full-stack ecommerce application with the following architecture:

```
┌─────────────────┐
│   Client (Web)  │
│   Next.js App   │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  Supabase       │  │  Vercel         │
│  (Database +    │  │  (Next.js API   │
│   Auth +        │  │   Routes)       │
│   Storage)      │  │                 │
└────────┬────────┘  └────────┬────────┘
         │                    │
         │                    │
         └──────────┬──────────┘
                    │
                    ▼
         ┌──────────────────┐
         │   OpenAI API      │
         │   (Embeddings +   │
         │    Chat Completions)│
         └──────────────────┘
```

## Components

### 1. Next.js Frontend (`app/storefront/`)

**Technology**: Next.js 14 with TypeScript, Tailwind CSS

**Pages**:
- `/` - Product listing (storefront)
- `/product/[slug]` - Product detail page
- `/checkout` - Checkout flow
- `/admin/*` - Admin panel (protected routes)

**Features**:
- Server-side rendering (SSR) for SEO
- Client-side state management (localStorage for cart)
- Supabase Auth integration
- Responsive design with Tailwind CSS

### 2. Supabase Backend

**Database**: PostgreSQL with pgvector extension

**Tables**:
- `profiles` - User profiles with role-based access
- `products` - Product catalog
- `product_images` - Product images (references Supabase Storage)
- `inventory` - Stock management
- `coupons` - Discount codes
- `orders` - Customer orders
- `order_items` - Order line items
- `events` - Analytics events
- `embeddings` - Vector embeddings for RAG

**Security**: Row Level Security (RLS) policies enforce data access

**Services**:
- **Auth**: User authentication and session management
- **Storage**: Product images and file uploads
- **Realtime**: (Optional) Real-time updates for inventory/orders

### 3. Next.js API Routes

Server-side API endpoints in `app/storefront/pages/api/`:

- `products.ts` - Product CRUD (admin only)
- `checkout.ts` - Order creation with inventory reservation
- `coupons.ts` - Coupon validation and management
- `admin/metrics.ts` - Analytics queries (admin only)
- `chatbot/query.ts` - RAG chatbot endpoint
- `chatbot/ingest.ts` - Document ingestion (admin only)

**Why Next.js API Routes?**
- Integrated with Next.js framework
- Access to service role key (never exposed to client)
- Automatic scaling via Vercel serverless functions
- Built-in TypeScript support

### 4. Supabase Edge Functions

Optional Deno-based functions for embedding operations:

- `ingest_embeddings.js` - Document ingestion with chunking
- `chatbot_query.js` - RAG query with vector search

**Note**: Next.js API routes are deployed as Vercel serverless functions automatically.

## Data Flow

### Product Listing Flow

```
User → Next.js Page → Supabase Client (anon key)
                    → products table (RLS: public read)
                    → product_images table
                    → inventory table
                    → Render products
```

### Checkout Flow

```
User → Checkout Page → Next.js API Route (/api/checkout)
                    → Verify inventory (service role)
                    → Create order (RLS: authenticated)
                    → Reserve inventory
                    → Update coupon usage
                    → Return order ID
```

### Admin Product Management

```
Admin → Admin Page → Next.js API Route (/api/products)
                  → Verify admin role (service role)
                  → CRUD operations (RLS: admin only)
                  → Update Supabase Storage (images)
                  → Return result
```

### Chatbot RAG Flow

```
User → Chatbot UI → Next.js API Route (/api/chatbot/query)
                  → Create query embedding (OpenAI)
                  → Vector search in embeddings table (pgvector)
                  → Retrieve top-K similar documents
                  → Build context prompt
                  → Call OpenAI ChatCompletion
                  → Return answer + product suggestions
```

### Document Ingestion Flow

```
Admin → Admin Panel → Next.js API Route (/api/chatbot/ingest)
                   → Verify admin role
                   → Chunk document text
                   → Create embeddings (OpenAI, batch)
                   → Insert into embeddings table (pgvector)
                   → Return success
```

## Security Architecture

### Authentication

1. **Client-side**: Supabase Auth handles login/signup
2. **Server-side**: JWT tokens verified in Next.js API routes
3. **Admin check**: Profile role verified via `is_admin()` function

### Authorization

**Row Level Security (RLS)**:
- Public: Read products, product_images
- Authenticated: Create orders, insert events
- Admin: Full access to all tables

**API Authorization**:
- Next.js API routes check admin role before privileged operations
- Service role key only used server-side

### Data Protection

- Service role key never exposed to client
- API keys stored in Vercel environment variables
- RLS policies enforce database-level access control
- Input validation on all API endpoints

## RAG (Retrieval Augmented Generation) Pipeline

### 1. Ingestion

```
Document → Chunking → OpenAI Embeddings API → pgvector storage
```

- Documents chunked into ~1000 character pieces
- Overlap of 200 characters for context preservation
- Embeddings stored as 1536-dimensional vectors
- Metadata includes doc_type, doc_id, chunk_index

### 2. Query

```
User Query → Embedding → Vector Search → Context Retrieval → LLM → Answer
```

- User query converted to embedding
- Vector similarity search (cosine distance)
- Top-K most similar chunks retrieved
- Context + query sent to OpenAI ChatCompletion
- Answer returned with product suggestions

### 3. Vector Search

Uses pgvector's `ivfflat` index for fast approximate nearest neighbor search:

```sql
SELECT * FROM embeddings
ORDER BY embedding <=> query_embedding
LIMIT 5;
```

## Analytics Architecture

### Event Tracking

Events stored in `events` table:
- `page_view` - Product page views
- `add_to_cart` - Cart additions
- `checkout_started` - Checkout initiation
- `order_completed` - Order creation
- `chatbot_query` - Chatbot interactions

### Analytics Views

**daily_events**: Aggregated events by day and type
**daily_conversion**: Conversion rate calculation (orders / pageviews)
**top_products_last_30d**: Best-selling products

### Materialized Views

`daily_conversion` is materialized for performance. Refresh with:

```sql
REFRESH MATERIALIZED VIEW daily_conversion;
```

## Scalability Considerations

### Database

- Indexes on frequently queried columns (slug, created_at, etc.)
- pgvector index for fast similarity search
- Connection pooling (Supabase handles this)

### Application

- Next.js ISR for product pages (cache static content)
- Vercel serverless functions auto-scale
- CDN for static assets (Vercel Edge Network)

### Embeddings

- Batch processing for large documents
- Rate limiting on OpenAI API calls
- Chunking to manage token limits

## Performance Optimizations

1. **Database Indexes**: All foreign keys and frequently queried columns indexed
2. **Vector Index**: ivfflat index for fast ANN search
3. **Caching**: Next.js static generation for product pages
4. **CDN**: Vercel Edge Network for static assets
5. **Batch Operations**: Embeddings created in batches to avoid rate limits

## Monitoring & Observability

### Logs

- **Vercel**: Function logs, build logs
- **Supabase**: Database logs, API logs, auth logs
- **OpenAI**: API usage dashboard

### Metrics

- Pageviews tracked in `events` table
- Conversion rates calculated in materialized views
- Admin dashboard shows key metrics

### Alerts (Recommended)

- Low inventory alerts (webhook to Slack/email)
- Failed order creation alerts
- OpenAI API rate limit warnings

## Future Enhancements

1. **Payment Gateway**: Integrate Stripe/Razorpay for order payment
2. **Email Notifications**: Order confirmations, shipping updates
3. **Real-time Updates**: Supabase Realtime for inventory changes
4. **Advanced Analytics**: Funnel analysis, cohort analysis
5. **Multi-language**: i18n support for international markets
6. **Mobile App**: React Native app using same Supabase backend

## Technology Choices Rationale

- **Next.js**: SSR/SSG, excellent DX, built-in optimizations
- **Supabase**: Managed Postgres, Auth, Storage, RLS built-in
- **Vercel**: Easy deployment, serverless functions, Edge Network
- **OpenAI**: High-quality embeddings and chat completions
- **pgvector**: Native Postgres vector search, no external service needed
- **TypeScript**: Type safety, better DX, fewer runtime errors

For security details, see [SECURITY.md](../SECURITY.md).

