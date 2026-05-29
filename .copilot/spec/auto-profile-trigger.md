# Spec: auto-profile-trigger
**Status:** draft
**Type:** feature
**Created:** 2026-05-24
**Author:** developer (database gap fix)

## Summary
The `tailors` row is currently created client-side in `SetupScreen` via `db.setTailor()`. If the network fails during that call, the user has a verified auth account but no profile row — they're stuck in limbo. This spec adds a Postgres trigger on `auth.users` that guarantees a `tailors` row is created atomically within the same transaction as the auth user, eliminating the client-side race condition.

## User Story
As a new tailor, I want my profile to exist the moment I verify my email so that I never get stuck in a broken state between "account created" and "profile set up."

## Acceptance Criteria
- [ ] AC1: Backfill migration creates `tailors` rows for all existing `auth.users` who lack one, with no data loss.
- [ ] AC2: Every new `auth.users` insert automatically creates a corresponding `tailors` row (via trigger) before the API response returns.
- [ ] AC3: `db.setTailor()` in SetupScreen can still upsert/update the row — the trigger creates the base row, SetupScreen fills in the real data.
- [ ] AC4: Migration runs with zero downtime — existing rows in `tailors` are untouched.
- [ ] AC5: RLS bypass is scoped correctly — the trigger function uses `security definer` and `set search_path = public` to insert without exposing elevated privileges to end users.

## Out of Scope
- No frontend UI changes — SetupScreen and `db.setTailor()` continue to work as-is.
- No new API routes or environment variables.
- No email column on `tailors` — email is accessed via the `user_id` FK join to `auth.users`.
- No changes to existing `tailors` rows or their data.

## Technical Notes
- **No schema changes needed** — `tailors` table already has `user_id uuid references auth.users(id) on delete cascade unique`.
- **Migration order is critical:**
  1. Run backfill `INSERT ... SELECT` for existing users first.
  2. Then create the function + trigger for new signups.
- **No frontend changes required** — `db.setTailor()` does an `upsert` with `onConflict: "user_id"`, so it works whether the row exists (trigger-created) or not.
- **Files affected:** 0 — this is a pure SQL migration run in Supabase SQL Editor. No code changes.
- **Security:** The trigger function uses `security definer` to bypass RLS for the insert. The `set search_path = public` prevents search-path injection attacks.

### SQL Script (complete, in order)

```sql
-- STEP 1: Backfill existing auth.users who are missing a tailors row
insert into public.tailors (user_id, shop, phone, city)
select id, '', '', ''
from auth.users
where id not in (select user_id from public.tailors)
on conflict (user_id) do nothing;

-- STEP 2: Create the trigger function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.tailors (user_id, shop, phone, city)
  values (new.id, '', '', '');
  return new;
end;
$$;

-- STEP 3: Attach trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

## Open Questions
- None — the solution is fully scoped and technically verified.

## Approval
- [x] Approved by: Product Agent (spec finalized, SQL ready)
- [x] Date: 2026-05-24
