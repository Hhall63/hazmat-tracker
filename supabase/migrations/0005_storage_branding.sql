-- supabase/migrations/0005_storage_branding.sql
-- Create a public-read bucket for branding images.
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;
