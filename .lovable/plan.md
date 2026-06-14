## Goal
Let private institutes create courses directly, without first creating a trade. Replace the rigid Trade → Course hierarchy with a lightweight, optional **category** + **tags** model on the course itself.

## Changes

### 1. Database (migration)
- Add to `public.courses`:
  - `category` text (nullable) — single primary grouping, e.g. "Electrical", "IT", "Caregiving"
  - `tags` text[] (nullable, default `'{}'`) — free-form labels for search/filter
- Make `courses.trade_id` nullable so courses no longer require a trade.
- Keep the `trades` table intact (don't drop) so existing demo data is preserved, but it becomes invisible in the UI.

### 2. Course creation/edit UI (`src/pages/Courses.tsx`)
- Remove the mandatory "Trade" select from the New Course dialog.
- Add a **Category** input: combobox-style — types freely, but suggests categories already used by this center (deduped from existing courses). One value per course.
- Add a **Tags** input: chip/badge entry (press Enter or comma to add), also suggesting existing tags from the center.
- Course card: show the category as the badge (replacing the trade badge), with tags as small muted chips beneath the title.
- Filter bar at the top of the courses list: filter by category and by tag.

### 3. Navigation (`src/components/AppLayout.tsx`)
- Hide the **Trades** menu item entirely. Cleaner default for private institutes.
- The `/app/trades` route stays mounted so old links don't 404, but it's unreachable from the sidebar.

### 4. Downstream references
- `Batches.tsx` and anywhere else that joins `trades(name)` on a course: fall back to `courses.category` when no trade is linked. No schema break because `trade_id` stays nullable.
- Seed/demo data and SEO landing pages: no change needed.

### 5. Out of scope
- No migration of existing trades into categories (per your "don't worry about it").
- No bulk editor for existing courses — they keep their current trade badge until edited.
- No changes to certificates, plans, or branches.

## Technical notes
- Category suggestions come from a simple `select distinct category from courses where center_id = ?` — no new table needed.
- Tags stored as Postgres `text[]`; queried with `cs` (contains) operator from supabase-js when filtering.
- Form validation: category optional (max 60 chars), tags optional (max 10 per course, 30 chars each).

## Files touched
- `supabase/migrations/<new>.sql` — add columns, relax `trade_id`.
- `src/pages/Courses.tsx` — new form fields, filter bar, card layout.
- `src/components/AppLayout.tsx` — remove Trades from sidebar.
- `src/pages/Batches.tsx` — minor display fallback to category.
