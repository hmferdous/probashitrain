# CLAUDE.md — Probashi Skills (probashitrain)

## Before You Write Any Code — Read the Right Doc First

This repo has a `docs/` folder with five reference documents. **Read the relevant one(s) before starting any task.** They contain the authoritative detail — this file is the map, not the territory.

| Doc | Read it when you're working on... |
|---|---|
| [`docs/admin.md`](docs/admin.md) | Any portal page, user role, feature gate, nav item, onboarding flow, or anything a user sees and does in the app |
| [`docs/database.md`](docs/database.md) | Any Supabase table, column, enum, RLS policy, DB function, migration, or Storage bucket |
| [`docs/utilities.md`](docs/utilities.md) | `useAuth()`, `usePlan()`, shared components (`AppLayout`, `FeatureLockedPage`, `LockedOverlay`, `PageHeader`, `CertificateBuilder`), certificate helpers, React Query, toasts, path aliases |
| [`docs/design.md`](docs/design.md) | Any UI work — colours, tokens, gradients, shadows, spacing, typography, shadcn/ui components, icons, empty states, status badges |
| [`docs/operations.md`](docs/operations.md) | Dev environment setup, running migrations, regenerating types, adding a new feature end-to-end, deployment, known workarounds |

### Task → Doc mapping (quick reference)

| Task type | Docs to read |
|---|---|
| New page / new route | `admin.md` + `utilities.md` + `design.md` |
| New DB table or column | `database.md` + `operations.md` |
| New feature with plan gating | `admin.md` + `utilities.md` + `database.md` |
| Bug in a specific page | `admin.md` (understand intent) + `utilities.md` (understand hooks/components used) |
| Styling / UI polish | `design.md` |
| Adding a migration | `database.md` + `operations.md` |
| Supabase query or RLS issue | `database.md` |
| Certificate work | `utilities.md` (certificate helpers) + `admin.md` (Certificates page) |
| Setting up locally / deploying | `operations.md` |

---

## Project in One Paragraph

**Probashi Skills** (internal name: **Trainify**) is a B2B SaaS portal built by **Ami Probashi Limited (APL)** for private training institutes in Bangladesh. Institutes manage their courses, batches, students, attendance, payments, and certificates here. Batches published on this portal appear on the **Ami Probashi mobile app** (9M users), where aspiring migrants discover and apply for training. The app is React + TypeScript on the frontend, Supabase (Postgres + Auth + Storage + RLS) as the only backend — no separate server.

---

## Tech Stack (summary)

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Routing | React Router v6 |
| State | React Query + React Context (`useAuth`, `usePlan`) |
| Backend | Supabase — Postgres, Auth, Storage, RLS |
| Live Classes | Jitsi Meet (meet.jit.si), no account needed |
| Deployment | Lovable (`probashitrain.lovable.app`) |

---

## Absolute Rules (always apply, no exceptions)

- **Never hand-edit** `src/integrations/supabase/types.ts` — it is auto-generated. Run `npx supabase gen types typescript --local > src/integrations/supabase/types.ts` after any migration.
- **Never use the Supabase service role key** in frontend code. The anon key only.
- **Always scope DB queries to `center_id`** — RLS enforces this at the DB level, but also filter at the query level for defence in depth.
- **Always check `plan.locked.<feature>`** before rendering any gated page or component. Return `<FeatureLockedPage>` early if locked.
- **Always add new migrations** to `supabase/migrations/` — never run raw `ALTER TABLE` against production manually.
- **Always use `@/` path aliases** — never relative imports like `../../components/`.
- **Never hardcode colours** — always use Tailwind token classes (`bg-primary`, `text-accent`, `text-muted-foreground`).

---

## Coding Principles

**Think before coding.** State assumptions explicitly. If multiple approaches exist, surface them — don't pick silently. If something is unclear, stop and ask.

**Simplicity first.** Minimum code that solves the problem. No speculative features, no premature abstractions.

**Surgical changes.** Touch only what is needed. Don't refactor adjacent code. Match existing style: `async/await`, functional components, Tailwind, shadcn/ui primitives, Sonner for toasts.

**Define success before writing.** Know what "done" looks like and verify it — don't ship and hope.

---

## Known Gaps (do not re-implement as if they exist)

These are planned but **not yet built** — don't write code that assumes they exist:

- Real subscription management (plan tier is in `localStorage`, not DB)
- Coordinator/Manager role (only `center_admin` and `instructor` exist in the DB)
- Exam / quiz builder
- Course reading materials and video uploads
- SMS student communication
- Monthly / settlement reports
- Consultancy management
- Maker-Checker approval workflow
- Real AP app API sync (integration is currently one-way at DB level only)
- Certificate builder config persisted in DB (currently `localStorage`)
- Dashboard charts with real data (currently hardcoded demo arrays)
