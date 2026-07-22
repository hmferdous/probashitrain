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
import { Plus, BookOpen, Trash2, FileText, Upload, X, Download, Search, Pencil } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import ListSkeleton from "@/components/ListSkeleton";
import EmptyState from "@/components/EmptyState";
import CategoryCombobox, { type CategoryOption } from "@/components/CategoryCombobox";
import { friendlyError } from "@/lib/errors";

type DocType = "nid" | "education_certificate" | "cv" | "training_certificate" | "photo" | "other";

interface Course {
  id: string; code: string; title: string; description: string | null;
  category_id: string | null; tags: string[] | null;
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
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [manageCourse, setManageCourse] = useState<Course | null>(null);
  const [filterTag, setFilterTag] = useState<string>("");
  const [search, setSearch] = useState("");
  const [pendingDeleteCourse, setPendingDeleteCourse] = useState<Course | null>(null);
  const [pendingDeleteMaterial, setPendingDeleteMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);

  const openEdit = (c: Course) => {
    setEditing(c);
    setTags(c.tags ?? []);
    setTagInput("");
    setCategoryId(c.category_id ?? null);
    setPendingFiles([]);
    setOpen(true);
  };

  const load = async () => {
    if (!center) return;
    const [c, cat, m] = await Promise.all([
      supabase.from("courses").select("*").eq("center_id", center.id).order("created_at", { ascending: false }),
      (supabase.from("categories" as any) as any).select("id, name").eq("center_id", center.id).order("name"),
      supabase.from("course_materials").select("*").eq("center_id", center.id).order("created_at", { ascending: false }),
    ]);
    setCourses((c.data as any) ?? []);
    setCategories((cat.data as any) ?? []);
    setMaterials((m.data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [center]);

  const tagSuggestions = useMemo(
    () => Array.from(new Set(courses.flatMap((c) => c.tags ?? []))).sort(),
    [courses]
  );

  const resetForm = () => {
    setEditing(null);
    setTags([]); setTagInput(""); setCategoryId(null); setPendingFiles([]);
  };

  const createCategory = async (name: string): Promise<string | null> => {
    if (!center) return null;
    const { data, error } = await (supabase.from("categories" as any) as any)
      .insert({ center_id: center.id, name })
      .select("id")
      .single();
    if (error || !data) {
      toast.error(friendlyError(error, "Failed to add category"));
      return null;
    }
    setCategories((prev) => [...prev, { id: data.id, name }].sort((a, b) => a.name.localeCompare(b.name)));
    return data.id;
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
      if (upErr) { toast.error(`Upload failed: ${f.name} — ${friendlyError(upErr)}`); continue; }
      const { error: insErr } = await supabase.from("course_materials").insert({
        course_id: courseId, center_id: center.id,
        file_name: f.name, file_path: path,
        mime_type: f.type || null, size_bytes: f.size,
        uploaded_by: user?.id ?? null,
      });
      if (insErr) toast.error(`Saved file but record failed: ${friendlyError(insErr)}`);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!center) return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: String(fd.get("title") || "").trim(),
      description: String(fd.get("description") || "").trim() || null,
      category_id: categoryId,
      tags,
    };
    setSubmitting(true);

    if (editing) {
      const { error } = await supabase.from("courses").update(payload as any).eq("id", editing.id);
      if (error) { setSubmitting(false); toast.error(friendlyError(error)); return; }
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
    if (error || !created) { setSubmitting(false); toast.error(friendlyError(error, "Failed to create course")); return; }
    if (pendingFiles.length) await uploadFilesForCourse(created.id, pendingFiles);
    setSubmitting(false);
    toast.success(`Course created${pendingFiles.length ? ` with ${pendingFiles.length} file(s)` : ""}`);
    setOpen(false); resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) { toast.error(friendlyError(error)); return; }
    setPendingDeleteCourse(null);
    toast.success("Course deleted");
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
    await supabase.storage.from("course-materials").remove([m.file_path]);
    const { error } = await supabase.from("course_materials").delete().eq("id", m.id);
    if (error) { toast.error(friendlyError(error)); return; }
    setPendingDeleteMaterial(null);
    toast.success("Removed");
    load();
  };

  const handleDownload = async (m: Material) => {
    const { data, error } = await supabase.storage
      .from("course-materials")
      .createSignedUrl(m.file_path, 60);
    if (error || !data) { toast.error(friendlyError(error, "Download failed")); return; }
    window.open(data.signedUrl, "_blank");
  };

  const materialsByCourse = (id: string) => materials.filter((m) => m.course_id === id);
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? null;

  const visibleCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (filterTag && !(c.tags ?? []).includes(filterTag)) return false;
      if (q && !c.title.toLowerCase().includes(q) && !(c.description ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [courses, filterTag, search]);

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
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                    <Label>Category</Label>
                    <CategoryCombobox
                      categories={categories}
                      value={categoryId}
                      onChange={setCategoryId}
                      onCreate={createCategory}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-1.5 min-h-[38px] items-center border rounded-md px-3 py-1.5 bg-background focus-within:ring-1 focus-within:ring-ring">
                      {tags.map((t) => (
                        <span key={t} className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                          {t}
                          <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== t))} className="text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={onTagKey}
                        onBlur={() => addTag(tagInput)}
                        placeholder={tags.length === 0 ? "Type a tag and press Enter…" : ""}
                        className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Up to 10 tags, 30 chars each. Press Enter or comma to add.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" rows={3} maxLength={1000} defaultValue={editing?.description ?? ""} />
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
                    {editing && materialsByCourse(editing.id).length > 0 && (
                      <ul className="space-y-1.5">
                        {materialsByCourse(editing.id).map((m) => (
                          <li key={m.id} className="flex items-center gap-2 text-sm bg-muted/40 rounded px-2 py-1.5">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 truncate">{m.file_name}</span>
                            <span className="text-xs text-muted-foreground">{formatSize(m.size_bytes)}</span>
                            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(m)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPendingDeleteMaterial(m)} aria-label={`Remove ${m.file_name}`}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
            {tagSuggestions.length > 0 && (
              <Select value={filterTag || "all"} onValueChange={(v) => setFilterTag(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9 w-40"><SelectValue placeholder="All tags" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
                  {tagSuggestions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {(filterTag || search) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterTag(""); setSearch(""); }}>
                Clear
              </Button>
            )}
          </div>
        )}

        {loading ? (
          <ListSkeleton variant="cards" />
        ) : courses.length === 0 ? (
          <EmptyState icon={BookOpen} message="No courses yet. Click “Add course” to create your first one." />
        ) : visibleCourses.length === 0 ? (
          <EmptyState icon={BookOpen} message="No courses match your filters." />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleCourses.map((c) => {
              const count = materialsByCourse(c.id).length;
              const catName = categoryName(c.category_id);
              return (
                <Card key={c.id} className="p-5 hover:shadow-elegant transition-shadow group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {catName && <Badge variant="secondary">{catName}</Badge>}
                      <span className="text-[10px] font-mono text-muted-foreground">{c.code}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)} title="Edit" aria-label={`Edit ${c.title}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setPendingDeleteCourse(c)} title="Delete" aria-label={`Delete ${c.title}`}>
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
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPendingDeleteMaterial(m)} aria-label={`Remove ${m.file_name}`}>
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

        <ConfirmDialog
          open={!!pendingDeleteCourse}
          onOpenChange={(o) => !o && setPendingDeleteCourse(null)}
          title="Delete this course?"
          description={`"${pendingDeleteCourse?.title}" will be permanently removed — along with every batch created under it and their student enrollment records. This cannot be undone.`}
          onConfirm={() => pendingDeleteCourse && handleDelete(pendingDeleteCourse.id)}
        />
        <ConfirmDialog
          open={!!pendingDeleteMaterial}
          onOpenChange={(o) => !o && setPendingDeleteMaterial(null)}
          title="Remove this material?"
          description={`"${pendingDeleteMaterial?.file_name}" will be permanently removed.`}
          confirmLabel="Remove"
          onConfirm={() => pendingDeleteMaterial && handleDeleteMaterial(pendingDeleteMaterial)}
        />
      </div>
    </AppLayout>
  );
}
