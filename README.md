# StitchBook

Production management for workers, machine work, photos and reports.

Your work. Your records. All in one place.

## What it does

- **Accounts:** sign in, register, email confirmation, password reset. New accounts start pending until an admin activates them. Deactivated workers are blocked.
- **Worker workspace:** dashboard with daily, weekly and monthly trends; daily entry with 2 to 12 photos and automatic fabric length; personal history with search and date filters; corrections for 2 days.
- **Admin workspace:** dashboard, worker approval and roles, all production records with photos, reports with Excel, CSV and PDF export, append-only audit log, backup and restore.
- Fabric length is work count x 6 metres.
- One record per worker, machine and date.

## Run it

It is a single static page. Open `index.html` in a browser, or serve the folder with any static host.

```
python3 -m http.server 8000
```

Demo accounts (sample data, created on first load):

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@stitchbook.app | Admin#2026 |
| Worker | worker1@stitchbook.app | Worker#2026 |

## Data

This version stores everything in the browser (localStorage for records and accounts, IndexedDB for photos). Nothing is shared between devices. Use Settings > Download backup to export all data as JSON.

Do not commit real worker backups to a public repository.

## Next step

Connect a Supabase backend: shared accounts, real email confirmation, row-level security for ownership and admin-only actions, private photo storage with signed links, and an immutable audit table.
