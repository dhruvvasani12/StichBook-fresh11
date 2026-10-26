# StitchBook

Production management for workers, machine work, photos and reports.

Your work. Your records. All in one place.

## What it does

- **Accounts:** sign in, register, email confirmation, password reset. New accounts start pending until an admin activates them. Deactivated workers are blocked.
- **Worker workspace:** dashboard with daily, weekly and monthly trends; daily entry with 2 to 12 photos and automatic fabric length; personal history with search and date filters; corrections for 2 days.
- **Admin workspace:** dashboard, worker approval and roles, all production records with photos, reports with Excel, CSV and PDF export, append-only audit log, backup and restore.
- Fabric length is work count x 6 metres.
- One record per worker, machine and date.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Page shell |
| `css/styles.css` | Styles, light and dark themes |
| `js/app.js` | The whole app: screens, validation, exports, storage |
| `supabase/migrations/0001_init.sql` | Database schema, security rules, audit triggers, private photo bucket |
| `supabase/README.md` | Supabase setup steps and the security rules explained |

## Run it

It is a static site with no build step. Serve the folder with any static host:

```
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly from disk also works, but a server is better.

Demo accounts (sample data, created on first load):

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@stitchbook.app | Admin#2026 |
| Worker | worker1@stitchbook.app | Worker#2026 |

The Excel export loads its library (JSZip) from a CDN, so it needs an internet connection. CSV and PDF work offline.

## Data: current state

This version stores everything in the browser (localStorage for records and accounts, IndexedDB for photos). Nothing is shared between devices, and passwords are hashed in the browser only. It is a working prototype and a design reference, not a place for real worker data.

Settings > Download backup exports everything as JSON. Backup files contain account details, so they are ignored by `.gitignore`. Do not commit them to a public repository.

## Moving to Supabase

The database side is done and tested: `supabase/migrations/0001_init.sql` enforces ownership, active status, admin-only actions, the 2-day correction window, duplicate prevention, 2 to 12 photos, fabric calculation, an append-only audit log and private photo storage. It was run against PostgreSQL 16 and checked with a set of user-level tests (workers cannot read or edit each other's records, inactive workers are locked out, nobody can edit the audit log, the last admin cannot be removed).

Still to do: replace the storage layer in `js/app.js` (the `db`, `save`, `PH` and sign-in functions) with `@supabase/supabase-js` calls. Steps are in `supabase/README.md`.
