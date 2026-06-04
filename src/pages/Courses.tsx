import { useEffect, useState } from "react";
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
import { Plus, BookOpen, Trash2, Clock, FileText, Upload, X, Download } from "lucide-react";
import { toast } from "sonner";

interface Course {
  id: string; title: string; description: string | null;
  duration_hours: number; price: number | null; trade_id: string;
  trades?: { name: string };
}
interface Trade { id: string; name: string; }
interface Material {
  id: string; course_id: string; file_name: string; file_path: string;
  mime_type: string | null; size_bytes: number | null;
}

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
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
  const [trades, setTrades] = useState<Trade[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<string>("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [manageCourse, setManageCourse] = useState<Course | null>(null);

  const load = async () => {
    if (!center) return;
    const [c, t, m] = await Promise.all([
      supabase.from("courses").select("*, trades(name)").eq("center_id", center.id).order("created_at", { ascending: false }),
      supabase.from("trades").select("id, name").eq("center_id", center.id),
      supabase.from("course_materials").select("*").eq("center_id", center.id).order("created_at", { ascending: false }),
    ]);
    setCourses((c.data as any) ?? []);
    setTrades(t.data ?? []);
    setMaterials((m.data as any) ?? []);
  };
  useEffect(() => { load(); }, [center]);

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
    if (!selectedTrade) { toast.error("Select a trade"); return; }
    setSubmitting(true);
    const { data: created, error } = await supabase.from("courses").insert({
      center_id: center.id,
      trade_id: selectedTrade,
      title: String(fd.get("title") || "").trim(),
      description: String(fd.get("description") || "").trim() || null,
      duration_hours: Number(fd.get("duration_hours") || 40),
      price: Number(fd.get("price") || 0),
    }).select().single();
    if (error || !created) { setSubmitting(false); toast.error(error?.message || "Failed"); return; }
    if (pendingFiles.length) await uploadFilesForCourse(created.id, pendingFiles);
    setSubmitting(false);
    toast.success(`Course created${pendingFiles.length ? ` with ${pendingFiles.length} file(s)` : ""}`);
    setOpen(false); setSelectedTrade(""); setPendingFiles([]);
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

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader
          title="Courses"
          description="Specific training programs under each trade."
          action={
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setSelectedTrade(""); setPendingFiles([]); } }}>
              <DialogTrigger asChild>
                <Button disabled={trades.length === 0 || (plan.limits.maxPublishedCourses !== null && courses.length >= plan.limits.maxPublishedCourses)}>
                  <Plus className="h-4 w-4 mr-2" /> Add course
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>New course</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Trade *</Label>
                    <Select value={selectedTrade} onValueChange={setSelectedTrade}>
                      <SelectTrigger><SelectValue placeholder="Choose trade" /></SelectTrigger>
                      <SelectContent>
                        {trades.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input id="title" name="title" required maxLength={150} placeholder="Industrial Wiring Level 1" />
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
        {trades.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Add a trade first, then create courses under it.</p>
          </Card>
        ) : courses.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No courses yet.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => {
              const count = materialsByCourse(c.id).length;
              return (
                <Card key={c.id} className="p-5 hover:shadow-elegant transition-shadow group">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary">{c.trades?.name ?? "—"}</Badge>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)} className="opacity-0 group-hover:opacity-100">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{c.title}</h3>
                  {c.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{c.description}</p>}
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
