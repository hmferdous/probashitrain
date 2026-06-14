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
import { Plus, BookOpen, Trash2, Clock, FileText, Upload, X, Download, Search } from "lucide-react";
import { toast } from "sonner";

interface Course {
  id: string; title: string; description: string | null;
  duration_hours: number; price: number | null;
  trade_id: string | null; category: string | null; tags: string[] | null;
  trades?: { name: string } | null;
}
interface Material {
  id: string; course_id: string; file_name: string; file_path: string;
  mime_type: string | null; size_bytes: number | null;
}

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
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [manageCourse, setManageCourse] = useState<Course | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterTag, setFilterTag] = useState<string>("");
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!center) return;
    const [c, m] = await Promise.all([
      supabase.from("courses").select("*, trades(name)").eq("center_id", center.id).order("created_at", { ascending: false }),
      supabase.from("course_materials").select("*").eq("center_id", center.id).order("created_at", { ascending: false }),
    ]);
    setCourses((c.data as any) ?? []);
    setMaterials((m.data as any) ?? []);
  };
  useEffect(() => { load(); }, [center]);

  const categorySuggestions = useMemo(
    () => Array.from(new Set(courses.map((c) => c.category).filter(Boolean) as string[])).sort(),
    [courses]
  );
  const tagSuggestions = useMemo(
    () => Array.from(new Set(courses.flatMap((c) => c.tags ?? []))).sort(),
    [courses]
  );

  const resetForm = () => {
    setCategory(""); setTags([]); setTagInput(""); setPendingFiles([]);
  };

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
    if (plan.limits.maxPublishedCourses !== null && courses.length >= plan.limits.maxPublishedCourses) {
      toast.error(`Your ${plan.name} plan allows up to ${plan.limits.maxPublishedCourses} courses. Upgrade to add more.`);
      return;
    }
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    const { data: created, error } = await supabase.from("courses").insert({
      center_id: center.id,
      title: String(fd.get("title") || "").trim(),
      description: String(fd.get("description") || "").trim() || null,
      duration_hours: Number(fd.get("duration_hours") || 40),
      price: Number(fd.get("price") || 0),
      category: category.trim().slice(0, 60) || null,
      tags,
    }).select().single();
    if (error || !created) { setSubmitting(false); toast.error(error?.message || "Failed"); return; }
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

  const displayBadge = (c: Course) => c.category || c.trades?.name || "Uncategorized";

  const visibleCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (filterCategory && displayBadge(c) !== filterCategory) return false;
      if (filterTag && !(c.tags ?? []).includes(filterTag)) return false;
      if (q && !c.title.toLowerCase().includes(q) && !(c.description ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [courses, filterCategory, filterTag, search]);

  const allCategoryOptions = useMemo(
    () => Array.from(new Set(courses.map(displayBadge))).sort(),
    [courses]
  );

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
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>New course</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input id="title" name="title" required maxLength={150} placeholder="Industrial Wiring Level 1" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      maxLength={60}
                      placeholder="e.g. Electrical, IT, Caregiving"
                      list="category-suggestions"
                    />
                    <datalist id="category-suggestions">
                      {categorySuggestions.map((s) => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <div className="flex flex-wrap gap-1.5 border rounded-md px-2 py-1.5 min-h-[40px] items-center">
                      {tags.map((t) => (
                        <Badge key={t} variant="secondary" className="gap-1">
                          {t}
                          <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== t))} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      <input
                        id="tags"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={onTagKey}
                        onBlur={() => tagInput && addTag(tagInput)}
                        list="tag-suggestions"
                        placeholder={tags.length ? "" : "Press Enter to add"}
                        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1"
                      />
                      <datalist id="tag-suggestions">
                        {tagSuggestions.filter((t) => !tags.includes(t)).map((s) => <option key={s} value={s} />)}
                      </datalist>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" rows={3} maxLength={1000} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration_hours">Duration (hrs)</Label>
                      <Input id="duration_hours" name="duration_hours" type="number" defaultValue={40} min={1} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (BDT)</Label>
                      <Input id="price" name="price" type="number" defaultValue={0} min={0} />
                    </div>
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
                    {submitting ? "Saving…" : "Create course"}
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
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">All categories</option>
              {allCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
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
            {(filterCategory || filterTag || search) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterCategory(""); setFilterTag(""); setSearch(""); }}>
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
                    <Badge variant="secondary">{displayBadge(c)}</Badge>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)} className="opacity-0 group-hover:opacity-100">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
          <DialogContent className="max-h-[90vh] overflow-y-auto">
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
