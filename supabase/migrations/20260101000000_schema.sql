-- MenuQR: schema base. Dinheiro em numeric(10,2); ids em uuid.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

create table public.restaurant_settings (
  id int primary key default 1 check (id = 1),
  name text not null,
  description text not null default '',
  logo_url text,
  hero_url text,
  address text not null default '',
  phone text not null default '',
  -- {"mon":{"open":"11:00","close":"23:00"} | null, ...}; chaves mon..sun
  opening_hours jsonb not null default '{}'::jsonb,
  estimated_minutes int not null default 30 check (estimated_minutes between 0 and 240),
  accepting_orders boolean not null default true,
  closed_message text not null default 'Estamos fechados no momento.',
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  slug text not null unique,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  available boolean not null default true,
  featured boolean not null default false,
  prep_minutes int check (prep_minutes between 0 and 240),
  archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id) where not archived;
create index products_featured_idx on public.products (featured) where featured and not archived;

create table public.complement_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  min_select int not null default 0 check (min_select >= 0),
  max_select int not null default 1 check (max_select >= 1),
  created_at timestamptz not null default now(),
  check (min_select <= max_select)
);

create table public.complement_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.complement_groups (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  price_delta numeric(10, 2) not null default 0 check (price_delta >= 0),
  available boolean not null default true,
  sort_order int not null default 0
);
create index complement_options_group_idx on public.complement_options (group_id);

create table public.product_complement_groups (
  product_id uuid not null references public.products (id) on delete cascade,
  group_id uuid not null references public.complement_groups (id) on delete cascade,
  sort_order int not null default 0,
  primary key (product_id, group_id)
);
create index pcg_group_idx on public.product_complement_groups (group_id);

create table public.tables (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 30),
  public_code text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  tracking_token text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  customer_name text not null check (char_length(customer_name) between 2 and 80),
  customer_phone text not null check (char_length(customer_phone) between 8 and 20),
  mode text not null check (mode in ('DINE_IN', 'PICKUP')),
  table_id uuid references public.tables (id) on delete set null,
  notes text,
  status text not null default 'RECEIVED'
    check (status in ('RECEIVED','CONFIRMED','PREPARING','READY','COMPLETED','CANCELLED')),
  payment_status text not null default 'NOT_INTEGRATED'
    check (payment_status in ('NOT_INTEGRATED', 'PENDING')),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  total numeric(10, 2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (mode <> 'DINE_IN' or table_id is not null)
);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_created_idx on public.orders (created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity int not null check (quantity between 1 and 20),
  note text
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_item_complements (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  option_id uuid references public.complement_options (id) on delete set null,
  group_name text not null,
  name text not null,
  price numeric(10, 2) not null check (price >= 0)
);
create index oic_item_idx on public.order_item_complements (order_item_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index osh_order_idx on public.order_status_history (order_id, created_at);

-- Máquina de estados aplicada no banco (defesa em profundidade) + histórico.
create or replace function public.orders_status_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if not (
      (old.status = 'RECEIVED'  and new.status in ('CONFIRMED', 'CANCELLED')) or
      (old.status = 'CONFIRMED' and new.status in ('PREPARING', 'CANCELLED')) or
      (old.status = 'PREPARING' and new.status in ('READY', 'CANCELLED')) or
      (old.status = 'READY'     and new.status in ('COMPLETED', 'CANCELLED'))
    ) then
      raise exception 'Transição de status inválida: % -> %', old.status, new.status
        using errcode = '22023';
    end if;
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  new.updated_at = now();
  return new;
end $$;

create trigger orders_status_guard before update on public.orders
  for each row execute function public.orders_status_guard();

-- Histórico inicial ao criar o pedido.
create or replace function public.orders_initial_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.order_status_history (order_id, from_status, to_status)
  values (new.id, null, new.status);
  return new;
end $$;

create trigger orders_initial_history after insert on public.orders
  for each row execute function public.orders_initial_history();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.restaurant_settings
  for each row execute function public.touch_updated_at();
