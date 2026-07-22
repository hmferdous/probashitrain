# admin.md — Portal Pages & Role Capabilities

## Roles

There are currently two roles in the system, stored in `user_roles`.

| Role | Who | What they can do |
|---|---|---|
| `center_admin` | Institute owner / manager | Full access to all features within their center |
| `instructor` | Teacher / trainer | Assigned batches, attendance marking, live classes, student view (read-only) |

> **Coordinator/Manager** role is on the roadmap but not yet implemented. Currently everything that isn't instructor-specific falls to `center_admin`.

A user can only belong to one center. `profiles.center_id` determines tenancy. All RLS policies enforce this at the DB layer.

---

## Auth & Onboarding Flow

### Sign Up / Sign In — `/auth`
- Email + password via Supabase Auth
- On new user creation, a `profiles` row is auto-created by the `handle_new_user()` trigger
- After sign-in, `ProtectedRoute` checks for `profile.center_id`; if missing → redirect to `/onboarding`

### Onboarding — `/onboarding`
- First-time setup for a new training center
- Calls the `create_training_center(name, address, phone)` RPC which:
  1. Inserts a `training_centers` row
  2. Updates `profiles.center_id`
  3. Inserts a `user_roles` row with `role = 'center_admin'`
  4. Inserts a default "Main Branch" branch, pre-filled from the center's phone/address and the admin's email — batches require a branch, so new centers don't hit that requirement unprepared
- After completing, user lands on `/app` (Dashboard)

---

## Portal Pages

### Dashboard — `/app`

**Purpose:** At-a-glance snapshot of the center.

**Stat cards (always visible):**
- Trades count → links to `/app/trades`
- Courses count → links to `/app/courses`
- Batches count → links to `/app/batches`
- Students count → links to `/app/students`
- New Applications (pipeline_status = `applied`)
- Certificates Issued (pipeline_status = `certified`)

**Charts (Premium+, locked behind `plan.locked.advancedCharts`):**
- Enrollment & Certification Trend — LineChart (monthly, real data from enrollments)
- Students by Trade — PieChart (real data)
- Admission Source Mix — BarChart (`ami_probashi` vs manual)

---

### Courses — `/app/courses`

**Purpose:** Manage the course catalog. Deliberately barebone — everything scheduling/eligibility/fee-related lives on batches instead (see `docs/database.md`'s "Course/batch redundancy" note for why).

**Admin can:**
- Create a course (title, description, category, tags, optional trade link)
- Pick a category from a searchable combobox, or type a new one and create it inline without leaving the course form — no separate category-management page
- Add reading materials (file uploads) directly in the course creation/edit form, or later via the "Manage" dialog from the course card
- Edit and delete courses
- Filter by tag; search by title/description

**Key data model note:** `trade_id` is legacy/nullable. `category_id` references the `categories` table (added to support category-based reporting). Courses no longer have `duration_hours`, `price`, or `cover_image_url` — those are batch-only now.

**Plan limit:** `plan.limits.maxPublishedCourses` caps course creation count (not batch publishing).

---

### Batches — `/app/batches`

**Purpose:** Manage scheduled runs of a course.

**Admin can:**
- Create a batch (auto-generated code previewed before saving, name, course, start/end date, branch capacity, optional instructors, schedule notes, eligibility/requirements, duration & fee, document requirements, application deadline) — fields are grouped into collapsible sections (Description, Requirements, Duration & fee, Document requirements, Instructors)
- **Save as draft** once at least the batch name is entered — the rest can be filled in later from "Edit details" on the Batch Detail page
- **Copy from previous batch:** once a course already has a batch, a "Copy from previous batch" action pre-fills everything (including dates and branches) from the most recently created batch under that course; the admin can then adjust before saving
- Search/filter batches by status, course (multiselect), or free text
- Submit a batch to Ami Probashi for review, and (demo only) simulate their approval

**Batch status lifecycle:** `draft → unpublished → under_review → published → in_progress → completed → archived` — see `docs/database.md` for what each state means. `published_to_ami_probashi` no longer exists; `status` is the only source of truth.

**Demo approval:** there is no real Ami Probashi review/ops tool in this codebase yet. The "Simulate approval" button on an `under_review` batch stands in for that team's real approval action, moving the batch straight to `published`.

**Instructor multiselect:** During batch creation, admins can assign one or more instructors from the center's active instructor list. Assignments are stored in `batch_instructors`. If no instructors are assigned, the batch is visible to all instructors.

**Instructor sees:** batches assigned to them via `batch_instructors` (or all batches if unassigned — enforcement TBD).

**Contextual lifecycle banners in BatchDetail:**
- `draft` → prompt to finish filling out details
- `unpublished` → prompt to submit for review
- `under_review` → pending Ami Probashi review
- `published` → confirms live status

### Batch Detail — `/app/batches/:id`

The main operational screen for a batch. Contains:

**Pipeline tab:**
- Journey stepper at the top showing student counts per stage
- Table listing all enrollments with status badge, contact, score, source, action buttons
- Contextual action buttons per status (no inline dropdowns):
  - `applied` → Shortlist, Reject
  - `shortlisted` → Start training, Reject
  - `in_training` → Mark complete
  - `completed` → Grade, Issue certificate
  - `certified` → Grade, View certificate
  - `rejected` → Reinstate
- Rejected students remain in the table (not deleted) and can be reinstated
- Click any student name → StudentDetailDialog with:
  - **Full profile** button (top-right) — navigates to `/app/students/:id` and closes dialog
  - **Comments tab** — add/view/delete internal notes on the enrollment (`enrollment_comments` table)
  - **Payment tab** — record cash payments, view payment history, open invoice

**Attendance tab:**
- Date picker → mark present/absent/late per student for that day
- Rejected students are filtered out of the attendance sheet

**Live Sessions tab:**
- Create a live session (title, scheduled_at, jitsi_room name)
- Toggle `is_live` to make it joinable

**Edit details dialog:** Edit batch-level fields post-creation: description (EN + BN), eligibility (gender, education, age range), requirements notes, duration, price, application deadline, fee collection mode, tags, document requirements.

---

### Applications — `/app/applications`

**Purpose:** Review inbound applications from the Ami Probashi app.

**Admin can:**
- View all enrollments with `source = 'ami_probashi'` and `pipeline_status = 'applied'`
- **Shortlist** → sets status to `shortlisted`; shows "Go to batch" callout linking to the batch pipeline
- **Reject** → sets status to `rejected` (student is NOT deleted — visible in batch pipeline with Reinstate option)
- Batch name on each row links directly to the batch detail page
- "Simulate app applications" button seeds 5 mock students for demo/testing

---

### Students — `/app/students`

**Purpose:** Student directory for the center.

**Admin can:**
- Search and filter students
- Create a student manually (in-person admission — `source = 'manual'`)
- Enroll a student directly into a batch from here

**Plan gate:** `plan.locked.inPersonAdmission` blocks manual student creation on the Basic plan.

### Student Profile — `/app/students/:id`

Full student record:
- Personal info: name, phone, email, NID, DOB, gender, education level, occupation, emergency contact
- Photo upload
- Documents tab: upload/view NID, education certificates, CV, training certificates, other files (stored in `student-docs` Supabase Storage bucket)
- Enrollment history: all batches this student has been enrolled in, with pipeline status

---

### Attendance — `/app/attendance`

**Purpose:** Entry point for attendance marking.

Shows a list of active batches (`status IN ('published', 'in_progress')`). Clicking a batch goes to BatchDetail where attendance is actually marked.

**Plan gate:** `plan.locked.attendance` blocks this page on Basic.

---

### Live Classes — `/app/live`

**Purpose:** List and manage live sessions across all batches.

**Admin can:** create sessions, set them live, join.
**Instructor can:** join sessions assigned to their batches.

**Plan gate:** `plan.locked.liveClasses` blocks this on Basic and Premium (Enterprise only).

### Live Room — `/app/live/:id`

Embeds Jitsi Meet via external JS API loaded from `meet.jit.si`. No account or API key needed. The `jitsi_room` field on `live_sessions` is the Jitsi room name.

---

### Certificates — `/app/certificates`

**Purpose:** Issue and manage student certificates.

Three tabs:

**Issued tab:** All enrollments with `pipeline_status = 'certified'`. Links to individual certificate view/download.

**Templates tab:** Assign a certificate template per batch. Four built-in templates:
- Classic Gold
- Modern Navy
- Elegant Emerald
- Minimal Paper

**Certificate Builder tab (Premium+):** Design a custom certificate with:
- Company name + logo
- Up to N signatories (name, designation, company, signature image)
- Other logos (positioned: top-left, top-right, bottom-left, bottom-right)
- Certificate body text with `{{variable}}` placeholders
- Frame selection (5 options)
- Background selection (6 options)

Builder config is stored in `localStorage` keyed by `centerId`. This is temporary — it should be persisted in Supabase for production.

**Plan gates:**
- `plan.locked.certificates` — blocks the whole page on Basic
- `plan.locked.customCertificate` — blocks the Builder tab on Basic

### Certificate View — `/app/certificates/:id`

Renders the certificate for a single enrollment using the template/builder config assigned to that batch. Download is `window.print()`.

---

### Payments — `/app/payments`

**Purpose:** Payment ledger for the center.

Lists all payments across all enrollments, showing invoice number, student, batch, amount, method, date, and fee collection source. Filterable by fee collection source (`ami_probashi` vs `manual`).

### Invoice — `/app/payments/:id`

Printable invoice for a single payment. Shows:
- Invoice number, date, payment method
- Course + batch name
- This payment amount
- Course fee, total paid to date, outstanding balance
- All payments for the same enrollment (payment history)

---

### Plans — `/app/plans`

**Purpose:** Plan switcher (currently demo mode — stored in localStorage).

Shows three plan cards: Basic (৳0), Premium (৳4,999/mo), Enterprise (Custom). Clicking "Preview as X" switches the active tier instantly, which updates all feature locks and limits across the portal.

> **This is demo-only.** Real subscription management (payment to APL, tier stored in DB) is not yet built.

---

### Branch Management — `/app/branches-management`

**Purpose:** Manage physical branches of the training center.

**Admin can:**
- Add a branch with name (English + Bangla), address (English + Bangla), phone, email, optional map link
- Edit and delete branches
- Assign branches to batches (`batch_branches` table)

---

### User Management — `/app/users`

**Purpose:** Manage portal users (admins and instructors) and their access.

**Admin can:**
- View all active users in the center with their role badge
- Change another user's role inline (cannot change own role)
- Assign branch access to instructors via a toggle dialog — no branch selected = access to all branches
- Invite a new user: enter name, email, phone (optional), role, and branches → generates a `pending_invites` record (localStorage) and a copyable invite link (`/auth?invite=<token>`)
- Revoke a pending invite

**Invite flow (demo mode):**
The invite link is generated and copyable but the registration-via-token flow is not yet built. Invited users cannot self-register yet — this requires a future Edge Function or server-side handler.

**Branch assignments** are stored in `localStorage` keyed by `center_id` (demo-mode). The `user_branches` DB table exists via migration but is not yet read for enforcement.

**Role access description** is shown inline when selecting a role:
- *Admin*: Full access — all pages
- *Instructor*: Assigned Batches, Attendance, Live Classes, Student view (read-only)

---

## Sidebar Navigation Groups

```
Overview
  └── Dashboard

Institute Management
  ├── Branch Management
  └── User Management

Academics
  ├── Courses
  └── Batches

Admissions
  ├── Applications
  └── Students

Training
  ├── Attendance
  ├── Live Classes
  └── Certificates

Billing
  ├── Payments
  └── Plans
```

> Trades is intentionally hidden from the sidebar but the route `/app/trades` still exists.

---

## Feature Lock Matrix

| Feature | Basic | Premium | Enterprise |
|---|---|---|---|
| Trades & Courses | ✅ | ✅ | ✅ |
| Batches | ✅ | ✅ | ✅ |
| AP Applications | ✅ | ✅ | ✅ |
| Students (up to 50) | ✅ | ✅ (500) | ✅ (∞) |
| In-Person Admission | ❌ | ✅ | ✅ |
| Attendance | ❌ | ✅ | ✅ |
| Certificates | ❌ | ✅ | ✅ |
| Custom Certificate Builder | ❌ | ✅ | ✅ |
| Advanced Dashboard Charts | ❌ | ✅ | ✅ |
| Live Classes | ❌ | ❌ | ✅ |
| Published Courses limit | 3 | 20 | ∞ |
