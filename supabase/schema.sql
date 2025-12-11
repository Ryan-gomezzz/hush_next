-- Enable pgvector extension (supabase supports pgvector on managed plans)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users handled by supabase.auth; add profile table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id),
  email text,
  full_name text,
  role text DEFAULT 'customer', -- values: customer, admin
  created_at timestamptz DEFAULT now()
);

-- Products
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  price_cents integer NOT NULL,
  currency text DEFAULT 'INR',
  attributes jsonb,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Product images
CREATE TABLE product_images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt text,
  position integer DEFAULT 0
);

-- Inventory
CREATE TABLE inventory (
  product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  qty integer DEFAULT 0 NOT NULL,
  reserved integer DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Coupons
CREATE TABLE coupons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text NOT NULL, -- 'PERCENT' | 'FIXED'
  discount_pct integer,
  discount_cents integer,
  active boolean DEFAULT true,
  applies_to_all boolean DEFAULT true,
  metadata jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  uses integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Orders & items
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id),
  status text DEFAULT 'PENDING', -- PENDING | PAID | FULFILLED | CANCELLED | REFUNDED
  total_cents integer NOT NULL,
  currency text DEFAULT 'INR',
  shipping jsonb,
  coupon_id uuid REFERENCES coupons(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid,
  sku text,
  name text,
  unit_price_cents integer,
  qty integer,
  metadata jsonb
);

-- Events (analytics)
CREATE TABLE events (
  event_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- Embeddings (pgvector)
-- Choose dimension 1536 by default for OpenAI ada/other embeddings; make configurable
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    CREATE EXTENSION vector;
  END IF;
END$$;

CREATE TABLE embeddings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  doc_type text,            -- 'product', 'faq', 'manual', etc.
  doc_id uuid,              -- product id or other doc id
  embedding vector(1536),   -- adjust dimension per embedding provider
  content text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index for fast ANN search
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- Row Level Security (RLS) — enable and policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Policy: allow anon to select products & product_images
CREATE POLICY "anon_can_read_products" ON products
  FOR SELECT USING (true);

CREATE POLICY "anon_can_read_product_images" ON product_images
  FOR SELECT USING (true);

-- Policy: authenticated users can insert orders and events
CREATE POLICY "auth_can_insert_orders" ON orders
  FOR INSERT USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_can_insert_events" ON events
  FOR INSERT USING (auth.role() = 'authenticated' OR auth.role() = 'anon')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Admin policies: only allow users with role = 'admin' in profiles to modify admin tables
-- Helper function to check admin claim (we'll use profiles.role)
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT exists (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin');
$$ LANGUAGE SQL STABLE;

CREATE POLICY "admin_can_modify_products" ON products
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_can_modify_coupons" ON coupons
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_can_modify_inventory" ON inventory
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_can_see_orders" ON orders
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Allow users to SELECT their own orders
CREATE POLICY "users_can_select_own_orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Admin can modify product_images
CREATE POLICY "admin_can_modify_product_images" ON product_images
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Admin can see all events
CREATE POLICY "admin_can_see_events" ON events
  FOR SELECT USING (is_admin());

-- Users can see their own profile
CREATE POLICY "users_can_see_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (but not role)
CREATE POLICY "users_can_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- Admin can see all profiles
CREATE POLICY "admin_can_see_all_profiles" ON profiles
  FOR SELECT USING (is_admin());

-- Admin can modify profiles (including role)
CREATE POLICY "admin_can_modify_profiles" ON profiles
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- Admin can manage embeddings
CREATE POLICY "admin_can_manage_embeddings" ON embeddings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Allow anon to read embeddings (for chatbot queries)
CREATE POLICY "anon_can_read_embeddings" ON embeddings
  FOR SELECT USING (true);

-- NOTE: auth.uid() returns uuid; ensure proper casting in policies

-- Sample view for analytics: daily events
CREATE OR REPLACE VIEW daily_events AS
SELECT
  date_trunc('day', created_at) as day,
  event_type,
  count(*) as event_count
FROM events
GROUP BY 1,2;

-- Materialized view for conversion (simple example)
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_conversion AS
SELECT
  date_trunc('day', created_at) as day,
  SUM(CASE WHEN event_type = 'order_completed' THEN 1 ELSE 0 END) as orders,
  SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) as page_views,
  CASE WHEN SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) = 0 THEN 0
       ELSE ROUND( SUM(CASE WHEN event_type = 'order_completed' THEN 1 ELSE 0 END) * 100.0 / SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END), 2)
  END AS conversion_pct
FROM events
GROUP BY date_trunc('day', created_at);

-- View: top_products_last_30d
CREATE OR REPLACE VIEW top_products_last_30d AS
SELECT 
  oi.product_id, 
  p.name, 
  SUM(oi.qty) as sold_qty
FROM order_items oi 
JOIN orders o ON oi.order_id = o.id 
JOIN products p ON oi.product_id = p.id
WHERE o.created_at > now() - interval '30 days'
  AND o.status != 'CANCELLED'
GROUP BY oi.product_id, p.name
ORDER BY sold_qty DESC 
LIMIT 10;

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events (created_at);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events (event_type);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_doc_type ON embeddings (doc_type);
CREATE INDEX IF NOT EXISTS idx_embeddings_doc_id ON embeddings (doc_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

