create table tanks (
  id uuid primary key default gen_random_uuid(),
  gas_type text not null,
  assigned_meter text,
  psi integer not null,
  max_psi integer not null,
  status text not null check (status in ('in_use', 'spare', 'retired')),
  last_updated_by text not null,
  last_updated_at timestamptz not null default now()
);

create table equipment_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('meter_detector', 'ppe', 'tools_misc')),
  status text not null check (status in ('in_service', 'out_of_service', 'retired')),
  last_updated_by text not null,
  last_updated_at timestamptz not null default now()
);

create table log_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by text not null,
  entry_type text not null check (entry_type in ('tank_update', 'equipment_status_change', 'problem_note')),
  description text not null,
  resolved boolean
);

alter table tanks enable row level security;
alter table equipment_items enable row level security;
alter table log_entries enable row level security;

create policy "public read/write tanks" on tanks for all using (true) with check (true);
create policy "public read/write equipment" on equipment_items for all using (true) with check (true);
create policy "public read/write logs" on log_entries for all using (true) with check (true);

alter publication supabase_realtime add table tanks;
alter publication supabase_realtime add table equipment_items;
alter publication supabase_realtime add table log_entries;
