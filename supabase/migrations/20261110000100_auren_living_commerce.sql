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


-- Checkout reservations are created only by the trusted server-side function.
alter table public.living_orders
  add column if not exists reservation_expires_at timestamptz;

create or replace function public.create_living_order_reservation(
  p_customer_name text,
  p_customer_email text,
  p_phone text,
  p_shipping_address jsonb,
  p_billing_address jsonb,
  p_customer_note text,
  p_shipping_total numeric,
  p_user_id uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  v_product public.living_products%rowtype;
  v_variant public.living_product_variants%rowtype;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_unit_price numeric(12,2);
  v_variant_name text;
  v_variant_options jsonb;
  v_subtotal numeric(12,2) := 0;
  v_order_id uuid;
  v_order_number bigint;
  v_items jsonb := '[]'::jsonb;
begin
  if coalesce(length(trim(p_customer_name)),0) = 0
     or coalesce(length(trim(p_customer_email)),0) = 0
     or p_shipping_address is null
     or jsonb_typeof(p_shipping_address) <> 'object'
     or p_shipping_total is null or p_shipping_total < 0
     or p_items is null
     or jsonb_typeof(p_items) is distinct from 'array'
     or case when jsonb_typeof(p_items) = 'array' then jsonb_array_length(p_items) else 0 end = 0
     or case when jsonb_typeof(p_items) = 'array' then jsonb_array_length(p_items) else 0 end > 50 then
    raise exception 'Dati ordine non validi';
  end if;

  -- Stable lock order avoids deadlocks when carts contain multiple products.
  for item in
    select value
    from jsonb_array_elements(p_items)
    order by value->>'product_id', coalesce(value->>'variant_id','')
  loop
    v_product_id := (item->>'product_id')::uuid;
    v_variant_id := nullif(item->>'variant_id','')::uuid;
    v_quantity := (item->>'quantity')::integer;
    if v_quantity is null or v_quantity < 1 or v_quantity > 25 then
      raise exception 'Quantità non valida';
    end if;

    select * into v_product
    from public.living_products
    where id = v_product_id and active = true
    for update;
    if not found then raise exception 'Prodotto non disponibile'; end if;

    v_variant := null;
    v_variant_name := null;
    v_variant_options := '{}'::jsonb;
    if v_variant_id is not null then
      select * into v_variant
      from public.living_product_variants
      where id = v_variant_id and product_id = v_product_id and active = true
      for update;
      if not found then raise exception 'Variante non disponibile'; end if;
      if v_variant.stock_quantity < v_quantity then raise exception 'Disponibilità variante insufficiente'; end if;
      v_unit_price := coalesce(v_variant.price_override, v_product.price);
      v_variant_name := v_variant.name;
      v_variant_options := v_variant.option_values;
      update public.living_product_variants
      set stock_quantity = stock_quantity - v_quantity, updated_at = now()
      where id = v_variant_id;
    else
      if exists (select 1 from public.living_product_variants where product_id = v_product_id and active = true) then
        raise exception 'Selezionare una variante';
      end if;
      if v_product.stock_quantity < v_quantity then raise exception 'Disponibilità prodotto insufficiente'; end if;
      v_unit_price := v_product.price;
      update public.living_products
      set stock_quantity = stock_quantity - v_quantity, updated_at = now()
      where id = v_product_id;
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'product_id',v_product_id,'variant_id',v_variant_id,
      'product_name',v_product.name,'sku',coalesce(v_variant.sku,v_product.sku),
      'brand_type',v_product.brand_type,'quantity',v_quantity,
      'unit_price',v_unit_price,'line_total',v_unit_price*v_quantity,
      'variant_name',v_variant_name,'variant_options',v_variant_options
    ));
  end loop;

  insert into public.living_orders(
    user_id,customer_name,customer_email,phone,shipping_address,billing_address,
    subtotal,shipping_total,total,currency,payment_status,fulfillment_status,
    reservation_expires_at,customer_note
  ) values (
    p_user_id,trim(p_customer_name),trim(p_customer_email),nullif(trim(coalesce(p_phone,'')),''),
    p_shipping_address,p_billing_address,v_subtotal,p_shipping_total,v_subtotal+p_shipping_total,'EUR','pending','unfulfilled',
    now() + interval '35 minutes',nullif(trim(coalesce(p_customer_note,'')),'')
  ) returning id,order_number into v_order_id,v_order_number;

  insert into public.living_order_items(
    order_id,product_id,variant_id,product_name,sku,brand_type,quantity,
    unit_price,line_total,variant_name,variant_options
  )
  select v_order_id,
    (x.value->>'product_id')::uuid,
    nullif(x.value->>'variant_id','')::uuid,
    x.value->>'product_name',x.value->>'sku',x.value->>'brand_type',
    (x.value->>'quantity')::integer,(x.value->>'unit_price')::numeric,
    (x.value->>'line_total')::numeric,x.value->>'variant_name',
    coalesce(x.value->'variant_options','{}'::jsonb)
  from jsonb_array_elements(v_items) as x(value);

  return jsonb_build_object(
    'order_id',v_order_id,'order_number',v_order_number,
    'subtotal',v_subtotal,'shipping_total',p_shipping_total,'total',v_subtotal+p_shipping_total,'currency','EUR','items',v_items,
    'reservation_expires_at',now() + interval '35 minutes'
  );
end;
$$;

revoke all on function public.create_living_order_reservation(text,text,text,jsonb,jsonb,text,numeric,uuid,jsonb)
  from public, anon, authenticated;
grant execute on function public.create_living_order_reservation(text,text,text,jsonb,jsonb,text,numeric,uuid,jsonb)
  to service_role;


-- Release reserved stock exactly once when Stripe session creation fails or expires.
create or replace function public.release_living_order_reservation(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.living_orders%rowtype;
  v_item record;
begin
  select * into v_order
  from public.living_orders
  where id = p_order_id
  for update;
  if not found or v_order.payment_status <> 'pending' then
    return false;
  end if;

  for v_item in
    select product_id,variant_id,quantity
    from public.living_order_items
    where order_id = p_order_id
    order by product_id,coalesce(variant_id::text,'')
  loop
    if v_item.variant_id is not null then
      update public.living_product_variants
      set stock_quantity = stock_quantity + v_item.quantity,updated_at = now()
      where id = v_item.variant_id;
    elsif v_item.product_id is not null then
      update public.living_products
      set stock_quantity = stock_quantity + v_item.quantity,updated_at = now()
      where id = v_item.product_id;
    end if;
  end loop;

  update public.living_orders
  set payment_status = 'failed',
      fulfillment_status = 'cancelled',
      reservation_expires_at = null,
      updated_at = now()
  where id = p_order_id;
  return true;
end;
$$;

revoke all on function public.release_living_order_reservation(uuid)
  from public, anon, authenticated;
grant execute on function public.release_living_order_reservation(uuid)
  to service_role;


-- Email delivery state: leases prevent concurrent duplicate sends; sent timestamps make retries idempotent.
alter table public.living_orders
  add column if not exists paid_email_sent_at timestamptz,
  add column if not exists paid_email_sending_at timestamptz,
  add column if not exists shipped_email_sent_at timestamptz,
  add column if not exists shipped_email_sending_at timestamptz;
