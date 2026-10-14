create extension if not exists pgcrypto;

create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  capacity int not null check (capacity > 0),
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references resources(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  quantity int not null default 1 check (quantity > 0),
  customer_name text not null,
  customer_email text not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);

create index if not exists bookings_resource_dates
  on bookings (resource_id, start_date, end_date)
  where status = 'confirmed';

create table if not exists blocked_dates (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references resources(id) on delete cascade,
  day date not null,
  unique (resource_id, day)
);

alter table resources enable row level security;
alter table bookings enable row level security;
alter table blocked_dates enable row level security;

create or replace function create_booking(
  p_resource uuid,
  p_start date,
  p_end date,
  p_qty int,
  p_name text,
  p_email text
) returns uuid
language plpgsql
as $$
declare
  v_capacity int;
  v_blocked int;
  v_peak int;
  v_id uuid;
begin
  if p_end <= p_start then
    raise exception 'invalid_range';
  end if;

  select capacity into v_capacity from resources where id = p_resource for update;
  if not found then
    raise exception 'resource_not_found';
  end if;

  select count(*) into v_blocked
  from blocked_dates
  where resource_id = p_resource and day >= p_start and day < p_end;
  if v_blocked > 0 then
    raise exception 'unavailable';
  end if;

  select coalesce(max(nightly), 0) into v_peak
  from (
    select n.d, sum(b.quantity) as nightly
    from generate_series(p_start, p_end - 1, 1) as n(d)
    left join bookings b
      on b.resource_id = p_resource
     and b.status = 'confirmed'
     and n.d >= b.start_date
     and n.d < b.end_date
    group by n.d
  ) s;

  if v_peak + p_qty > v_capacity then
    raise exception 'unavailable';
  end if;

  insert into bookings (resource_id, start_date, end_date, quantity, customer_name, customer_email)
  values (p_resource, p_start, p_end, p_qty, p_name, p_email)
  returning id into v_id;

  return v_id;
end;
$$;
