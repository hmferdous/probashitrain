// Single source of truth for status badge label + color across the app.
// Previously each page (BatchDetail, Batches, Payments) defined its own map;
// they drifted from each other and from docs/design.md. Import from here instead.

export interface StatusStyle {
  label: string;
  color: string; // Tailwind token classes only — no hardcoded palette colors
}

export type PipelineStatus =
  | "applied" | "shortlisted" | "training_started" | "ongoing"
  | "completed" | "certified" | "rejected";

export const PIPELINE_STATUS_CONFIG: Record<PipelineStatus, StatusStyle> = {
  applied:          { label: "Applied",      color: "bg-info/15 text-info border-info/30" },
  shortlisted:      { label: "Shortlisted",  color: "bg-warning/15 text-warning border-warning/30" },
  training_started: { label: "In Training",  color: "bg-primary/15 text-primary border-primary/30" },
  ongoing:          { label: "In Training",  color: "bg-primary/15 text-primary border-primary/30" },
  completed:        { label: "Completed",    color: "bg-success/15 text-success border-success/30" },
  certified:        { label: "Certified",    color: "bg-accent/15 text-accent-foreground border-accent/30" },
  rejected:         { label: "Rejected",     color: "bg-destructive/15 text-destructive border-destructive/30" },
};

export type BatchStatus = "draft" | "published" | "in_progress" | "completed" | "archived";

export const BATCH_STATUS_CONFIG: Record<BatchStatus, StatusStyle> = {
  draft:       { label: "Draft",       color: "bg-muted text-muted-foreground border-transparent" },
  published:   { label: "Published",   color: "bg-info/15 text-info border-info/30" },
  in_progress: { label: "In Progress", color: "bg-primary/15 text-primary border-primary/30" },
  completed:   { label: "Completed",   color: "bg-success/15 text-success border-success/30" },
  archived:    { label: "Archived",    color: "bg-muted text-muted-foreground border-transparent" },
};

export type FeePaymentStatus = "Paid" | "Partial" | "Unpaid";

export const PAYMENT_STATUS_CONFIG: Record<FeePaymentStatus, StatusStyle> = {
  Paid:    { label: "Paid",    color: "bg-success/15 text-success border-success/30" },
  Partial: { label: "Partial", color: "bg-warning/15 text-warning border-warning/30" },
  Unpaid:  { label: "Unpaid",  color: "bg-destructive/15 text-destructive border-destructive/30" },
};
