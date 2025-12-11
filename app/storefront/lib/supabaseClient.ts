import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Server-side Supabase client (uses service role key)
export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side operations');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Types
export type Product = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  currency: string;
  attributes: Record<string, any> | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  position: number;
};

export type Inventory = {
  product_id: string;
  qty: number;
  reserved: number;
  updated_at: string;
};

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'PERCENT' | 'FIXED';
  discount_pct: number | null;
  discount_cents: number | null;
  active: boolean;
  applies_to_all: boolean;
  metadata: Record<string, any> | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  uses: number;
  created_at: string;
};

export type Order = {
  id: string;
  user_id: string | null;
  status: 'PENDING' | 'PAID' | 'FULFILLED' | 'CANCELLED' | 'REFUNDED';
  total_cents: number;
  currency: string;
  shipping: Record<string, any> | null;
  coupon_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  sku: string | null;
  name: string | null;
  unit_price_cents: number | null;
  qty: number | null;
  metadata: Record<string, any> | null;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'customer' | 'admin';
  created_at: string;
};

