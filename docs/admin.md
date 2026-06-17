# admin.md — Portal Pages & Role Capabilities

## Roles

There are currently two roles in the system, stored in `user_roles`.

| Role | Who | What they can do |
|---|---|---|
| `center_admin` | Institute owner / manager | Full access to all features within their center |
| `instructor` | Teacher / trainer | Can view students and batches assigned to them; mark attendance; start/join live sessions; enter grades |

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
- Enrollment & Certification Trend — LineChart (monthly, hardcoded demo data for now)
- Students by Trade — PieChart (hardcoded demo data)
- Admission Source Mix — BarChart (`ami_probashi` vs walk-in vs referral — hardcoded demo)

> Charts use hardcoded demo data currently. Real aggregation from DB is future work.

**Get Started CTA card:** shown at the bottom, links to add a trade or publish a batch.

---

### Courses — `/app/courses`

**Purpose:** Manage the course catalog.

**Admin can:**
- Create a course (title, description, duration_hours, price, cover image, optional category + tags, optional trade link)
- Edit and delete courses
- Filter by category and tag

**Key data model note:** `trade_id` is now nullable. Courses should use `category` (free text) and `tags` (array) instead of requiring a Trade first. The Trade hierarchy is being phased out.

**Plan limit:** `plan.limits.maxPublishedCourses` caps how many batches can be published to Ami Probashi (not courses themselves).

---

### Batches — `/app/batches`

**Purpose:** Manage scheduled runs of a course.

**Admin can:**
- Create a batch (name, course, start/end date, capacity, instructor, schedule notes, branch assignment)
- Set batch status: `draft → published → in_progress → completed → archived`
- Toggle `published_to_ami_probashi` to make the batch visible on the AP mobile app

**Instructor sees:** only batches where `batches.instructor_id = auth.uid()`

### Batch Detail — `/app/batches/:id`

The main operational screen for a batch. Contains:

**Enrollment pipeline tab:**
- Lists all enrollments with their `pipeline_status`
- Admin can move students through: `applied → shortlisted → training_started → ongoing → completed → certified`
- Issuing a certificate sets `pipeline_status = 'certified'` and stamps `certificate_issued_at`

**Attendance tab:**
- Date picker → mark present/absent/late per student for that day
- One attendance record per `(enrollment_id, session_date)`

**Live Sessions tab:**
- Create a live session (title, scheduled_at, jitsi_room name)
- Toggle `is_live` to make it joinable

**Payments tab:**
- Record a payment against an enrollment
- Invoice auto-generated via `generate_invoice_no()`

---

### Applications — `/app/applications`

**Purpose:** Review inbound applications from the Ami Probashi app.

**Admin can:**
- View all enrollments with `source = 'ami_probashi'` and `pipeline_status = 'applied'`
- Shortlist or reject applicants
- See applicant profile data pulled from the AP app submission

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

Lists all payments across all enrollments, showing invoice number, student, batch, amount, method, date.

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

## Sidebar Navigation Groups

```
Overview
  └── Dashboard

Institute Management
  └── Branch Management

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
