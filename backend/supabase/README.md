# supabase

The whole backend. There is **no app server**: the Expo app talks to Supabase directly with the
publishable key, and the database enforces who can see what.

```
Expo app (services/*.ts)
  ├── Supabase Auth ........ email + password, Google (OAuth, PKCE)
  ├── Data API (PostgREST) . plain reads/writes on the tables below
  ├── RPC .................. create_case, record_outcome, dashboard_stats, search_all,
  │                          move_list_item, delete_account
  └── Storage .............. case-docs (private), avatars (public read)
Postgres
  ├── RLS on every table: a signed-in advocate sees only rows where advocate_id = auth.uid()
  ├── composite foreign keys: a case can only point at that advocate's own court / client / case type
  └── triggers: profile + starter data on sign-up, next/last hearing dates, updated_at
```

Project: `vakil-app` (`eefcinzxcnrmzlnlfuen`). All migrations in `migrations/` except the last one are
already applied there (see "One manual step" below).

## Tables

| Table | What it holds |
|---|---|
| `advocates` | One row per user (`id` = `auth.users.id`). Profile, theme, notification prefs, `onboarded_at`. |
| `courts`, `case_types` | Each advocate's own lists. Seeded at sign-up, hidden instead of deleted. |
| `clients` | Phone is unique per advocate (`DUPLICATE_PHONE` in the app). |
| `cases` | Core record. `next_hearing_at` / `last_hearing_at` are maintained by a trigger. |
| `case_clients` | Many-to-many cases and clients. |
| `hearings` | One row per date; an outcome closes it. |
| `notes`, `documents`, `fees`, `payments`, `tasks` | P1 modules. Documents are soft-deleted so Undo can restore them. |
| `notifications` | In-app notification centre (written by the database, read by the app). |
| `device_tokens` | Expo push tokens, for future server-sent reminders. |

Computed columns (PostgREST): `cases.search_text` (case search) and `hearings.last_outcome`.

## Security model

- `anon` (signed out) has no access to any table or function.
- `authenticated` has owner-only CRUD through RLS. On `advocates` only profile columns are updatable
  (not `email` or `id`); `notifications` are read / mark-read / delete only.
- Storage paths start with the user's id (`{uid}/...`) and the bucket policies check that folder.
- The **secret key is never used by the app** and must never be put in `.env` (anything `EXPO_PUBLIC_`
  is bundled into the app). It is only for trusted servers and admin scripts.

## Manual steps

Destructive SQL is not applied automatically from the editor session, so run these yourself in
**Dashboard > SQL Editor**:

- `migrations/20261016212700_drop_unused_columns.sql` removes columns the app never uses (the
  functions were already switched off them by `stop_using_unused_columns`).
- `migrations/20261016200800_delete_account.sql`, described below.

### `delete_account`

`migrations/20261016200800_delete_account.sql` adds the RPC behind Settings > Help > Delete account.
It deletes from `auth.users`, so it was not applied automatically. Open
**Dashboard > SQL Editor**, paste the file and run it. Until then the app shows
"Account deletion is not enabled yet" instead of deleting.

## Applying migrations to another project

Run the files in `migrations/` in filename order in the SQL Editor, or with the Supabase CLI
(`supabase link --project-ref <ref>` then `supabase db push`). File names match the migration
history on `eefcinzxcnrmzlnlfuen`, so the CLI sees them as already applied there.

After a schema change, regenerate the app's types:

```bash
npx supabase gen types typescript --project-id eefcinzxcnrmzlnlfuen > services/database.types.ts
```

## Auth setup (Dashboard)

### Google sign-in / sign-up

The app uses Supabase's OAuth redirect flow (`signInWithOAuth` + PKCE) in an in-app browser, so it
works in Expo Go, development builds and on web without a native Google SDK. The first Google
sign-in creates the account; the sign-up trigger copies the Google name and photo onto the profile.

1. **Google Cloud Console** > APIs & Services > OAuth consent screen: set the app name, support email
   and add `supabase.co` under authorised domains.
2. Credentials > Create credentials > **OAuth client ID** > type **Web application**.
   Authorised redirect URI: `https://eefcinzxcnrmzlnlfuen.supabase.co/auth/v1/callback`
3. **Supabase** > Authentication > Sign In / Providers > **Google**: enable it, paste the client ID
   and client secret, save.
4. Supabase > Authentication > **URL Configuration**
   - Site URL: `http://localhost:8081` while developing (your real web URL later)
   - Redirect URLs: `http://localhost:8081/**`, `vakil://**` (installed app) and `exp://**` (Expo Go)

### Email + password

- "Confirm email" is on by default: after sign-up the app asks the user to open the link, then sign in.
- Supabase's built-in email sender only delivers to members of your Supabase organisation and is rate
  limited. For real users set up **Authentication > SMTP Settings** (any SMTP provider). For quick
  testing you can turn "Confirm email" off instead.
- Password reset: the app accepts the 6-digit code from the email. Add `{{ .Token }}` to
  **Authentication > Email Templates > Reset Password** (template edits need custom SMTP on the free
  plan). Without the code, opening the link in the email on the same phone also works: it opens the
  reset screen directly.

## Not built yet

- Server-sent reminders (evening / morning digests). Reminders are scheduled on the phone today;
  `device_tokens` and `notifications` are ready for a pg_cron + Edge Function job later.
- Purging soft-deleted documents (and their files) after 30 days.
