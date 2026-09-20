create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('Gold', 'Silver')),
  purity text,
  wastage_tier_1 numeric,
  wastage_tier_2 numeric,
  wastage_tier_3 numeric,
  created_at timestamptz not null default now()
);

alter table products add column if not exists product_group text;

create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_number text not null unique,
  created_at timestamptz not null default now()
);

alter table quotations add column if not exists category text;
alter table quotations add column if not exists product_id uuid references products(id);
alter table quotations add column if not exists product_name text;
alter table quotations add column if not exists purity text;
alter table quotations add column if not exists weight numeric;
alter table quotations add column if not exists wastage_percent numeric;
alter table quotations add column if not exists wastage_weight numeric;
alter table quotations add column if not exists rate numeric;
alter table quotations add column if not exists mc numeric;
alter table quotations add column if not exists gst numeric;
alter table quotations add column if not exists total numeric;
alter table quotations add column if not exists less numeric;
alter table quotations add column if not exists net_total numeric;
alter table quotations add column if not exists revision integer not null default 1;
alter table quotations add column if not exists updated_at timestamptz not null default now();

create table if not exists quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  category text,
  product_id uuid references products(id),
  product_name text,
  purity text,
  weight numeric,
  wastage_percent numeric,
  wastage_weight numeric,
  rate numeric,
  mc numeric,
  gst numeric,
  amount numeric,
  created_at timestamptz not null default now()
);

create table if not exists scraps (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('Gold', 'Silver')),
  scrap_name text not null,
  scrap_weight numeric not null,
  scrap_less numeric not null default 0,
  scrap_weight_after_less numeric not null,
  rate numeric not null,
  total numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists rate_history (
  id uuid primary key default gen_random_uuid(),
  rate_date date not null default current_date,
  session text not null check (session in ('AM', 'PM')),
  gold_rate numeric not null,
  silver_rate numeric not null,
  created_at timestamptz not null default now()
);
