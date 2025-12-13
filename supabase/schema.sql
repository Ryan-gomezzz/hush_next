-- Hush Gentle Ecommerce - Supabase/Postgres Schema (public)
-- This file intentionally mirrors `db/schema.sql` so Supabase dashboard setup
-- can point to `supabase/schema.sql` (SQL Editor does not support `\i`).

begin;

create extension if not exists "uuid-ossp";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'INR',
  image_url text,
  is_active boolean not null default true,
  inventory_count integer not null default 0 check (inventory_count >= 0),
  ingredients text,
  usage text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_products_is_active on public.products(is_active);

create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create table if not exists public.carts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'ordered', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_carts_user_id on public.carts(user_id);
create index if not exists idx_carts_status on public.carts(status);

create trigger trg_carts_updated_at
before update on public.carts
for each row execute function public.set_updated_at();

create table if not exists public.cart_items (
  id uuid primary key default uuid_generate_v4(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

create index if not exists idx_cart_items_cart_id on public.cart_items(cart_id);
create index if not exists idx_cart_items_product_id on public.cart_items(product_id);

create trigger trg_cart_items_updated_at
before update on public.cart_items
for each row execute function public.set_updated_at();

create table if not exists public.wishlists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_wishlists_user_id on public.wishlists(user_id);

create trigger trg_wishlists_updated_at
before update on public.wishlists
for each row execute function public.set_updated_at();

create table if not exists public.wishlist_items (
  id uuid primary key default uuid_generate_v4(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wishlist_id, product_id)
);

create index if not exists idx_wishlist_items_wishlist_id on public.wishlist_items(wishlist_id);
create index if not exists idx_wishlist_items_product_id on public.wishlist_items(product_id);

create trigger trg_wishlist_items_updated_at
before update on public.wishlist_items
for each row execute function public.set_updated_at();

create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'failed')),
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);

create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);

create trigger trg_order_items_updated_at
before update on public.order_items
for each row execute function public.set_updated_at();

create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  provider text not null,
  provider_order_id text,
  provider_payment_id text,
  status text not null default 'created' check (status in ('created', 'authorized', 'captured', 'failed')),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'INR',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_provider on public.payments(provider);
create index if not exists idx_payments_status on public.payments(status);

create trigger trg_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create table if not exists public.testimonials (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  content text not null,
  rating integer not null check (rating between 1 and 5),
  is_approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_testimonials_is_approved on public.testimonials(is_approved);

create trigger trg_testimonials_updated_at
before update on public.testimonials
for each row execute function public.set_updated_at();

create table if not exists public.amazon_reviews (
  id uuid primary key default uuid_generate_v4(),
  asin text,
  author text,
  rating integer not null check (rating between 1 and 5),
  title text,
  content text,
  review_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_amazon_reviews_asin on public.amazon_reviews(asin);

create trigger trg_amazon_reviews_updated_at
before update on public.amazon_reviews
for each row execute function public.set_updated_at();

create table if not exists public.analytics_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete set null,
  session_id text,
  event_name text not null,
  path text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_created_at on public.analytics_events(created_at);
create index if not exists idx_analytics_events_event_name on public.analytics_events(event_name);
create index if not exists idx_analytics_events_user_id on public.analytics_events(user_id);

create table if not exists public.chatbot_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chatbot_sessions_user_id on public.chatbot_sessions(user_id);

create trigger trg_chatbot_sessions_updated_at
before update on public.chatbot_sessions
for each row execute function public.set_updated_at();

create table if not exists public.chatbot_messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.chatbot_sessions(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  provider text,
  created_at timestamptz not null default now()
);

create index if not exists idx_chatbot_messages_session_id on public.chatbot_messages(session_id);
create index if not exists idx_chatbot_messages_created_at on public.chatbot_messages(created_at);

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.testimonials enable row level security;
alter table public.amazon_reviews enable row level security;
alter table public.analytics_events enable row level security;
alter table public.chatbot_sessions enable row level security;
alter table public.chatbot_messages enable row level security;

drop policy if exists "users_select_self" on public.users;
create policy "users_select_self" on public.users
for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "users_insert_self" on public.users;
create policy "users_insert_self" on public.users
for insert
with check (id = auth.uid() or public.is_admin());

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self" on public.users
for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles
for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_self_or_admin" on public.profiles;
create policy "profiles_insert_self_or_admin" on public.profiles
for insert
with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin" on public.profiles
for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
for select using (true);

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
for select using (true);

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "carts_owner_access" on public.carts;
create policy "carts_owner_access" on public.carts
for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "cart_items_owner_access" on public.cart_items;
create policy "cart_items_owner_access" on public.cart_items
for all
using (
  exists (
    select 1 from public.carts c
    where c.id = cart_items.cart_id
      and (c.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.carts c
    where c.id = cart_items.cart_id
      and (c.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "wishlists_owner_access" on public.wishlists;
create policy "wishlists_owner_access" on public.wishlists
for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "wishlist_items_owner_access" on public.wishlist_items;
create policy "wishlist_items_owner_access" on public.wishlist_items
for all
using (
  exists (
    select 1 from public.wishlists w
    where w.id = wishlist_items.wishlist_id
      and (w.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.wishlists w
    where w.id = wishlist_items.wishlist_id
      and (w.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "orders_owner_read" on public.orders;
create policy "orders_owner_read" on public.orders
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders_owner_insert" on public.orders;
create policy "orders_owner_insert" on public.orders
for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders_owner_update_limited" on public.orders;
create policy "orders_owner_update_limited" on public.orders
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "order_items_owner_access" on public.order_items;
create policy "order_items_owner_access" on public.order_items
for all
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (o.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (o.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "payments_owner_read" on public.payments;
create policy "payments_owner_read" on public.payments
for select
using (
  public.is_admin() or
  exists (
    select 1 from public.orders o
    where o.id = payments.order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "payments_admin_write" on public.payments;
create policy "payments_admin_write" on public.payments
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "testimonials_public_read" on public.testimonials;
create policy "testimonials_public_read" on public.testimonials
for select using (true);

drop policy if exists "testimonials_admin_write" on public.testimonials;
create policy "testimonials_admin_write" on public.testimonials
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "amazon_reviews_public_read" on public.amazon_reviews;
create policy "amazon_reviews_public_read" on public.amazon_reviews
for select using (true);

drop policy if exists "amazon_reviews_admin_write" on public.amazon_reviews;
create policy "amazon_reviews_admin_write" on public.amazon_reviews
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "analytics_events_insert_anyone" on public.analytics_events;
create policy "analytics_events_insert_anyone" on public.analytics_events
for insert
with check (true);

drop policy if exists "analytics_events_admin_read" on public.analytics_events;
create policy "analytics_events_admin_read" on public.analytics_events
for select
using (public.is_admin());

drop policy if exists "chatbot_sessions_insert_anyone" on public.chatbot_sessions;
create policy "chatbot_sessions_insert_anyone" on public.chatbot_sessions
for insert
with check (true);

drop policy if exists "chatbot_sessions_admin_read" on public.chatbot_sessions;
create policy "chatbot_sessions_admin_read" on public.chatbot_sessions
for select
using (public.is_admin());

drop policy if exists "chatbot_messages_insert_anyone" on public.chatbot_messages;
create policy "chatbot_messages_insert_anyone" on public.chatbot_messages
for insert
with check (true);

drop policy if exists "chatbot_messages_admin_read" on public.chatbot_messages;
create policy "chatbot_messages_admin_read" on public.chatbot_messages
for select
using (public.is_admin());

commit;


