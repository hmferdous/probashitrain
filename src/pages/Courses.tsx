import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePlan } from "@/lib/plan";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, BookOpen, Trash2, Clock, FileText, Upload, X, Download, Search, Pencil } from "lucide-react";
import { toast } from "sonner";

type EligibilityGender = "any" | "male" | "female";
type EducationLevel = "none" | "jsc" | "ssc" | "hsc" | "diploma" | "bachelors" | "masters";
type DurationUnit = "hours" | "days" | "weeks" | "months";
type DocType = "nid" | "education_certificate" | "cv" | "training_certificate" | "photo" | "other";

const EDUCATION_LABELS: Record<EducationLevel, string> = {
  none: "No requirement", jsc: "JSC", ssc: "SSC", hsc: "HSC",
  diploma: "Diploma", bachelors: "Bachelor's", masters: "Master's",
};
const DOC_TYPE_LABELS: Record<DocType, string> = {
  nid: "NID", education_certificate: "Education certificate", cv: "CV",
  training_certificate: "Training certificate", photo: "Photo", other: "Other",
};

interface Course {
  id: string; code: string; title: string; description: string | null;
  description_bn: string | null;
  duration_hours: number; price: number | null;
  duration_value: number | null; duration_unit: DurationUnit | null;
  requirements_text: string | null;
  eligibility_gender: EligibilityGender | null;
  eligibility_min_age: number | null;
  eligibility_max_age: number | null;
  eligibility_education: EducationLevel | null;
  trade_id: string | null; tags: string[] | null;
  trades?: { name: string } | null;
}
interface Trade { id: string; name: string; }
interface Material {
  id: string; course_id: string; file_name: string; file_path: string;
  mime_type: string | null; size_bytes: number | null;
}
interface DocRequirement { doc_type: DocType; mandatory: boolean; }

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const formatSize = (n: number | null) => {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

export default function Courses() {
  const { center, user } = useAuth();
  const { plan } = usePlan();
  const [courses, setCourses] = useState<Course[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [tradeId, setTradeId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("hours");
  const [eligGender, setEligGender] = useState<EligibilityGender | "">("");
  const [eligEducation, setEligEducation] = useState<EducationLevel | "">("");
  const [docRequirements, setDocRequirements] = useState<DocRequirement[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [manageCourse, setManageCourse] = useState<Course | null>(null);
  const [filterTrade, setFilterTrade] = useState<string>("");
  const [filterTag, setFilterTag] = useState<string>("");
  const [search, setSearch] = useState("");

  const [docReqsByCourse, setDocReqsByCourse] = useState<Record<string, DocRequirement[]>>({});

  const openEdit = (c: Course) => {
    setEditing(c);
    setTradeId(c.trade_id ?? "");
    setTags(c.tags ?? []);
    setTagInput("");
    setPendingFiles([]);
    setDurationUnit(c.duration_unit ?? "hours");
    setEligGender(c.eligibility_gender ?? "");
    setEligEducation(c.eligibility_education ?? "");
    setDocRequirements(docReqsByCourse[c.id] ?? []);
    setOpen(true);
  };

  const load = async () => {
    if (!center) return;
    const [c, m, t] = await Promise.all([
      supabase.from("courses").select("*, trades(name)").eq("center_id", center.id).order("created_at", { ascending: false }),
      supabase.from("course_materials").select("*").eq("center_id", center.id).order("created_at", { ascending: false }),
      supabase.from("trades").select("id, name").eq("center_id", center.id).order("name"),
    ]);
    const courseList = (c.data as any) ?? [];
    setCourses(courseList);
    setMaterials((m.data as any) ?? []);
    setTrades(t.data ?? []);
    const ids = courseList.map((x: Course) => x.id);
    if (ids.length) {
      const { data: docs } = await supabase
        .from("course_document_requirements")
        .select("course_id, doc_type, mandatory")
        .in("course_id", ids);
      const grouped: Record<string, DocRequirement[]> = {};
      (docs ?? []).forEach((d: any) => {
        (grouped[d.course_id] ??= []).push({ doc_type: d.doc_type, mandatory: d.mandatory });
      });
      setDocReqsByCourse(grouped);
    } else {
      setDocReqsByCourse({});
    }
  };
  useEffect(() => { load(); }, [center]);

  const tagSuggestions = useMemo(
    () => Array.from(new Set(courses.flatMap((c) => c.tags ?? []))).sort(),
    [courses]
  );

  const resetForm = () => {
    setEditing(null);
    setTradeId(""); setTags([]); setTagInput(""); setPendingFiles([]);
    setDurationUnit("hours"); setEligGender(""); setEligEducation(""); setDocRequirements([]);
  };

  const addDocRequirement = () =>
    setDocRequirements((p) => [...p, { doc_type: "other", mandatory: true }]);
  const updateDocRequirement = (i: number, patch: Partial<DocRequirement>) =>
    setDocRequirements((p) => p.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const removeDocRequirement = (i: number) =>
    setDocRequirements((p) => p.filter((_, idx) => idx !== i));

  const addTag = (raw: string) => {
    const v = raw.trim().slice(0, 30);
    if (!v) return;
    if (tags.length >= 10) { toast.error("Up to 10 tags"); return; }
    if (tags.includes(v)) return;
    setTags((p) => [...p, v]);
    setTagInput("");
  };
  const onTagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags((p) => p.slice(0, -1));
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const ok: File[] = [];
    for (const f of files) {
      if (f.size > MAX_FILE_BYTES) { toast.error(`${f.name} exceeds 25 MB`); continue; }
      ok.push(f);
    }
    setPendingFiles((prev) => [...prev, ...ok]);
    e.target.value = "";
  };
  const removePending = (i: number) =>
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));

  const uploadFilesForCourse = async (courseId: string, files: File[]) => {
    if (!center) return;
    for (const f of files) {
      const safe = f.name.replace(/[^\w.\-]+/g, "_");
      const path = `${center.id}/${courseId}/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage
        .from("course-materials")
        .upload(path, f, { contentType: f.type || undefined });
      if (upErr) { toast.error(`Upload failed: ${f.name} — ${upErr.message}`); continue; }
      const { error: insErr } = await supabase.from("course_materials").insert({
        course_id: courseId, center_id: center.id,
        file_name: f.name, file_path: path,
        mime_type: f.type || null, size_bytes: f.size,
        uploaded_by: user?.id ?? null,
      });
      if (insErr) toast.error(`Saved file but record failed: ${insErr.message}`);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!center) return;
    if (!tradeId) { toast.error("Select a trade"); return; }
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: String(fd.get("title") || "").trim(),
      description: String(fd.get("description") || "").trim() || null,
      description_bn: String(fd.get("description_bn") || "").trim() || null,
      price: Number(fd.get("price") || 0),
      duration_value: fd.get("duration_value") ? Number(fd.get("duration_value")) : null,
      duration_unit: durationUnit,
      requirements_text: String(fd.get("requirements_text") || "").trim() || null,
      eligibility_gender: eligGender || null,
      eligibility_min_age: fd.get("eligibility_min_age") ? Number(fd.get("eligibility_min_age")) : null,
      eligibility_max_age: fd.get("eligibility_max_age") ? Number(fd.get("eligibility_max_age")) : null,
      eligibility_education: eligEducation || null,
      trade_id: tradeId || null,
      tags,
    };
    setSubmitting(true);

    const saveDocRequirements = async (courseId: string) => {
      await supabase.from("course_document_requirements").delete().eq("course_id", courseId);
      if (docRequirements.length) {
        await supabase.from("course_document_requirements").insert(
          docRequirements.map((d) => ({ course_id: courseId, doc_type: d.doc_type, mandatory: d.mandatory }))
        );
      }
    };

    if (editing) {
      const { error } = await supabase.from("courses").update(payload as any).eq("id", editing.id);
      if (error) { setSubmitting(false); toast.error(error.message); return; }
      await saveDocRequirements(editing.id);
      if (pendingFiles.length) await uploadFilesForCourse(editing.id, pendingFiles);
      setSubmitting(false);
      toast.success("Course updated");
      setOpen(false); resetForm();
      load();
      return;
    }

    if (plan.limits.maxPublishedCourses !== null && courses.length >= plan.limits.maxPublishedCourses) {
      setSubmitting(false);
      toast.error(`Your ${plan.name} plan allows up to ${plan.limits.maxPublishedCourses} courses. Upgrade to add more.`);
      return;
    }
    const { data: created, error } = await supabase.from("courses").insert({
      center_id: center.id,
      ...payload,
    } as any).select().single();
    if (error || !created) { setSubmitting(false); toast.error(error?.message || "Failed"); return; }
    await saveDocRequirements(created.id);
    if (pendingFiles.length) await uploadFilesForCourse(created.id, pendingFiles);
    setSubmitting(false);
    toast.success(`Course created${pendingFiles.length ? ` with ${pendingFiles.length} file(s)` : ""}`);
    setOpen(false); resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const handleAddMaterials = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!manageCourse) return;
    const files = Array.from(e.target.files ?? []);
    const ok = files.filter((f) => f.size <= MAX_FILE_BYTES || (toast.error(`${f.name} exceeds 25 MB`), false));
    if (!ok.length) return;
    setSubmitting(true);
    await uploadFilesForCourse(manageCourse.id, ok);
    setSubmitting(false);
    e.target.value = "";
    toast.success("Materials added");
    load();
  };

  const handleDeleteMaterial = async (m: Material) => {
    if (!confirm(`Remove "${m.file_name}"?`)) return;
    await supabase.storage.from("course-materials").remove([m.file_path]);
    const { error } = await supabase.from("course_materials").delete().eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removed");
    load();
  };

  const handleDownload = async (m: Material) => {
    const { data, error } = await supabase.storage
      .from("course-materials")
      .createSignedUrl(m.file_path, 60);
    if (error || !data) { toast.error(error?.message || "Download failed"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const materialsByCourse = (id: string) => materials.filter((m) => m.course_id === id);

  const displayBadge = (c: Course) => c.trades?.name ?? "No trade";

  const visibleCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (filterTrade && c.trade_id !== filterTrade) return false;
      if (filterTag && !(c.tags ?? []).includes(filterTag)) return false;
      if (q && !c.title.toLowerCase().includes(q) && !(c.description ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [courses, filterTrade, filterTag, search]);

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader
          title="Courses"
          description="Create courses directly — group them with a category and tags as you go."
          action={
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button disabled={plan.limits.maxPublishedCourses !== null && courses.length >= plan.limits.maxPublishedCourses}>
                  <Plus className="h-4 w-4 mr-2" /> Add course
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit course" : "New course"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4" key={editing?.id ?? "new"}>
                  {editing && (
                    <div className="space-y-2">
                      <Label>Course code</Label>
                      <Input value={editing.code} readOnly disabled className="font-mono bg-muted/50" />
                      <p className="text-xs text-muted-foreground">Auto-generated. Cannot be changed.</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input id="title" name="title" required maxLength={150} defaultValue={editing?.title ?? ""} placeholder="Industrial Wiring Level 1" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trade">Trade *</Label>
                    <Select value={tradeId} onValueChange={setTradeId}>
                      <SelectTrigger id="trade">
                        <SelectValue placeholder={trades.length ? "Select a trade" : "No trades yet — create one first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {trades.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {trades.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        <Link to="/app/trades" className="text-primary font-medium">Create a trade</Link> before adding a course.
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Tags (e.g. online / in-person) are set per batch, not here — one course can run as multiple batches.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (English)</Label>
                    <Textarea id="description" name="description" rows={3} maxLength={1000} defaultValue={editing?.description ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description_bn">Description (Bangla)</Label>
                    <Textarea id="description_bn" name="description_bn" rows={3} maxLength={1000} defaultValue={editing?.description_bn ?? ""} />
                  </div>

                  <div className="space-y-3 border rounded-md p-3">
                    <Label>Requirements</Label>
                    <p className="text-xs text-muted-foreground">Used to gate who can apply on the app. Leave any field unset for no restriction.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-normal">Gender</Label>
                        <Select value={eligGender || "unset"} onValueChange={(v) => setEligGender(v === "unset" ? "" : (v as EligibilityGender))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unset">No restriction</SelectItem>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-normal">Education</Label>
                        <Select value={eligEducation || "unset"} onValueChange={(v) => setEligEducation(v === "unset" ? "" : (v as EducationLevel))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unset">No restriction</SelectItem>
                            {(Object.keys(EDUCATION_LABELS) as EducationLevel[]).map((k) => (
                              <SelectItem key={k} value={k}>{EDUCATION_LABELS[k]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="eligibility_min_age" className="text-xs font-normal">Min age</Label>
                        <Input id="eligibility_min_age" name="eligibility_min_age" type="number" min={0} defaultValue={editing?.eligibility_min_age ?? ""} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="eligibility_max_age" className="text-xs font-normal">Max age</Label>
                        <Input id="eligibility_max_age" name="eligibility_max_age" type="number" min={0} defaultValue={editing?.eligibility_max_age ?? ""} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="requirements_text" className="text-xs text-muted-foreground font-normal">Additional notes (optional, shown to applicants)</Label>
                      <Textarea id="requirements_text" name="requirements_text" rows={2} maxLength={500} defaultValue={editing?.requirements_text ?? ""} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration_value">Duration</Label>
                      <div className="flex gap-2">
                        <Input id="duration_value" name="duration_value" type="number" min={1} className="w-20" defaultValue={editing?.duration_value ?? 40} />
                        <Select value={durationUnit} onValueChange={(v) => setDurationUnit(v as DurationUnit)}>
                          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                            <SelectItem value="weeks">Weeks</SelectItem>
                            <SelectItem value="months">Months</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (BDT)</Label>
                      <Input id="price" name="price" type="number" defaultValue={editing?.price ?? 0} min={0} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Document requirements</Label>
                    {docRequirements.length > 0 && (
                      <ul className="space-y-1.5">
                        {docRequirements.map((d, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Select value={d.doc_type} onValueChange={(v) => updateDocRequirement(i, { doc_type: v as DocType })}>
                              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map((k) => (
                                  <SelectItem key={k} value={k}>{DOC_TYPE_LABELS[k]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                              <input type="checkbox" checked={d.mandatory} onChange={(e) => updateDocRequirement(i, { mandatory: e.target.checked })} />
                              Mandatory
                            </label>
                            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeDocRequirement(i)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={addDocRequirement}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add document requirement
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Reading materials (optional)</Label>
                    <label className="flex items-center justify-center gap-2 border border-dashed rounded-md p-4 cursor-pointer hover:bg-muted/40 text-sm text-muted-foreground">
                      <Upload className="h-4 w-4" />
                      <span>Click to add files — PDF, DOCX, PPTX, images (max 25 MB each)</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFilePick}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,image/*"
                      />
                    </label>
                    {pendingFiles.length > 0 && (
                      <ul className="space-y-1.5">
                        {pendingFiles.map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm bg-muted/40 rounded px-2 py-1.5">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 truncate">{f.name}</span>
                            <span className="text-xs text-muted-foreground">{formatSize(f.size)}</span>
                            <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => removePending(i)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Saving…" : editing ? "Save changes" : "Create course"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        {plan.limits.maxPublishedCourses !== null && (
          <Card className="p-3 mb-4 flex items-center justify-between bg-muted/30">
            <div className="text-sm">
              <span className="font-medium">{courses.length}</span>
              <span className="text-muted-foreground"> / {plan.limits.maxPublishedCourses} courses on {plan.name}</span>
            </div>
            {courses.length >= plan.limits.maxPublishedCourses && (
              <Link to="/app/plans" className="text-xs text-primary font-medium">Upgrade for unlimited →</Link>
            )}
          </Card>
        )}

        {courses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses…"
                className="pl-8 h-9"
              />
            </div>
            <select
              value={filterTrade}
              onChange={(e) => setFilterTrade(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">All trades</option>
              {trades.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {tagSuggestions.length > 0 && (
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              >
                <option value="">All tags</option>
                {tagSuggestions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            {(filterTrade || filterTag || search) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterTrade(""); setFilterTag(""); setSearch(""); }}>
                Clear
              </Button>
            )}
          </div>
        )}

        {courses.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No courses yet. Click “Add course” to create your first one.</p>
          </Card>
        ) : visibleCourses.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No courses match your filters.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleCourses.map((c) => {
              const count = materialsByCourse(c.id).length;
              return (
                <Card key={c.id} className="p-5 hover:shadow-elegant transition-shadow group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{displayBadge(c)}</Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">{c.code}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{c.title}</h3>
                  {c.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{c.description}</p>}
                  {(c.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(c.tags ?? []).map((t) => (
                        <span key={t} className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {c.duration_hours}h</span>
                    <span>৳ {Number(c.price ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" /> {count} reading material{count === 1 ? "" : "s"}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => setManageCourse(c)}>Manage</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={!!manageCourse} onOpenChange={(o) => !o && setManageCourse(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Reading materials — {manageCourse?.title}</DialogTitle>
            </DialogHeader>
            {manageCourse && (
              <div className="space-y-4">
                <label className="flex items-center justify-center gap-2 border border-dashed rounded-md p-4 cursor-pointer hover:bg-muted/40 text-sm text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  <span>{submitting ? "Uploading…" : "Upload more files (max 25 MB each)"}</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleAddMaterials}
                    disabled={submitting}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,image/*"
                  />
                </label>
                {materialsByCourse(manageCourse.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No materials yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {materialsByCourse(manageCourse.id).map((m) => (
                      <li key={m.id} className="flex items-center gap-2 text-sm bg-muted/40 rounded px-2 py-1.5">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 truncate">{m.file_name}</span>
                        <span className="text-xs text-muted-foreground">{formatSize(m.size_bytes)}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(m)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteMaterial(m)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
