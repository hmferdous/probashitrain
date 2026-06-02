export interface CertTemplate {
  id: string;
  name: string;
  description: string;
  accent: "gold" | "navy" | "emerald" | "minimal";
  border: string;
  layout: "classic" | "modern" | "elegant" | "minimal";
}

export const CERT_TEMPLATES: CertTemplate[] = [
  {
    id: "classic-gold",
    name: "Classic Gold",
    description: "Traditional double-bordered certificate with gold accents.",
    accent: "gold",
    border: "border-[12px] border-double border-accent",
    layout: "classic",
  },
  {
    id: "modern-navy",
    name: "Modern Navy",
    description: "Clean modern design with navy ribbon header.",
    accent: "navy",
    border: "border-[6px] border-primary/40",
    layout: "modern",
  },
  {
    id: "elegant-emerald",
    name: "Elegant Emerald",
    description: "Refined emerald frame for premium awards.",
    accent: "emerald",
    border: "border-[8px] border-success/50",
    layout: "elegant",
  },
  {
    id: "minimal-paper",
    name: "Minimal Paper",
    description: "Minimal off-white layout with subtle typography.",
    accent: "minimal",
    border: "border border-border",
    layout: "minimal",
  },
];

/* ---------------- Custom builder ---------------- */

export type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface Signatory {
  id: string;
  name: string;
  designation: string;
  company: string;
  signatureDataUrl: string | null;
  active: boolean;
}

export interface OtherLogo {
  id: string;
  dataUrl: string;
  name: string;
  position: LogoPosition;
}

export interface CertFrame {
  id: string;
  name: string;
  className: string; // applied to outer container
}

export interface CertBackground {
  id: string;
  name: string;
  className: string; // applied to outer container
}

export const CERT_FRAMES: CertFrame[] = [
  { id: "none", name: "None", className: "" },
  { id: "classic-double-gold", name: "Classic Double Gold", className: "border-[12px] border-double border-amber-500" },
  { id: "thin-navy", name: "Thin Navy", className: "border-4 border-blue-900" },
  { id: "elegant-emerald", name: "Elegant Emerald", className: "border-[8px] border-emerald-600/70 outline outline-2 outline-offset-4 outline-emerald-600/40" },
  { id: "ornate-corner", name: "Ornate Corners", className: "border-4 border-amber-700 shadow-[inset_0_0_0_3px_#f5deb3]" },
  { id: "minimal-paper", name: "Minimal Paper", className: "border border-neutral-300" },
];

export const CERT_BACKGROUNDS: CertBackground[] = [
  { id: "plain-white", name: "Plain White", className: "bg-white" },
  { id: "warm-paper", name: "Warm Paper", className: "bg-[#fdf8ee]" },
  { id: "soft-gold", name: "Soft Gold", className: "bg-gradient-to-br from-amber-50 via-white to-amber-100" },
  { id: "navy-tint", name: "Navy Tint", className: "bg-gradient-to-br from-blue-50 via-white to-blue-100" },
  { id: "emerald-tint", name: "Emerald Tint", className: "bg-gradient-to-br from-emerald-50 via-white to-emerald-100" },
  { id: "watermark-seal", name: "Watermark Seal", className: "bg-white bg-[radial-gradient(circle_at_center,_rgba(180,140,40,0.08)_0,_transparent_60%)]" },
];

export const CERT_VARIABLES = [
  { key: "student_name", label: "Student Name" },
  { key: "completion_date", label: "Completion Date" },
  { key: "session_end_date", label: "Session End Date" },
  { key: "course_end_date", label: "Course End Date" },
  { key: "course_name", label: "Course Name" },
] as const;

export type CertVariableKey = (typeof CERT_VARIABLES)[number]["key"];

export interface CustomBuilderConfig {
  companyName: string;
  companyLogoDataUrl: string | null;
  signatories: Signatory[];
  otherLogos: OtherLogo[];
  certificateText: string; // contains {{var}} placeholders
  frameId: string;
  backgroundId: string;
  updatedAt: string;
}

const DEFAULT_BUILDER: CustomBuilderConfig = {
  companyName: "",
  companyLogoDataUrl: null,
  signatories: [],
  otherLogos: [],
  certificateText:
    "This is to certify that {{student_name}} has successfully completed the training program {{course_name}} on {{completion_date}}.",
  frameId: "classic-double-gold",
  backgroundId: "warm-paper",
  updatedAt: new Date(0).toISOString(),
};

const BATCH_KEY = (batchId: string) => `cert_tpl_batch_${batchId}`;
const BUILDER_KEY = (centerId: string) => `cert_builder_${centerId}`;
const LEGACY_CUSTOM_KEY = (centerId: string) => `cert_tpl_custom_${centerId}`;

export const CUSTOM_BUILDER_ID = "custom-builder";

export function getBatchTemplateId(batchId: string): string {
  if (typeof window === "undefined") return CERT_TEMPLATES[0].id;
  return localStorage.getItem(BATCH_KEY(batchId)) || CERT_TEMPLATES[0].id;
}

export function setBatchTemplateId(batchId: string, templateId: string) {
  localStorage.setItem(BATCH_KEY(batchId), templateId);
}

export function getTemplateById(id: string): CertTemplate {
  return CERT_TEMPLATES.find((t) => t.id === id) ?? CERT_TEMPLATES[0];
}

export function isCustomTemplate(id: string) {
  return id === CUSTOM_BUILDER_ID;
}

export function getBuilderConfig(centerId: string): CustomBuilderConfig {
  if (typeof window === "undefined") return { ...DEFAULT_BUILDER };
  const raw = localStorage.getItem(BUILDER_KEY(centerId));
  if (!raw) return { ...DEFAULT_BUILDER };
  try {
    return { ...DEFAULT_BUILDER, ...(JSON.parse(raw) as CustomBuilderConfig) };
  } catch {
    return { ...DEFAULT_BUILDER };
  }
}

export function saveBuilderConfig(centerId: string, cfg: CustomBuilderConfig) {
  localStorage.setItem(
    BUILDER_KEY(centerId),
    JSON.stringify({ ...cfg, updatedAt: new Date().toISOString() }),
  );
}

export function hasBuilderConfig(centerId: string): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(BUILDER_KEY(centerId));
}

export function clearBuilderConfig(centerId: string) {
  localStorage.removeItem(BUILDER_KEY(centerId));
  localStorage.removeItem(LEGACY_CUSTOM_KEY(centerId));
}

export function getFrameById(id: string): CertFrame {
  return CERT_FRAMES.find((f) => f.id === id) ?? CERT_FRAMES[0];
}

export function getBackgroundById(id: string): CertBackground {
  return CERT_BACKGROUNDS.find((b) => b.id === id) ?? CERT_BACKGROUNDS[0];
}

export function renderCertificateText(
  text: string,
  values: Partial<Record<CertVariableKey, string>>,
): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => {
    const v = values[k as CertVariableKey];
    return v && v.trim() ? v : `{{${k}}}`;
  });
}
