import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, SlidersHorizontal, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import ListSkeleton from "@/components/ListSkeleton";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { friendlyError } from "@/lib/errors";

type TemplateType = "numeric" | "scale";

interface Band { id?: string; label: string; min_value: string; max_value: string; sort_order: number; }
interface Template {
  id: string; name: string; type: TemplateType;
  min_score: number | null; max_score: number | null;
}

export default function GradingSettings() {
  const { center } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [bandsByTemplate, setBandsByTemplate] = useState<Record<string, Band[]>>({});
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [type, setType] = useState<TemplateType>("numeric");
  const [name, setName] = useState("");
  const [minScore, setMinScore] = useState("0");
  const [maxScore, setMaxScore] = useState("100");
  const [bands, setBands] = useState<Band[]>([]);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Template | null>(null);

  const load = async () => {
    if (!center) return;
    const { data: t } = await (supabase.from("grading_templates" as any) as any)
      .select("*").eq("center_id", center.id).order("created_at", { ascending: true });
    const list = (t as any) ?? [];
    setTemplates(list);
    const ids = list.map((x: Template) => x.id);
    if (ids.length) {
      const { data: b } = await (supabase.from("grading_bands" as any) as any)
        .select("*").in("template_id", ids).order("sort_order", { ascending: true });
      const grouped: Record<string, Band[]> = {};
      (b ?? []).forEach((row: any) => {
        (grouped[row.template_id] ??= []).push({
          id: row.id, label: row.label,
          min_value: row.min_value != null ? String(row.min_value) : "",
          max_value: row.max_value != null ? String(row.max_value) : "",
          sort_order: row.sort_order,
        });
      });
      setBandsByTemplate(grouped);
    } else {
      setBandsByTemplate({});
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [center]);

  const resetForm = () => {
    setEditing(null); setType("numeric"); setName("");
    setMinScore("0"); setMaxScore("100"); setBands([]);
  };

  const openCreate = () => { resetForm(); setOpen(true); };
  const openEditDialog = (t: Template) => {
    setEditing(t);
    setType(t.type);
    setName(t.name);
    setMinScore(t.min_score != null ? String(t.min_score) : "0");
    setMaxScore(t.max_score != null ? String(t.max_score) : "100");
    setBands((bandsByTemplate[t.id] ?? []).map((b) => ({ ...b })));
    setOpen(true);
  };

  const addBand = () => {
    setBands((prev) => [...prev, { label: "", min_value: "", max_value: "", sort_order: prev.length + 1 }]);
  };
  const updateBand = (i: number, patch: Partial<Band>) =>
    setBands((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const removeBand = (i: number) =>
    setBands((prev) => prev.filter((_, idx) => idx !== i).map((b, idx) => ({ ...b, sort_order: idx + 1 })));
  const moveBand = (i: number, dir: -1 | 1) => {
    setBands((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((b, idx) => ({ ...b, sort_order: idx + 1 }));
    });
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!center) return;
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (type === "numeric") {
      const min = Number(minScore), max = Number(maxScore);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
        toast.error("Enter a valid score range (min less than max)");
        return;
      }
      for (const b of bands) {
        if (!b.label.trim()) { toast.error("Every band needs a label"); return; }
      }
    } else {
      if (bands.length < 2) { toast.error("Add at least two grade labels"); return; }
      for (const b of bands) {
        if (!b.label.trim()) { toast.error("Every grade needs a label"); return; }
      }
    }
    setSaving(true);

    const templatePayload: any = {
      center_id: center.id,
      name: name.trim(),
      type,
      min_score: type === "numeric" ? Number(minScore) : null,
      max_score: type === "numeric" ? Number(maxScore) : null,
    };

    let templateId = editing?.id;
    if (editing) {
      const { error } = await (supabase.from("grading_templates" as any) as any)
        .update({ name: templatePayload.name, min_score: templatePayload.min_score, max_score: templatePayload.max_score })
        .eq("id", editing.id);
      if (error) { setSaving(false); toast.error(friendlyError(error)); return; }
      await (supabase.from("grading_bands" as any) as any).delete().eq("template_id", editing.id);
    } else {
      const { data: created, error } = await (supabase.from("grading_templates" as any) as any)
        .insert(templatePayload).select("id").single();
      if (error || !created) { setSaving(false); toast.error(friendlyError(error, "Failed to create template")); return; }
      templateId = created.id;
    }

    if (bands.length) {
      const rows = bands.map((b, idx) => ({
        template_id: templateId,
        label: b.label.trim(),
        min_value: type === "numeric" && b.min_value !== "" ? Number(b.min_value) : null,
        max_value: type === "numeric" && b.max_value !== "" ? Number(b.max_value) : null,
        sort_order: idx + 1,
      }));
      const { error: bandErr } = await (supabase.from("grading_bands" as any) as any).insert(rows);
      if (bandErr) { setSaving(false); toast.error(friendlyError(bandErr, "Failed to save grade bands")); return; }
    }

    setSaving(false);
    toast.success(editing ? "Template updated" : "Template created");
    setOpen(false); resetForm();
    load();
  };

  const handleDelete = async (t: Template) => {
    const { error } = await (supabase.from("grading_templates" as any) as any).delete().eq("id", t.id);
    if (error) { toast.error(friendlyError(error)); return; }
    setPendingDelete(null);
    toast.success("Template deleted");
    load();
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <PageHeader
          title="Grading"
          description="Define how students are graded — numeric scores, letter grades, or a custom label scale — and attach one to each batch."
          action={
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> New template</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit grading template" : "New grading template"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select value={type} onValueChange={(v) => setType(v as TemplateType)} disabled={!!editing}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="numeric">Numeric — a raw score (0–100, percentage, GPA, etc.)</SelectItem>
                        <SelectItem value="scale">Scale — labels only, no number (Pass/Fail, Excellent–Poor)</SelectItem>
                      </SelectContent>
                    </Select>
                    {editing && <p className="text-xs text-muted-foreground">Type can't be changed after creation — create a new template instead.</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template_name">Name *</Label>
                    <Input id="template_name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={type === "numeric" ? "Percentage" : "Pass / Fail"} />
                  </div>

                  {type === "numeric" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Min score *</Label>
                        <Input type="number" value={minScore} onChange={(e) => setMinScore(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Max score *</Label>
                        <Input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>
                        {type === "numeric" ? (
                          <>Bands <span className="text-muted-foreground text-xs font-normal">(optional — shows a label for a score range, e.g. 90–100 → A+)</span></>
                        ) : (
                          <>Grade labels *</>
                        )}
                      </Label>
                      <Button type="button" size="sm" variant="outline" onClick={addBand}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add {type === "numeric" ? "band" : "grade"}
                      </Button>
                    </div>
                    {bands.length > 0 && (
                      <ul className="space-y-1.5">
                        {bands.map((b, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <div className="flex flex-col">
                              <button type="button" disabled={i === 0} onClick={() => moveBand(i, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-[10px] leading-none">▲</button>
                              <button type="button" disabled={i === bands.length - 1} onClick={() => moveBand(i, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-[10px] leading-none">▼</button>
                            </div>
                            <Input
                              placeholder="Label (e.g. A+, Pass)"
                              value={b.label}
                              onChange={(e) => updateBand(i, { label: e.target.value })}
                              className="flex-1"
                              maxLength={30}
                            />
                            {type === "numeric" && (
                              <>
                                <Input
                                  type="number" placeholder="Min" className="w-20"
                                  value={b.min_value} onChange={(e) => updateBand(i, { min_value: e.target.value })}
                                />
                                <Input
                                  type="number" placeholder="Max" className="w-20"
                                  value={b.max_value} onChange={(e) => updateBand(i, { max_value: e.target.value })}
                                />
                              </>
                            )}
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removeBand(i)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? "Saving…" : editing ? "Save changes" : "Create template"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        {loading ? (
          <ListSkeleton variant="cards" />
        ) : templates.length === 0 ? (
          <EmptyState icon={SlidersHorizontal} message="No grading templates yet." />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {templates.map((t) => {
              const tBands = bandsByTemplate[t.id] ?? [];
              return (
                <Card key={t.id} className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <Badge variant="secondary" className="mb-2">{t.type === "numeric" ? "Numeric" : "Scale"}</Badge>
                      <h3 className="font-semibold text-lg">{t.name}</h3>
                      {t.type === "numeric" && (
                        <p className="text-xs text-muted-foreground">Range {t.min_score}–{t.max_score}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEditDialog(t)} aria-label={`Edit ${t.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setPendingDelete(t)} aria-label={`Delete ${t.name}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {tBands.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tBands.map((b) => (
                        <span key={b.label} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {b.label}
                          {t.type === "numeric" && b.min_value !== "" && b.max_value !== "" && (
                            <span className="text-muted-foreground"> ({b.min_value}–{b.max_value})</span>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-2">No bands — raw score only.</p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Delete this grading template?"
        description={`"${pendingDelete?.name}" will be permanently removed. This cannot be undone.`}
        onConfirm={() => pendingDelete && handleDelete(pendingDelete)}
      />
    </AppLayout>
  );
}
