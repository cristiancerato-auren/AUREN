-- AUREN Living commerce foundation
-- Apply only after a verified Supabase database backup.
-- Products can be supplied by external brands or by AUREN's own line.

create table if not exists public.living_products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  slug text not null unique,
  brand_type text not null check (brand_type in ('external','auren')),
  brand_name text,
  category text,
  description text,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= price),
  currency text not null default 'EUR' check (currency = 'EUR'),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  active boolean not null default false,
  featured boolean not null default false,
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.living_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  phone text,
  shipping_address jsonb not null,
  billing_address jsonb,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  shipping_total numeric(12,2) not null default 0 check (shipping_total >= 0),
  total numeric(12,2) not null check (total >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded','partially_refunded')),
  fulfillment_status text not null default 'unfulfilled' check (fulfillment_status in ('unfulfilled','processing','shipped','delivered','cancelled')),
  payment_provider text,
  provider_session_id text unique,
  tracking_code text,
  tracking_url text,
  customer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.living_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.living_orders(id) on delete cascade,
  product_id uuid references public.living_products(id) on delete set null,
  product_name text not null,
  sku text,
  brand_type text not null check (brand_type in ('external','auren')),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists living_products_active_category_idx on public.living_products(active, category);
create index if not exists living_orders_user_created_idx on public.living_orders(user_id, created_at desc);
create index if not exists living_order_items_order_idx on public.living_order_items(order_id);

-- Optional product variants (for example size, finish, colour or material).
-- A product can be sold without variants; variant stock is managed independently.
create table if not exists public.living_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.living_products(id) on delete cascade,
  sku text unique,
  name text not null,
  option_values jsonb not null default '{}'::jsonb check (jsonb_typeof(option_values) = 'object'),
  price_override numeric(12,2) check (price_override is null or price_override >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  active boolean not null default true,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, name)
);
create index if not exists living_product_variants_product_idx
  on public.living_product_variants(product_id, active);

-- Preserve the exact selected variant on each order, even if the catalogue changes later.
alter table public.living_order_items
  add column if not exists variant_id uuid references public.living_product_variants(id) on delete set null,
  add column if not exists variant_name text,
  add column if not exists variant_options jsonb not null default '{}'::jsonb
    check (jsonb_typeof(variant_options) = 'object');

create index if not exists living_order_items_variant_idx
  on public.living_order_items(variant_id);

alter table public.living_product_variants enable row level security;

drop policy if exists "Public can view active living product variants" on public.living_product_variants;
create policy "Public can view active living product variants"
on public.living_product_variants for select to anon, authenticated
using (active = true and exists (
  select 1 from public.living_products p
  where p.id = product_id and p.active = true
));

drop policy if exists "Admins manage living product variants" on public.living_product_variants;
create policy "Admins manage living product variants"
on public.living_product_variants for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'admin'));

-- Explicit grants: RLS remains the authority for row-level access.
revoke all on public.living_products, public.living_product_variants,
  public.living_orders, public.living_order_items from anon, authenticated;
grant select on public.living_products, public.living_product_variants to anon;
grant select, insert, update, delete on public.living_products,
  public.living_product_variants to authenticated;
grant select, update on public.living_orders to authenticated;
grant select on public.living_order_items to authenticated;
grant all on public.living_products, public.living_product_variants,
  public.living_orders, public.living_order_items to service_role;

alter table public.living_products enable row level security;
alter table public.living_orders enable row level security;
alter table public.living_order_items enable row level security;

drop policy if exists "Public can view active living products" on public.living_products;
create policy "Public can view active living products"
on public.living_products for select to anon, authenticated
using (active = true);

drop policy if exists "Admins manage living products" on public.living_products;
create policy "Admins manage living products"
on public.living_products for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'admin'));

drop policy if exists "Customers view own living orders" on public.living_orders;
create policy "Customers view own living orders"
on public.living_orders for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins manage living orders" on public.living_orders;
create policy "Admins manage living orders"
on public.living_orders for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'admin'));

drop policy if exists "Customers view own living order items" on public.living_order_items;
create policy "Customers view own living order items"
on public.living_order_items for select to authenticated
using (exists (select 1 from public.living_orders o where o.id = order_id and o.user_id = auth.uid()));

drop policy if exists "Admins manage living order items" on public.living_order_items;
create policy "Admins manage living order items"
on public.living_order_items for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'admin'));

-- No client-side INSERT policy on orders/items: checkout must be created server-side
-- after recalculating prices and stock, and payment confirmation must use a verified webhook.
