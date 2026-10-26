# StitchBook on Supabase

`migrations/0001_init.sql` creates the tables, row-level security rules, audit triggers and the private photo bucket.

## Set up

1. Create a Supabase project.
2. Open the SQL editor, paste `migrations/0001_init.sql`, run it.
3. Authentication > Providers > Email: turn on **Confirm email**.
4. Authentication > URL configuration: set the Site URL and add your deployed address as a redirect URL (for confirmation and password reset links).
5. Make your first admin. Register in the app, confirm your email, then run this once in the SQL editor:

```sql
update public.profiles set role = 'admin', status = 'active' where email = 'you@example.com';
```

## Security rules this enforces

| Rule | Where |
| --- | --- |
| New sign-ups are always pending workers | `handle_new_user` trigger |
| Only admins change role, status or email; the last admin cannot be removed | `guard_profile_update` |
| Workers read and write only their own records, and only while active | RLS policies |
| Workers can correct records for 2 days; admins any time | `can_edit_record` |
| One record per worker, machine and date; double clicks return the same record | unique keys, `client_key` |
| 2 to 12 photos per record, JPG/PNG/WebP, 12 MB each | `submit_record`, trigger, bucket limits |
| Fabric length is work count x 6 m, computed by the database | generated column |
| Photos are private; browsers use signed links | storage policies |
| Audit log cannot be edited or deleted by anyone | `audit_immutable` trigger |
| Records are never deleted, only corrected with a reason | no delete policy |

## Keys

Only the project URL and the **anon** key go in the browser. Never put the `service_role` key in front-end code.

## Backups and recovery

Turn on daily backups in Project Settings > Database > Backups (Pro plan adds point-in-time recovery). Photos live in Storage and are not part of database backups, so copy the `production-photos` bucket on a schedule, and test a restore into a scratch project now and then.

## Wiring the front end

The app in this repo still stores data in the browser. To move it onto Supabase, replace the storage layer in `js/app.js` (the `db`, `save`, `PH` and sign-in functions) with `@supabase/supabase-js` calls: `auth.signUp`, `auth.signInWithPassword`, `from('production_records')`, `rpc('submit_record')`, `storage.from('production-photos').upload` and `createSignedUrl`.
