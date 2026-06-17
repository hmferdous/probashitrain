# design.md — Design System

## Philosophy

Probashi Skills uses a **Bangladesh-inspired green and gold** design language. The primary colour is derived from the BD flag green; the accent is a warm gold. The aesthetic is professional and trustworthy — designed for institute administrators, not consumers.

Built with **Tailwind CSS + shadcn/ui** on top of CSS custom properties. All colour decisions are made via tokens, never hardcoded hex or RGB values. Always use CSS variables in class names.

---

## Colour Tokens

Defined in `src/index.css` as HSL CSS variables and mapped to Tailwind in `tailwind.config.ts`.

### Base Palette

| Token | HSL Value | Usage |
|---|---|---|
| `--primary` | `155 75% 24%` | BD flag green — buttons, active nav, links |
| `--primary-foreground` | `45 100% 96%` | Text on primary backgrounds |
| `--primary-glow` | `152 65% 38%` | Lighter green for hover states |
| `--accent` | `42 92% 52%` | Gold — highlights, badges, certificate accents |
| `--accent-foreground` | `155 45% 10%` | Dark text on gold backgrounds |
| `--accent-glow` | `45 95% 65%` | Lighter gold for glow effects |
| `--background` | `150 30% 98%` | App background (off-white with a green tint) |
| `--foreground` | `155 45% 10%` | Default text |
| `--card` | `0 0% 100%` | Card backgrounds |
| `--muted` | `150 20% 95%` | Subtle backgrounds |
| `--muted-foreground` | `155 12% 42%` | Secondary text, placeholders |
| `--border` | `150 20% 88%` | Borders, dividers |
| `--destructive` | `0 75% 50%` | Errors, delete actions |

### Semantic Colours

| Token | HSL Value | Usage |
|---|---|---|
| `--success` | `145 65% 38%` | Success states, completed status |
| `--warning` | `35 95% 55%` | Warnings, pending status |
| `--info` | `200 80% 45%` | Informational states |

### Sidebar Tokens

| Token | HSL Value |
|---|---|
| `--sidebar-background` | `155 50% 12%` — dark green |
| `--sidebar-foreground` | `150 20% 90%` — light text |
| `--sidebar-primary` | `42 92% 52%` — gold (active item text) |
| `--sidebar-accent` | `155 45% 18%` — hover bg |
| `--sidebar-border` | `155 40% 20%` |

### Dark Mode

Dark mode is defined in `.dark { ... }` in `src/index.css`. Tailwind is configured with `darkMode: ["class"]`. Not actively used in the current UI but the variables are set up.

---

## Tailwind Colour Classes

Because all colours are mapped through the config, use semantic class names — never arbitrary values:

```tsx
// ✅ Correct
<div className="bg-primary text-primary-foreground" />
<div className="text-muted-foreground" />
<div className="border-border" />
<span className="text-accent" />
<div className="bg-success/10 text-success" />

// ❌ Wrong — never hardcode colours
<div style={{ color: "#1a7a4a" }} />
<div className="bg-[#f5a623]" />
```

---

## Gradients

Defined as CSS variables, accessible via Tailwind's arbitrary value syntax or inline styles.

| Variable | Description | Usage |
|---|---|---|
| `--gradient-primary` | Green linear gradient (dark → light) | Primary CTA sections |
| `--gradient-gold` | Gold linear gradient | Gold badges, certificate accents |
| `--gradient-hero` | Green to gold diagonal | Landing page hero |
| `--gradient-subtle` | Very subtle green fade | Section backgrounds |

```tsx
// As Tailwind class
<div className="bg-gradient-hero text-primary-foreground" />

// Sidebar logo icon (gold gradient)
<div className="bg-gradient-gold flex items-center justify-center shadow-gold">
  <GraduationCap className="h-5 w-5 text-accent-foreground" />
</div>

// Certificate card accent
<Card className="bg-gradient-gold/10 border-accent/40 hover:shadow-gold" />

// Dashboard CTA card
<Card className="bg-gradient-primary text-primary-foreground" />
```

---

## Shadows

| Variable | Description | Usage |
|---|---|---|
| `--shadow-sm` | Subtle lift | Default card resting state |
| `--shadow-md` | Medium elevation | Dropdowns, popovers |
| `--shadow-lg` | High elevation | Modals |
| `--shadow-glow` | Green glow | Active/highlighted primary elements |
| `--shadow-gold` | Gold glow | Certificate cards, gold CTAs |

```tsx
// Hover shadow on cards
<Card className="hover:shadow-elegant transition-shadow" />

// Gold glow shadow
<div className="shadow-gold" />

// Primary glow
<div className="shadow-glow" />
```

> `shadow-elegant` is a Tailwind alias for `--shadow-md`. Use it as the default hover shadow on interactive cards.

---

## Typography

No custom fonts — uses the system font stack via Tailwind defaults.

### Scale

| Class | Usage |
|---|---|
| `text-5xl md:text-6xl font-bold` | Hero headlines |
| `text-3xl font-bold` | Stat numbers on dashboard |
| `text-xl font-semibold` | Section headings |
| `text-lg font-semibold` | Card titles |
| `font-semibold` | Label-level headings |
| `text-sm text-muted-foreground` | Secondary labels, captions |
| `text-xs text-muted-foreground` | Metadata, timestamps |
| `text-xs uppercase tracking-widest text-muted-foreground` | Section dividers |

---

## Border Radius

Set via `--radius: 0.75rem` in the CSS.

```
rounded-lg  →  var(--radius)         = 0.75rem
rounded-md  →  calc(var(--radius) - 2px) = 0.625rem
rounded-sm  →  calc(var(--radius) - 4px) = 0.5rem
```

Use `rounded-lg` on cards and major containers. `rounded-md` on buttons and inputs. `rounded-sm` for small badges.

---

## Spacing Conventions

All app pages use:

```tsx
<div className="p-8 max-w-7xl mx-auto">
```

Consistent `p-8` padding, `max-w-7xl` content width, `mx-auto` centred.

Section spacing within a page: `space-y-8` between major sections.

Card grid layouts:
```tsx
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" />   // 3-col card grid
<div className="grid grid-cols-2 md:grid-cols-3 gap-4" />       // Dashboard stat cards
<div className="grid lg:grid-cols-2 gap-4" />                   // 2-col charts
```

---

## Transitions

Consistent transition on interactive elements:

```tsx
// Cards with lift on hover
<Card className="hover:shadow-elegant transition-all hover:-translate-y-0.5" />

// Shadow only
<Card className="hover:shadow-elegant transition-shadow" />
```

Base transition is defined as `--transition-base: all 0.25s cubic-bezier(0.4, 0, 0.2, 1)`.

---

## shadcn/ui Components

shadcn/ui style is `"default"` with `cssVariables: true`. Components live in `src/components/ui/`.

**Installed components (commonly used):**
- `Button` — variants: default, secondary, ghost, outline, destructive; sizes: default, sm, lg
- `Card` — use with `className` for custom padding (no default inner padding in the pattern here)
- `Input`, `Label`, `Textarea`
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogTrigger`
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`
- `Badge`
- `Avatar`
- `Tooltip`, `TooltipProvider`, `TooltipContent`, `TooltipTrigger`
- `Resizable` panels
- `Sidebar` (full sidebar component system)

Import from `@/components/ui/`:
```tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
```

Do not install new shadcn components via `npx shadcn add` without checking if an alternative already exists. Check `src/components/ui/` first.

---

## Icons

Uses **Lucide React** exclusively.

```tsx
import { GraduationCap, Users, BookOpen, CalendarDays, Award, ClipboardCheck, Video, Inbox, Wallet, Sparkles, Building2, LayoutDashboard } from "lucide-react";
```

Icon sizing conventions:
```tsx
h-4 w-4   // inline icons in buttons and text
h-5 w-5   // sidebar nav icons, toolbar icons
h-6 w-6   // feature icons inside coloured containers
h-8 w-8   // empty state icons (secondary)
h-12 w-12 // large empty state icons
```

Coloured icon container pattern (dashboard cards):
```tsx
<div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}>
  <c.icon className="h-5 w-5" />
</div>
```

---

## Empty States

Consistent empty state pattern inside a `Card`:

```tsx
<Card className="p-12 text-center">
  <Award className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
  <p className="text-muted-foreground">No certificates issued yet.</p>
</Card>
```

---

## Status Badges

Use `Badge` component with variant or custom `className` for pipeline statuses.

Suggested colour map for `pipeline_status`:

| Status | Colour |
|---|---|
| `applied` | `bg-info/10 text-info` |
| `shortlisted` | `bg-warning/15 text-warning` |
| `training_started` | `bg-primary/10 text-primary` |
| `ongoing` | `bg-primary/10 text-primary` |
| `completed` | `bg-success/10 text-success` |
| `certified` | `bg-accent/15 text-accent-foreground` |

For `batch_status`:

| Status | Colour |
|---|---|
| `draft` | `bg-muted text-muted-foreground` |
| `published` | `bg-info/10 text-info` |
| `in_progress` | `bg-primary/10 text-primary` |
| `completed` | `bg-success/10 text-success` |
| `archived` | `bg-muted text-muted-foreground` |

---

## Feature Lock Visual Pattern

### Full-page lock (`FeatureLockedPage`)

Gold lock icon in a circular gold-gradient container + heading + description + upgrade button.

```tsx
<div className="h-14 w-14 mx-auto rounded-full bg-gradient-gold flex items-center justify-center shadow-gold mb-4">
  <Lock className="h-6 w-6 text-accent-foreground" />
</div>
```

### Inline overlay (`LockedOverlay`)

Children are rendered dimmed/blurred beneath an overlay with an upgrade prompt. The underlying chart or content is still visible to signal what the feature looks like.

---

## Landing Page Conventions

The public landing page (`Landing.tsx`) and SEO pages use:
- `bg-gradient-hero text-primary-foreground` hero section
- Badge pill with animated pulse dot to signal "Built for Bangladesh"
- Feature cards in a `grid md:grid-cols-2 lg:grid-cols-3 gap-6` layout
- Pricing section in 3-column card layout
- Bangla (`পরবাসী`) integrated naturally in headlines — not as an afterthought

---

## Animations

`tailwindcss-animate` is installed. Currently only `accordion-down/up` keyframes are explicitly defined. Use sparingly:

```tsx
// Pulse dot (used in landing page badge)
<span className="h-2 w-2 rounded-full bg-accent animate-pulse" />

// Spinner
<Loader2 className="h-8 w-8 animate-spin text-primary" />
```

---

## Design Checklist for New Pages

Before shipping a new page, verify:

- [ ] Uses `<AppLayout>` shell
- [ ] Has `<PageHeader title="..." description="..." />`
- [ ] Content is inside `<div className="p-8 max-w-7xl mx-auto">`
- [ ] Empty state uses the standard Card + icon + muted text pattern
- [ ] All colours via token classes (no hardcoded colours)
- [ ] Hover states on interactive cards: `hover:shadow-elegant transition-shadow` or `transition-all hover:-translate-y-0.5`
- [ ] Loading states show `<Loader2 className="animate-spin" />` or a skeleton
- [ ] Toasts use Sonner (`import { toast } from "sonner"`)
- [ ] Feature-gated content checks `plan.locked.<feature>` and returns `<FeatureLockedPage>` or `<LockedOverlay>` as appropriate
- [ ] Icons from Lucide only
