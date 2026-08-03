-- supabase/migrations/0003_admin_config.sql
create table admin_config (
  id text primary key default 'singleton',
  passcode_hash text,
  updated_at timestamptz not null default now(),
  constraint admin_config_singleton check (id = 'singleton')
);

-- Tightened RLS: no anon policies at all. Only the service-role key
-- (used exclusively by server admin routes) can read or write.
alter table admin_config enable row level security;

insert into admin_config (id, passcode_hash) values ('singleton', null);
