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

const BATCH_KEY = (batchId: string) => `cert_tpl_batch_${batchId}`;
const CUSTOM_KEY = (centerId: string) => `cert_tpl_custom_${centerId}`;

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

export interface CustomCertPdf {
  name: string;
  dataUrl: string;
  uploadedAt: string;
}

export function getCustomPdf(centerId: string): CustomCertPdf | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CUSTOM_KEY(centerId));
  return raw ? (JSON.parse(raw) as CustomCertPdf) : null;
}

export function setCustomPdf(centerId: string, pdf: CustomCertPdf | null) {
  if (pdf === null) localStorage.removeItem(CUSTOM_KEY(centerId));
  else localStorage.setItem(CUSTOM_KEY(centerId), JSON.stringify(pdf));
}

export function isCustomTemplate(id: string) {
  return id === "custom-pdf";
}
