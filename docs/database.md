# database.md — Database Reference

## Stack

**Supabase** (PostgreSQL 15, PostgREST, GoTrue Auth, Storage)

All business logic lives in the database via Row Level Security policies and SECURITY DEFINER functions. There is no separate backend server. The frontend talks directly to Supabase via `@supabase/supabase-js`.

Supabase client is at `src/integrations/supabase/client.ts`. Types are auto-generated at `src/integrations/supabase/types.ts` — **never hand-edit this file**.

---

## Multi-Tenancy Model

Every row of user data belongs to exactly one `training_centers` row. Tenancy is enforced at two levels:

1. **RLS** — every policy checks `center_id = get_user_center(auth.uid())`
2. **Query level** — every frontend query also filters by `center.id` (defence in depth)

Users are linked to their center via `profiles.center_id`.

---

## Enums

```sql
app_role:          center_admin | instructor
batch_status:      draft | published | in_progress | completed | archived
pipeline_status:   applied | shortlisted | training_started | ongoing | completed | certified
attendance_status: present | absent | late
student_source:    ami_probashi | manual
payment_method:    cash | ami_probashi | bank | mobile_banking | other
document_type:     nid | education_certificate | cv | training_certificate | photo | other
```

---

## Tables

### `training_centers`
The SaaS tenant. One row per institute.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | |
| address | text | |
| phone | text | |
| logo_url | text | |
| created_at | timestamptz | |

---

### `profiles`
One row per authenticated user. Created automatically by the `handle_new_user` trigger on `auth.users`.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | References `auth.users(id)` |
| full_name | text NOT NULL | Pre-filled from `raw_user_meta_data.full_name` or email prefix |
| phone | text | |
| avatar_url | text | |
| center_id | uuid | References `training_centers(id)` — NULL until onboarding |
| created_at | timestamptz | |

---

### `user_roles`
Associates a user with a role within a center. A user can have multiple roles (e.g. admin at one center, instructor at another — though currently the UI doesn't support this).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid NOT NULL | References `auth.users(id)` |
| role | app_role NOT NULL | |
| center_id | uuid | References `training_centers(id)` |
| — | UNIQUE | `(user_id, role, center_id)` |

---

### `trades`
High-level skill groupings (Electrical, Plumbing, Driving, etc.). Being phased out in favour of `courses.category`. Still present for backwards compatibility.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| center_id | uuid NOT NULL | |
| name | text NOT NULL | |
| code | text | Optional short code |
| description | text | |
| created_at | timestamptz | |

---

### `courses`
A training program. `trade_id` is now nullable — prefer `category` + `tags` for new courses.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| center_id | uuid NOT NULL | |
| trade_id | uuid | Nullable FK to trades — legacy |
| title | text NOT NULL | |
| description | text | |
| duration_hours | int | Default 40 |
| price | numeric(10,2) | Default 0 |
| cover_image_url | text | |
| category | text | Free-text primary grouping (max 60 chars) |
| tags | text[] | Default `'{}'`, max 10 tags, 30 chars each |
| created_at | timestamptz | |

**Querying tags:** use PostgREST `cs` (contains) operator:
```ts
supabase.from("courses").select("*").contains("tags", ["electrical"])
```

---

### `batches`
A scheduled run of a course with seats, dates, and an instructor.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| center_id | uuid NOT NULL | |
| course_id | uuid NOT NULL | References courses |
| instructor_id | uuid | References auth.users — nullable |
| name | text NOT NULL | e.g. "Batch 12 — June 2026" |
| start_date | date NOT NULL | |
| end_date | date NOT NULL | |
| capacity | int | Default 30 |
| status | batch_status | Default `draft` |
| published_to_ami_probashi | boolean | Default false |
| schedule_notes | text | |
| created_at | timestamptz | |

**Status lifecycle:** `draft → published → in_progress → completed → archived`

Setting `published_to_ami_probashi = true` on a `published` or `in_progress` batch makes it visible to students on the Ami Probashi app.

---

### `batch_branches`
Maps which branches a batch runs at, with per-branch capacity.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| batch_id | uuid NOT NULL | |
| branch_id | uuid NOT NULL | |
| capacity | int | Default 30 |
| created_at | timestamptz | |
| — | UNIQUE | `(batch_id, branch_id)` |

---

### `branches`
Physical locations of a training center.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| center_id | uuid NOT NULL | |
| name_en | text NOT NULL | |
| name_bn | text NOT NULL | Bangla name |
| address_en | text NOT NULL | |
| address_bn | text NOT NULL | |
| map_link | text | Google Maps URL |
| phone | text NOT NULL | |
| email | text NOT NULL | |
| created_at | timestamptz | |
| updated_at | timestamptz | Auto-updated by trigger |

---

### `students`
Student profiles. Created either manually (in-person) or via AP app application.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| center_id | uuid NOT NULL | |
| full_name | text NOT NULL | |
| phone | text | |
| email | text | |
| nid | text | National ID number |
| address | text | |
| photo_url | text | |
| date_of_birth | date | |
| gender | text | |
| education_level | text | |
| occupation | text | |
| emergency_contact_name | text | |
| emergency_contact_phone | text | |
| created_at | timestamptz | |

---

### `enrollments`
The join between a student and a batch. Tracks the full lifecycle from application to certificate.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| batch_id | uuid NOT NULL | |
| student_id | uuid NOT NULL | |
| source | student_source | `ami_probashi` or `manual` |
| pipeline_status | pipeline_status | Default `applied` |
| performance_score | numeric(5,2) | Optional grade |
| performance_notes | text | |
| certificate_issued_at | timestamptz | Stamped when status → `certified` |
| applied_at | timestamptz | Default now() |
| — | UNIQUE | `(batch_id, student_id)` |

**Pipeline status lifecycle:**
```
applied → shortlisted → training_started → ongoing → completed → certified
```

---

### `attendance`
Daily attendance per student per batch. One record per `(enrollment_id, session_date)`.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| enrollment_id | uuid NOT NULL | |
| session_date | date NOT NULL | |
| status | attendance_status | Default `present` |
| marked_by | uuid | References auth.users |
| created_at | timestamptz | |
| — | UNIQUE | `(enrollment_id, session_date)` |

---

### `live_sessions`
Metadata for a Jitsi-powered live class within a batch.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| batch_id | uuid NOT NULL | |
| instructor_id | uuid | References auth.users |
| title | text NOT NULL | |
| scheduled_at | timestamptz NOT NULL | |
| jitsi_room | text NOT NULL | Jitsi room name (unique per session) |
| is_live | boolean | Default false — toggled to start the class |
| created_at | timestamptz | |

---

### `payments`
Payment records. Each payment is linked to an enrollment. Multiple payments per enrollment are allowed (partial payments).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| enrollment_id | uuid NOT NULL | |
| center_id | uuid NOT NULL | Denormalized for RLS |
| amount | numeric NOT NULL | CHECK amount >= 0 |
| method | payment_method | Default `cash` |
| invoice_no | text NOT NULL UNIQUE | Auto-generated by `generate_invoice_no()` |
| paid_at | timestamptz | Default now() |
| notes | text | |
| recorded_by | uuid | References auth.users |
| created_at | timestamptz | |

**Indexes:** `idx_payments_enrollment`, `idx_payments_center`

---

### `student_documents`
Files attached to a student profile. Stored in the `student-docs` Supabase Storage bucket.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| student_id | uuid NOT NULL | |
| center_id | uuid NOT NULL | Denormalized for RLS |
| doc_type | document_type | |
| label | text | Human-readable label |
| file_path | text NOT NULL | Storage path: `<center_id>/<student_id>/<filename>` |
| file_name | text NOT NULL | |
| mime_type | text | |
| size_bytes | int | |
| uploaded_by | uuid | |
| created_at | timestamptz | |

**Index:** `idx_student_documents_student`

---

### `course_materials`
Files attached to a course (PDFs, slides, etc.). Stored in Supabase Storage.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| course_id | uuid NOT NULL | |
| center_id | uuid NOT NULL | Denormalized for RLS |
| file_name | text NOT NULL | |
| file_path | text NOT NULL | |
| mime_type | text | |
| size_bytes | int | |
| uploaded_by | uuid | |
| created_at | timestamptz | |

---

## DB Functions

All are `SECURITY DEFINER` with `SET search_path = public`.

### `has_role(user_id uuid, role app_role) → boolean`
Checks if a user has a specific role. Used in RLS policies.
```sql
SELECT public.has_role(auth.uid(), 'center_admin');
```

### `get_user_center(user_id uuid) → uuid`
Returns the `center_id` from `profiles`. The core tenancy resolver.
```sql
SELECT public.get_user_center(auth.uid());
```

### `create_training_center(_name text, _address text, _phone text) → training_centers`
Atomic onboarding RPC called from `Onboarding.tsx`. Creates the center row and returns it.

### `generate_invoice_no() → text`
Returns a unique invoice number: `INV-YYYYMM-000XXX` using a Postgres sequence (`invoice_seq`).

### `handle_new_user() → trigger`
Fires on `AFTER INSERT ON auth.users`. Creates a `profiles` row with `full_name` from `raw_user_meta_data` or the email prefix.

### `update_updated_at_column() → trigger`
Fires `BEFORE UPDATE` on `branches`. Sets `updated_at = now()`.

---

## RLS Policy Patterns

### Standard center-scoped SELECT
```sql
USING (center_id = public.get_user_center(auth.uid()))
```

### Standard admin-only write
```sql
USING (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
WITH CHECK (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
```

### Instructor access to their batches
Instructors can update enrollments and manage attendance/live sessions for batches where `batches.instructor_id = auth.uid()`.

### Join-based policies (enrollments, attendance)
These tables don't have a direct `center_id`, so policies join through `batches`:
```sql
EXISTS (SELECT 1 FROM public.batches b WHERE b.id = batch_id AND b.center_id = public.get_user_center(auth.uid()))
```

---

## Storage Buckets

### `student-docs` (private)
Path layout: `<center_id>/<student_id>/<filename>`

Storage RLS mirrors table RLS:
- Members can read files from their center's folder
- Admins can insert, update, delete files from their center's folder

---

## Indexes

| Index | Table | Column(s) |
|---|---|---|
| `idx_payments_enrollment` | payments | enrollment_id |
| `idx_payments_center` | payments | center_id |
| `idx_student_documents_student` | student_documents | student_id |

---

## Migrations

All schema changes go in `supabase/migrations/` as SQL files. Never run `ALTER TABLE` manually against production — always create a migration.

**Workflow:**
```bash
# 1. Create a new migration
npx supabase migration new <description>

# 2. Write SQL in the generated file

# 3. Apply locally
npx supabase db reset

# 4. Regenerate TypeScript types
npx supabase gen types typescript --local > src/integrations/supabase/types.ts

# 5. Commit both the migration SQL and the updated types.ts
```

**Migration files (in order):**
1. `20260429041526_...` — Base schema: enums, all core tables, RLS policies, auth trigger
2. `20260429041546_...` — Function permission grants (REVOKE from public, GRANT to authenticated)
3. `20260512054137_...` — payments table, payment_method enum, invoice_seq sequence
4. `20260512054156_...` — generate_invoice_no() function
5. `20260512055329_...` — student extended fields (dob, gender, education), student_documents table + storage policies
6. `20260604063604_...` — branches table, batch_branches table, update_updated_at trigger
7. `20260604064110_...` — course_materials table
8. `20260614174008_...` — courses: add category, tags columns; trade_id made nullable
9. `20260617063346_...` — REVOKE on set_course_code function (cleanup)

---

## Supabase Query Conventions

```ts
import { supabase } from "@/integrations/supabase/client";

// Always scope to center
const { data } = await supabase
  .from("batches")
  .select("*, courses(title, category)")
  .eq("center_id", center.id)
  .order("created_at", { ascending: false });

// maybeSingle() for queries that may return 0 rows
const { data } = await supabase
  .from("enrollments")
  .select("*")
  .eq("id", id)
  .maybeSingle();

// single() only when guaranteed to exist (e.g. after insert)
const { data } = await supabase
  .from("training_centers")
  .select("*")
  .eq("id", center.id)
  .single();

// Count queries
const { count } = await supabase
  .from("students")
  .select("id", { count: "exact", head: true })
  .eq("center_id", center.id);

// Tag filtering (contains operator)
const { data } = await supabase
  .from("courses")
  .select("*")
  .eq("center_id", center.id)
  .contains("tags", ["electrical"]);
```
