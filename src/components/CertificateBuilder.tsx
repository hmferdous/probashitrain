import { useEffect, useRef, useState } from "react";
import {
  CertBackground,
  CertFrame,
  CERT_BACKGROUNDS,
  CERT_FRAMES,
  CERT_VARIABLES,
  CertVariableKey,
  CustomBuilderConfig,
  LogoPosition,
  OtherLogo,
  Signatory,
  getBuilderConfig,
  renderCertificateText,
  saveBuilderConfig,
} from "@/lib/certificateTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  Save,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";

const MAX_ACTIVE_SIGNATORIES = 3;
const PREVIEW_VALUES: Record<CertVariableKey, string> = {
  student_name: "Md. Rahim Uddin",
  completion_date: "12 May 2026",
  session_end_date: "30 April 2026",
  course_end_date: "30 April 2026",
  course_name: "Industrial Electrical Wiring",
};

interface Props {
  centerId: string;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CertificateBuilder({ centerId }: Props) {
  const [cfg, setCfg] = useState<CustomBuilderConfig>(() => getBuilderConfig(centerId));
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCfg(getBuilderConfig(centerId));
  }, [centerId]);

  const update = (patch: Partial<CustomBuilderConfig>) =>
    setCfg((c) => ({ ...c, ...patch }));

  const handleSave = () => {
    saveBuilderConfig(centerId, cfg);
    toast.success("Certificate design saved");
  };

  /* ---------- company logo ---------- */
  const handleCompanyLogo = async (f: File | null) => {
    if (!f) return;
    if (!["image/png", "image/svg+xml"].includes(f.type)) {
      toast.error("Logo must be PNG or SVG");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB");
      return;
    }
    update({ companyLogoDataUrl: await fileToDataUrl(f) });
  };

  /* ---------- signatories ---------- */
  const addSignatory = () => {
    if (cfg.signatories.length >= 6) {
      toast.error("Maximum 6 signatories");
      return;
    }
    const activeCount = cfg.signatories.filter((s) => s.active).length;
    const newSig: Signatory = {
      id: uid(),
      name: "",
      designation: "",
      company: "",
      signatureDataUrl: null,
      active: activeCount < MAX_ACTIVE_SIGNATORIES,
    };
    update({ signatories: [...cfg.signatories, newSig] });
  };

  const updateSignatory = (id: string, patch: Partial<Signatory>) => {
    update({
      signatories: cfg.signatories.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  };

  const toggleSignatoryActive = (id: string, active: boolean) => {
    if (active) {
      const activeCount = cfg.signatories.filter((s) => s.active).length;
      if (activeCount >= MAX_ACTIVE_SIGNATORIES) {
        toast.error(`Maximum ${MAX_ACTIVE_SIGNATORIES} active signatories at a time`);
        return;
      }
    }
    updateSignatory(id, { active });
  };

  const removeSignatory = (id: string) =>
    update({ signatories: cfg.signatories.filter((s) => s.id !== id) });

  const handleSignatureUpload = async (id: string, f: File | null) => {
    if (!f) return;
    if (f.size > 1 * 1024 * 1024) {
      toast.error("Signature must be under 1 MB");
      return;
    }
    updateSignatory(id, { signatureDataUrl: await fileToDataUrl(f) });
  };

  /* ---------- other logos ---------- */
  const addOtherLogo = async (f: File | null) => {
    if (!f) return;
    if (cfg.otherLogos.length >= 4) {
      toast.error("Maximum 4 additional logos");
      return;
    }
    const dataUrl = await fileToDataUrl(f);
    const newLogo: OtherLogo = {
      id: uid(),
      dataUrl,
      name: f.name,
      position: "top-right",
    };
    update({ otherLogos: [...cfg.otherLogos, newLogo] });
  };

  const updateOtherLogo = (id: string, patch: Partial<OtherLogo>) =>
    update({
      otherLogos: cfg.otherLogos.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });

  const removeOtherLogo = (id: string) =>
    update({ otherLogos: cfg.otherLogos.filter((l) => l.id !== id) });

  /* ---------- variable insert ---------- */
  const insertVariable = (key: CertVariableKey) => {
    const el = textRef.current;
    const token = `{{${key}}}`;
    if (!el) {
      update({ certificateText: cfg.certificateText + " " + token });
      return;
    }
    const start = el.selectionStart ?? cfg.certificateText.length;
    const end = el.selectionEnd ?? start;
    const next =
      cfg.certificateText.slice(0, start) + token + cfg.certificateText.slice(end);
    update({ certificateText: next });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleVarDragStart = (e: React.DragEvent, key: CertVariableKey) => {
    e.dataTransfer.setData("text/plain", `{{${key}}}`);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleTextDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const token = e.dataTransfer.getData("text/plain");
    if (!token) return;
    e.preventDefault();
    const el = textRef.current;
    if (!el) return;
    const start = el.selectionStart ?? cfg.certificateText.length;
    const end = el.selectionEnd ?? start;
    const next =
      cfg.certificateText.slice(0, start) + token + cfg.certificateText.slice(end);
    update({ certificateText: next });
  };

  return (
    <div className="grid lg:grid-cols-[420px_1fr] gap-6">
      {/* ============== Controls ============== */}
      <div className="space-y-6">
        {/* Company */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Company</h3>
            <Badge variant="outline" className="border-accent/50 text-accent">
              Premium
            </Badge>
          </div>
          <div>
            <Label>Company name</Label>
            <Input
              value={cfg.companyName}
              onChange={(e) => update({ companyName: e.target.value })}
              placeholder="e.g. Probashi Training Center"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Company logo (PNG / SVG)</Label>
            <div className="mt-1 flex items-center gap-3">
              <div className="h-16 w-16 rounded border bg-muted flex items-center justify-center overflow-hidden">
                {cfg.companyLogoDataUrl ? (
                  <img src={cfg.companyLogoDataUrl} alt="" className="max-h-full max-w-full" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <Input
                type="file"
                accept="image/png,image/svg+xml"
                onChange={(e) => handleCompanyLogo(e.target.files?.[0] ?? null)}
              />
              {cfg.companyLogoDataUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => update({ companyLogoDataUrl: null })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Signatories */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Signatories</h3>
              <p className="text-xs text-muted-foreground">
                Up to {MAX_ACTIVE_SIGNATORIES} active at a time.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={addSignatory} className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>

          {cfg.signatories.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed rounded p-4 text-center">
              No signatories yet.
            </div>
          ) : (
            <div className="space-y-3">
              {cfg.signatories.map((s) => (
                <div key={s.id} className="border rounded-md p-3 space-y-2 bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={s.active}
                        onCheckedChange={(v) => toggleSignatoryActive(s.id, v)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {s.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSignatory(s.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Name"
                      value={s.name}
                      onChange={(e) => updateSignatory(s.id, { name: e.target.value })}
                    />
                    <Input
                      placeholder="Designation"
                      value={s.designation}
                      onChange={(e) =>
                        updateSignatory(s.id, { designation: e.target.value })
                      }
                    />
                  </div>
                  <Input
                    placeholder="Company / Organisation"
                    value={s.company}
                    onChange={(e) => updateSignatory(s.id, { company: e.target.value })}
                  />
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-24 border rounded bg-muted flex items-center justify-center overflow-hidden">
                      {s.signatureDataUrl ? (
                        <img
                          src={s.signatureDataUrl}
                          alt=""
                          className="max-h-full max-w-full"
                        />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">
                          Signature
                        </span>
                      )}
                    </div>
                    <Input
                      type="file"
                      accept="image/png,image/svg+xml,image/jpeg"
                      onChange={(e) =>
                        handleSignatureUpload(s.id, e.target.files?.[0] ?? null)
                      }
                      className="text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Certificate text */}
        <Card className="p-5 space-y-3">
          <div>
            <h3 className="font-semibold">Certificate text</h3>
            <p className="text-xs text-muted-foreground">
              Click or drag a variable into the text. Variables are filled per student.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CERT_VARIABLES.map((v) => (
              <button
                key={v.key}
                type="button"
                draggable
                onDragStart={(e) => handleVarDragStart(e, v.key)}
                onClick={() => insertVariable(v.key)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border bg-accent/10 hover:bg-accent/20 cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="h-3 w-3 text-muted-foreground" />
                {v.label}
              </button>
            ))}
          </div>
          <Textarea
            ref={textRef}
            rows={5}
            value={cfg.certificateText}
            onChange={(e) => update({ certificateText: e.target.value })}
            onDrop={handleTextDrop}
            onDragOver={(e) => e.preventDefault()}
            placeholder="This is to certify that {{student_name}} has completed..."
          />
        </Card>

        {/* Other logos */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Other logos (optional)</h3>
              <p className="text-xs text-muted-foreground">
                Partner / accreditation logos. Pick a position.
              </p>
            </div>
            <label className="inline-flex">
              <input
                type="file"
                accept="image/png,image/svg+xml,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  addOtherLogo(e.target.files?.[0] ?? null);
                  e.currentTarget.value = "";
                }}
              />
              <span className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 cursor-pointer hover:bg-accent/10">
                <Upload className="h-4 w-4" /> Add
              </span>
            </label>
          </div>
          {cfg.otherLogos.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed rounded p-4 text-center">
              No additional logos.
            </div>
          ) : (
            <div className="space-y-2">
              {cfg.otherLogos.map((l) => (
                <div key={l.id} className="flex items-center gap-2 border rounded p-2">
                  <img src={l.dataUrl} alt="" className="h-10 w-10 object-contain" />
                  <div className="flex-1 min-w-0 text-xs truncate">{l.name}</div>
                  <Select
                    value={l.position}
                    onValueChange={(v) =>
                      updateOtherLogo(l.id, { position: v as LogoPosition })
                    }
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-left">Top left</SelectItem>
                      <SelectItem value="top-right">Top right</SelectItem>
                      <SelectItem value="bottom-left">Bottom left</SelectItem>
                      <SelectItem value="bottom-right">Bottom right</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOtherLogo(l.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Frame & background */}
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold">Frame & background</h3>
          <div>
            <Label className="text-xs">Frame</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {CERT_FRAMES.map((f) => (
                <FrameSwatch
                  key={f.id}
                  frame={f}
                  active={cfg.frameId === f.id}
                  onClick={() => update({ frameId: f.id })}
                />
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Background</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {CERT_BACKGROUNDS.map((b) => (
                <BackgroundSwatch
                  key={b.id}
                  bg={b}
                  active={cfg.backgroundId === b.id}
                  onClick={() => update({ backgroundId: b.id })}
                />
              ))}
            </div>
          </div>
        </Card>

        <Button onClick={handleSave} size="lg" className="w-full gap-2">
          <Save className="h-4 w-4" /> Save certificate design
        </Button>
      </div>

      {/* ============== Live preview ============== */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Live preview</div>
        <BuiltCertificate cfg={cfg} values={PREVIEW_VALUES} />
        <p className="text-xs text-muted-foreground">
          Variables shown with sample data. Assign this design to a batch under the
          Templates tab to use it.
        </p>
      </div>
    </div>
  );
}

function FrameSwatch({
  frame,
  active,
  onClick,
}: {
  frame: CertFrame;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "aspect-[1.414/1] rounded bg-white flex items-center justify-center text-[10px] text-muted-foreground p-1",
        frame.className,
        active && "ring-2 ring-primary ring-offset-2",
      )}
    >
      {frame.name}
    </button>
  );
}

function BackgroundSwatch({
  bg,
  active,
  onClick,
}: {
  bg: CertBackground;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "aspect-[1.414/1] rounded border flex items-center justify-center text-[10px] text-muted-foreground p-1",
        bg.className,
        active && "ring-2 ring-primary ring-offset-2",
      )}
    >
      {bg.name}
    </button>
  );
}

/* =================== Renderer (used in builder preview and Certificate page) =================== */

export function BuiltCertificate({
  cfg,
  values,
}: {
  cfg: CustomBuilderConfig;
  values: Partial<Record<CertVariableKey, string>>;
}) {
  const frame = CERT_FRAMES.find((f) => f.id === cfg.frameId) ?? CERT_FRAMES[0];
  const bg = CERT_BACKGROUNDS.find((b) => b.id === cfg.backgroundId) ?? CERT_BACKGROUNDS[0];
  const rendered = renderCertificateText(cfg.certificateText, values);
  const activeSigs = cfg.signatories.filter((s) => s.active).slice(0, MAX_ACTIVE_SIGNATORIES);

  const cornerLogo = (pos: LogoPosition) => {
    const logos = cfg.otherLogos.filter((l) => l.position === pos);
    if (logos.length === 0) return null;
    const posClasses: Record<LogoPosition, string> = {
      "top-left": "top-4 left-4",
      "top-right": "top-4 right-4",
      "bottom-left": "bottom-4 left-4",
      "bottom-right": "bottom-4 right-4",
    };
    return (
      <div className={cn("absolute flex gap-2 items-center", posClasses[pos])}>
        {logos.map((l) => (
          <img key={l.id} src={l.dataUrl} alt="" className="h-10 max-w-[80px] object-contain" />
        ))}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "relative aspect-[1.414/1] rounded-lg shadow-elegant overflow-hidden p-10 flex flex-col items-center text-center text-neutral-900",
        bg.className,
        frame.className,
      )}
    >
      {cornerLogo("top-left")}
      {cornerLogo("top-right")}
      {cornerLogo("bottom-left")}
      {cornerLogo("bottom-right")}

      {/* Header */}
      <div className="flex flex-col items-center gap-2 mt-2">
        {cfg.companyLogoDataUrl && (
          <img
            src={cfg.companyLogoDataUrl}
            alt=""
            className="h-16 max-w-[180px] object-contain"
          />
        )}
        {cfg.companyName && (
          <div className="text-xl font-bold tracking-wide">{cfg.companyName}</div>
        )}
        <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 mt-1">
          Certificate of Completion
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="text-lg leading-relaxed whitespace-pre-wrap max-w-2xl">
          {rendered}
        </p>
      </div>

      {/* Signatories */}
      {activeSigs.length > 0 && (
        <div
          className={cn(
            "grid gap-6 w-full max-w-3xl mt-2",
            activeSigs.length === 1 && "grid-cols-1",
            activeSigs.length === 2 && "grid-cols-2",
            activeSigs.length === 3 && "grid-cols-3",
          )}
        >
          {activeSigs.map((s) => (
            <div key={s.id} className="flex flex-col items-center">
              <div className="h-10 flex items-end justify-center">
                {s.signatureDataUrl && (
                  <img
                    src={s.signatureDataUrl}
                    alt=""
                    className="max-h-full max-w-[140px] object-contain"
                  />
                )}
              </div>
              <div className="border-t w-40 mt-1 pt-1 text-xs">
                <div className="font-semibold">{s.name || "—"}</div>
                <div className="text-neutral-600 text-[11px]">{s.designation}</div>
                <div className="text-neutral-500 text-[10px]">{s.company}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
