-- supabase/migrations/0004_custom_qr.sql
create table custom_qr_codes (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  target_url text not null,
  active boolean not null default true,
  created_by text not null,
  created_at timestamptz not null default now()
);

alter table custom_qr_codes enable row level security;
create policy "public read custom qr" on custom_qr_codes for select using (true);
-- writes via service-role only (admin routes); no anon write policy.

alter publication supabase_realtime add table custom_qr_codes;
