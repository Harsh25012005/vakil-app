# Vakil.app

Case manager for advocates: an Expo mobile app (this folder) on a serverless Supabase backend (`backend/supabase`).

```
vakil-app/
├── app/                  Screens (Expo Router: one file = one screen)
│   ├── _layout.tsx
│   ├── (auth)/           welcome, sign-in, sign-up, forgot / reset password
│   ├── auth/callback.tsx Google sign-in redirect lands here
│   ├── (tabs)/           bottom tabs: Home, Cases, Calendar, Clients, More
│   ├── case/             add, [id] (detail)
│   ├── client/           add, [id]
│   ├── settings.tsx
│   └── design-system.tsx Style guide: every component in dark and light
├── components/
│   ├── ui/               Button, Input, Card, Badge, Sheet, Toast ... (generic building blocks)
│   └── CaseCard, HearingCard, ClientCard, DocumentTile, NoteCard
├── services/             All backend calls: supabase.ts client, auth, cases, hearings, clients, extras, settings
├── hooks/                useTheme, useAuth, useCases ... (React Query on top of services/)
├── constants/            theme.ts: colors, radius, motion, status colors
├── utils/                cn, date, format, haptics
├── assets/               fonts, images, icons
├── scripts/              Tooling (theme CSS generator, Metro file-limit fix)
├── backend/              Everything that is not the app
│   ├── shared/           Zod schemas and enums used by the app and mirrored by DB checks
│   └── supabase/         Migrations (tables, RLS, RPC functions, storage) and setup guide
├── Docs/                 PRD, FRS, user flows, build tracker
├── global.css            Theme colors for web (generated: npm run theme:css)
├── tailwind.config.js
├── app.json
└── package.json
```

## Run it

```bash
npm install           # once
npm start             # start the app, scan the QR code with Expo Go
npm run web           # run it in the browser on :8081
npm run typecheck     # type-check the app and the shared package
```

Copy the example env file first and fill in the Supabase URL and publishable key:

```bash
cp .env.example .env
```

Dashboard steps (Google provider, redirect URLs, email) are in [backend/supabase/README.md](backend/supabase/README.md).

## Conventions

- Screens never call Supabase themselves: they use hooks, which call `services/`, which call Supabase (Auth, Data API, RPC, Storage). There is no app server; row level security in the database keeps each advocate's data private.
- Only the publishable key goes in the app. Never put the Supabase secret key in `.env`.
- Colors come from semantic classes (`bg-surface`, `text-text-2`); the values live in `constants/theme.ts`. No raw hex in components.
- Dates are `YYYY-MM-DD` in IST; money is INR.
- IDs follow the docs: `FR-<MODULE>-NN`, `SCR-NN`, `CMP-NN`.

## Status

All screens run against Supabase: email + password and Google sign-in, data synced to the account, documents and profile photos in Supabase Storage.

- Auth and onboarding, Home, Today, Cases (filters, sort, actions), Add/Edit case, Case detail with Hearings, Documents, Notes, Fees and Tasks tabs
- Calendar, Clients (list, add/edit, detail), global Search with recents, Notification centre
- More hub: profile, appearance, notification times, courts, case types, app lock, help, log out, delete account
