# operations.md — Development & Deployment

## Environment Setup

### Prerequisites

- Node.js 18+
- npm (comes with Node)
- Supabase CLI (`npm install -g supabase`)

### Local development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# → http://localhost:5173
```

### Environment variables

Create a `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
```

Both values are found in the Supabase dashboard under **Project Settings → API**.

The anon key is **safe to commit** in `.env.example` (it is client-safe by design — RLS enforces all access). The service role key should **never** appear in this codebase.

---

## Project Deployment

This project is deployed on **Lovable** at `probashitrain.lovable.app`.

Lovable connects directly to the GitHub repo. Pushing to the main branch triggers a redeploy. Custom domain and production environment variable configuration is managed in the Lovable dashboard.

For non-Lovable environments (staging, production), any static host (Vercel, Netlify, Cloudflare Pages) works since the build output is pure static HTML/JS/CSS.

```bash
# Production build
npm run build
# Output: dist/

# Preview production build locally
npm run preview
```

---

## Supabase CLI Workflow

### Link to a Supabase project

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
```

Project ref is found in Supabase dashboard URL or Settings.

### Apply migrations

```bash
# Apply all pending migrations to linked project
npx supabase db push

# Reset local DB (drops and re-applies all migrations)
npx supabase db reset
```

### Regenerate TypeScript types

Run this every time a migration adds or changes a table, column, or enum:

```bash
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

Or if using local DB:

```bash
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

Commit the updated `types.ts` together with the migration SQL file.

### Start local Supabase stack

```bash
npx supabase start
# Starts local Postgres, Auth, Storage, and Studio
# Studio: http://localhost:54323
```

---

## Adding a New Feature — Checklist

### 1. Database change (if needed)

```bash
# Create a new migration file
npx supabase migration new <short_description>
# e.g. npx supabase migration new add_course_sessions
```

Edit the generated SQL file in `supabase/migrations/`. Include:
- `CREATE TABLE` / `ALTER TABLE`
- `ENABLE ROW LEVEL SECURITY`
- RLS policies following the center-scoping pattern
- Indexes on foreign keys and common filter columns
- Grants if the table needs explicit grants (check existing migrations for the pattern)

Apply and regenerate types:
```bash
npx supabase db reset  # local
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### 2. Frontend page

Create `src/pages/NewPage.tsx`:
- Wrap with `<AppLayout>`
- Include `<PageHeader>`
- Check `plan.locked.<feature>` at the top and return `<FeatureLockedPage>` if locked
- Query Supabase scoped to `center.id`
- Use React Query (`useQuery`) for new pages rather than `useEffect + useState`

### 3. Route

Add to `App.tsx`:
```tsx
<Route path="/app/new-page" element={<ProtectedRoute><NewPage /></ProtectedRoute>} />
```

### 4. Sidebar

Add to the appropriate nav group in `AppLayout.tsx`:
```tsx
{ to: "/app/new-page", label: "New Page", icon: SomeIcon }
```

### 5. Plan config (if gated)

Add a new key to `PlanConfig.locked` in `src/lib/plan.tsx` and set the appropriate values across all three tiers.

---

## Supabase Auth Notes

### Auth trigger

`handle_new_user()` fires on every new Supabase auth user signup. It creates a `profiles` row. If this trigger is ever dropped, new users will not get profiles and onboarding will break.

Verify the trigger exists:
```sql
SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';
```

### Session persistence

The Supabase client is configured with `persistSession: true` and `storage: localStorage`. Sessions survive page refresh and are auto-refreshed via `autoRefreshToken: true`.

### Email confirmation

Whether email confirmation is required on signup is configured in the Supabase dashboard under **Authentication → Email**. In development, disabling confirmation speeds up testing.

---

## Supabase Storage Notes

### Bucket: `student-docs` (private)

Created via migration. Path convention: `<center_id>/<student_id>/<filename>`.

To generate a signed URL for download:
```ts
const { data } = await supabase.storage
  .from("student-docs")
  .createSignedUrl(filePath, 3600); // 1 hour expiry
```

To upload:
```ts
const { error } = await supabase.storage
  .from("student-docs")
  .upload(`${center.id}/${student.id}/${file.name}`, file);
```

Storage RLS is enforced at the bucket level — the `(storage.foldername(name))[1]` check in policies ensures users can only access files under their own `center_id` prefix.

---

## Known Issues & Temporary Workarounds

### Certificate builder stored in localStorage

`CustomBuilderConfig` and batch template assignments are saved in `localStorage`. This means:
- The design is device-specific (not synced across team members)
- Clearing browser data loses the configuration

**Fix needed:** Persist builder config and batch templates in Supabase (a `certificate_configs` table per center).

### Plan tier stored in localStorage (demo mode)

The active plan tier (`demo_plan_tier`) is stored in `localStorage`. Every user appears as Basic by default. Switching plans via `/app/plans` only affects the current browser.

**Fix needed:** Create a `subscriptions` table in Supabase with the active plan per center. `PlanProvider` should read from DB on load.

### Dashboard charts use hardcoded demo data

The enrollment trend, trade breakdown, and admission source charts render static demo arrays, not live DB data.

**Fix needed:** Aggregate real data from `enrollments` grouped by month, trade, and source.

### No coordinator/manager role

The mindmap specifies a Coordinator/Manager role between admin and instructor. It doesn't exist in the DB yet. All admin-level operations require `center_admin`.

**Fix needed:** Add `coordinator` to the `app_role` enum, write migration, add policies granting coordinator access to operational features (admissions, scheduling) but not billing or user management.

### Trades being phased out

`trade_id` is now nullable. The Trades page still exists at `/app/trades` but is hidden from the sidebar. Over time, all new courses should use `category` + `tags` instead.

**Fix needed:** Remove Trade references from certificate rendering and batch display once all data has migrated.

---

## Development Conventions

### Imports

Always use path aliases:
```ts
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
```

Never use relative imports like `../../components/AppLayout`.

### Async patterns

All Supabase calls are `async/await`. Error handling should use the returned `error` object, not try/catch (unless dealing with non-Supabase async code):

```ts
const { data, error } = await supabase.from("students").select("*").eq("center_id", center.id);
if (error) {
  toast.error(error.message);
  return;
}
```

### Form handling

Use `FormData` from `e.currentTarget` for simple forms. Do not install `react-hook-form` without confirming it isn't already present. For new complex forms, prefer controlled components with `useState`.

No HTML `<form>` submit tags in React components — use `onSubmit` on the form element and `e.preventDefault()`.

### No HTML `<form>` actions in artifacts

If building an artifact (interactive HTML), never use `<form>` tags. Use `onClick` handlers.

---

## Build & Type Check

```bash
# Type check (no emit)
npx tsc --noEmit

# Lint
npm run lint

# Full build
npm run build
```

Fix all TypeScript errors before committing. The `types.ts` file is the source of truth for DB types — if a query type error appears, first check whether the types need to be regenerated from a new migration.

---

## Useful Supabase Dashboard URLs

- **Table Editor:** see and edit rows directly
- **SQL Editor:** run raw SQL against production (use with caution)
- **Authentication → Users:** see all registered users, reset passwords
- **Storage:** browse and manage uploaded files
- **Edge Functions:** not currently used
- **Logs:** query logs, auth logs, PostgREST logs for debugging
