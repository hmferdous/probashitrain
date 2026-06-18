# utilities.md — Shared Libraries, Hooks & Components

## Contexts

### `AuthProvider` + `useAuth()` — `src/lib/auth.tsx`

Wraps the entire app. Resolves the current user, their profile, and their center from Supabase on mount.

```ts
const { user, profile, center, loading, signOut } = useAuth();
```

| Value | Type | Description |
|---|---|---|
| `user` | `User \| null` | Supabase Auth user object |
| `profile` | `Profile \| null` | Row from `profiles` table |
| `center` | `TrainingCenter \| null` | Row from `training_centers` |
| `loading` | `boolean` | True while session is resolving |
| `signOut` | `() => Promise<void>` | Calls Supabase signOut |

**Usage pattern:** Always check `loading` before branching on `user` or `center`. Most pages assume they are inside `ProtectedRoute` and that `center` is non-null.

---

### `PlanProvider` + `usePlan()` — `src/lib/plan.tsx`

Manages the active subscription tier. Currently **demo mode** — tier is stored in `localStorage` under `demo_plan_tier`. Future: read from DB.

```ts
const { plan, tier, setTier } = usePlan();
```

| Value | Type | Description |
|---|---|---|
| `plan` | `PlanConfig` | Full config object for the active tier |
| `tier` | `PlanTier` | `"basic" \| "premium" \| "enterprise"` |
| `setTier` | `(t: PlanTier) => void` | Switches plan for demo purposes |

#### `PlanConfig` shape

```ts
interface PlanConfig {
  tier: PlanTier;
  name: string;
  price: string;
  features: string[];
  limits: {
    maxStudents: number | null;       // null = unlimited
    maxPublishedCourses: number | null;
  };
  locked: {
    advancedCharts: boolean;
    liveClasses: boolean;
    attendance: boolean;
    certificates: boolean;
    inPersonAdmission: boolean;
    customCertificate: boolean;
  };
}
```

#### Feature gate pattern

```tsx
const { plan } = usePlan();

// Full page gate
if (plan.locked.attendance) {
  return <FeatureLockedPage title="Attendance" feature="..." description="..." requiredPlan="Premium" />;
}

// Inline overlay gate (used on Dashboard charts)
{plan.locked.advancedCharts ? (
  <LockedOverlay title="Advanced analytics" description="..." requiredPlan="Premium">
    {chart}
  </LockedOverlay>
) : chart}
```

---

## Supabase Client — `src/integrations/supabase/client.ts`

```ts
import { supabase } from "@/integrations/supabase/client";
```

Configured with:
- `auth.storage = localStorage`
- `auth.persistSession = true`
- `auth.autoRefreshToken = true`

Environment variables required:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key — public, safe in frontend)

**Never** use the service role key in frontend code.

---

## Certificate Utilities — `src/lib/certificateTemplates.ts`

### Types

```ts
type CertVariableKey = "student_name" | "completion_date" | "session_end_date" | "course_end_date" | "course_name"

interface CertTemplate { id, name, description, accent, border, layout }
interface CustomBuilderConfig { companyName, companyLogoDataUrl, signatories, otherLogos, certificateText, frameId, backgroundId, updatedAt }
interface Signatory { id, name, designation, company, signatureDataUrl, active }
interface OtherLogo { id, dataUrl, name, position: LogoPosition }
type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right"
```

### Constants

```ts
CERT_TEMPLATES      // 4 built-in templates: classic-gold, modern-navy, elegant-emerald, minimal-paper
CERT_FRAMES         // 5 frame options (none, classic-double-gold, thin-navy, elegant-emerald, ornate-corner, minimal-paper)
CERT_BACKGROUNDS    // 6 background options (plain-white, warm-paper, soft-gold, navy-tint, emerald-tint, watermark-seal)
CERT_VARIABLES      // [{key, label}] — the {{variable}} tokens available in certificate text
CUSTOM_BUILDER_ID   // "custom-builder" — the sentinel ID for the custom builder template
```

### Functions

| Function | Purpose |
|---|---|
| `getBatchTemplateId(batchId)` | Returns template ID from localStorage for a batch (defaults to first template) |
| `setBatchTemplateId(batchId, templateId)` | Saves template assignment to localStorage |
| `getTemplateById(id)` | Looks up a `CertTemplate` by ID |
| `isCustomTemplate(id)` | Returns true if id === CUSTOM_BUILDER_ID |
| `getBuilderConfig(centerId)` | Loads `CustomBuilderConfig` from localStorage (merges with defaults) |
| `saveBuilderConfig(centerId, cfg)` | Saves builder config to localStorage |
| `hasBuilderConfig(centerId)` | Returns true if a custom config exists |
| `clearBuilderConfig(centerId)` | Removes builder config from localStorage |
| `getFrameById(id)` | Looks up a `CertFrame` |
| `getBackgroundById(id)` | Looks up a `CertBackground` |
| `renderCertificateText(text, values)` | Replaces `{{variable}}` tokens in certificate body text |

> **Note:** Builder config and template assignments are stored in `localStorage`. This is a known limitation — it means custom certificates are device-specific. Persisting to Supabase is future work.

---

## `src/lib/utils.ts`

```ts
import { cn } from "@/lib/utils";
```

Standard shadcn `cn()` helper — merges Tailwind class strings with `clsx` + `tailwind-merge`.

```ts
cn("base-class", condition && "conditional-class", "another-class")
```

---

## Shared Components

### `AppLayout` — `src/components/AppLayout.tsx`

The shell for all `/app/*` pages. Renders the sidebar nav and a content area.

```tsx
<AppLayout>
  <div className="p-8 max-w-7xl mx-auto">
    {/* page content */}
  </div>
</AppLayout>
```

Sidebar renders `navGroups` (defined inline), applies `NavLink` active state via `cn()`, and shows the center name + plan badge in the header.

Plan badge: shown in the sidebar header, derived from `usePlan().plan.name`.

---

### `ProtectedRoute` — `src/components/ProtectedRoute.tsx`

Wraps all `/app/*` routes. Redirects:
- No user → `/auth`
- No `profile.center_id` → `/onboarding`

```tsx
<Route path="/app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
```

---

### `PageHeader` — `src/components/PageHeader.tsx`

Standard page title + description header used at the top of every page.

```tsx
<PageHeader title="Students" description="Manage your student records." />
```

---

### `FeatureLockedPage` — `src/components/FeatureLockedPage.tsx`

Full-page lock screen rendered when a page-level feature is gated.

```tsx
<FeatureLockedPage
  title="Attendance"
  feature="Daily attendance tracking"
  description="Track student attendance per session, export reports, and link attendance to certificate eligibility."
  requiredPlan="Premium"
/>
```

Renders inside `AppLayout` with a gold lock icon and an "Upgrade" button linking to `/app/plans`.

---

### `LockedOverlay` — `src/components/LockedOverlay.tsx`

Inline overlay for partially-gated content (e.g. dashboard charts). Wraps children in a blurred/dimmed container with an upgrade prompt.

```tsx
<LockedOverlay title="Advanced analytics" description="Unlock on Premium." requiredPlan="Premium">
  {chart}
</LockedOverlay>
```

---

### `CertificateBuilder` — `src/components/CertificateBuilder.tsx`

Two-panel drag-and-configure certificate designer:
- Left panel: company name, logo upload, signatories, other logos, certificate body text (with variable insertion), frame picker, background picker
- Right panel: live preview via `BuiltCertificate`

Saves to `localStorage` via `saveBuilderConfig()`.

### `BuiltCertificate` (exported from `CertificateBuilder.tsx`)

The certificate renderer — used in both the builder preview and the `Certificate.tsx` page.

```tsx
<BuiltCertificate cfg={cfg} values={{ student_name: "...", course_name: "...", completion_date: "..." }} />
```

---

## React Query Setup

`QueryClient` is created in `App.tsx` and provided via `QueryClientProvider`. All Supabase queries should use `useQuery` / `useMutation` from `@tanstack/react-query` for caching and invalidation.

Current state: many pages use `useEffect` + `useState` instead of React Query directly. Prefer React Query for new code.

```ts
import { useQuery } from "@tanstack/react-query";

const { data: students, isLoading } = useQuery({
  queryKey: ["students", center?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("center_id", center!.id);
    return data ?? [];
  },
  enabled: !!center,
});
```

---

## Toasts

Two toast systems are installed (shadcn/ui default + Sonner). Use Sonner for all new toasts:

```ts
import { toast } from "sonner";

toast.success("Student added");
toast.error(error.message);
```

---

## Date Formatting

Uses `date-fns` throughout.

```ts
import { format } from "date-fns";

format(new Date(enrollment.applied_at), "PP")        // "Jun 14, 2026"
format(new Date(batch.start_date), "MMM d, yyyy")   // "Jun 14, 2026"
```

---

## Path Aliases

Configured in `tsconfig.json` and `vite.config.ts`:

```ts
import { supabase } from "@/integrations/supabase/client"; // → src/integrations/...
import { cn } from "@/lib/utils";                          // → src/lib/utils
import AppLayout from "@/components/AppLayout";             // → src/components/...
```

Always use `@/` aliases — never relative paths like `../../components`.
