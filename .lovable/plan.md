## Problem

During onboarding, inserting into `training_centers` fails with a 403 "row violates row-level security policy" error.

The INSERT itself is allowed (`WITH CHECK true`), but the request uses `.insert(...).select().single()` which returns the new row via `RETURNING`. PostgREST then applies the **SELECT** policy to that returned row. The current SELECT policy is:

```
id = get_user_center(auth.uid())
```

At onboarding time the user's `profiles.center_id` is still `NULL`, so the freshly inserted center doesn't match the SELECT policy and the row is filtered out → 403.

## Fix

Update the SELECT policy on `training_centers` so the creator can also see centers that aren't yet linked to a profile, or restructure onboarding to be atomic. Cleanest fix:

1. **Migration** — replace the `members view own center` SELECT policy so members OR users without a center yet (during onboarding) can read a center they're acting on. Specifically, allow SELECT when:
   - `id = get_user_center(auth.uid())` (existing members), OR
   - the requesting user has no center yet AND is the only one acting (covered implicitly by the insert+return flow).

   Simplest robust approach: create a SECURITY DEFINER RPC `create_training_center(name, phone, address)` that:
   - inserts the center
   - updates the caller's profile with `center_id`
   - inserts a `user_roles` row with `center_admin`
   - returns the new center row

   This makes onboarding atomic, eliminates the RLS-on-RETURNING issue, and avoids partial state if any step fails.

2. **Update `src/pages/Onboarding.tsx`** to call the RPC via `supabase.rpc('create_training_center', { ... })` instead of three separate calls.

## Technical details

- New SQL function `public.create_training_center(_name text, _phone text, _address text)` returning `training_centers`, `SECURITY DEFINER`, `SET search_path = public`.
- Function body: insert center → update profile.center_id → insert user_roles(center_admin) → return center.
- Keep existing RLS policies as-is (they're correct for steady-state usage).
- Frontend: single `supabase.rpc(...)` call, then `refresh()` and navigate to `/app`.

## Files

- New migration adding the `create_training_center` function.
- `src/pages/Onboarding.tsx` — swap the insert/update/insert chain for a single RPC call.
