# Admin setup (one-time)

The admin content-management feature adds two database tables and needs two
new environment variables. Until these are in place, `/admin` won't work — and
`npm run build` / a Vercel deploy will **fail at prerender** with:

```
Error: ... Could not find the table 'public.app_settings' in the schema cache (PGRST205)
```

That error means migration `0002_app_settings.sql` hasn't been applied yet.

## 1. Apply the migrations

In the Supabase SQL editor, run these in order:

- `supabase/migrations/0002_app_settings.sql` — creates `app_settings`
  (public read, service-role write, realtime enabled).
- `supabase/migrations/0003_admin_config.sql` — creates `admin_config`
  (service-role only) and seeds a singleton row with a **null** passcode.

## 2. Set environment variables

Set these in Vercel (Production **and** Preview) and in local `.env.local`:

- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase → Project Settings → API. Used
  exclusively by the server-side admin routes to write `app_settings` /
  `admin_config` (bypassing RLS). Never exposed to the client.
- `ADMIN_SESSION_SECRET` — a long random string, e.g. `openssl rand -hex 32`.
  Signs the admin session cookie (HMAC). If unset or empty, the middleware
  **fails closed** (no one can authenticate), so this must be set for admin to work.

## 3. Seed the first passcode (bootstrap)

`admin_config` starts with `passcode_hash = null`, and `POST /api/admin/auth`
rejects any passcode while the stored hash is null — so there's a chicken/egg
step to set the *first* passcode. Pick one:

- **Locally, before relying on the middleware:** run the app with the two env
  vars set and `POST /api/admin/passcode` once from a trusted device to set the
  initial passcode, then deploy. (The passcode route is guarded, so this works
  most easily against a build where you can reach it — e.g. by temporarily
  seeding a known hash first, see below.)
- **Via Supabase SQL editor:** insert a scrypt hash directly. The hash format is
  produced by `src/lib/auth/passcode.ts` (`hashPasscode`). Generate one with a
  short Node script that imports that helper, then:
  `update admin_config set passcode_hash = '<hash>' where id = 'singleton';`

After a passcode is set, change it anytime from the admin UI (Passcode panel,
delivered in a later stage) or `PUT /api/admin/passcode` while authenticated.

## 4. Verify

Visit `/admin` → you should be redirected to `/admin/login` → enter the
passcode → land on `/admin`. `npm run build` should then complete without the
`app_settings` prerender error.
