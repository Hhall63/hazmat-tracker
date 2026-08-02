-- supabase/migrations/0002_app_settings.sql
create table app_settings (
  id text primary key default 'singleton',
  config jsonb not null,
  updated_by text,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 'singleton')
);

alter table app_settings enable row level security;

-- Anyone may read settings (needed to render the app).
create policy "public read settings" on app_settings for select using (true);

-- Writes come only from server routes using the service-role key, which
-- bypasses RLS. No anon write policy is created, so anon cannot write.

alter publication supabase_realtime add table app_settings;
