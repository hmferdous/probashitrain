import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Upload, FileText, Download, Trash2, Mail, Phone,
  MapPin, Calendar, GraduationCap, Briefcase, User, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

type Student = {
  id: string; full_name: string; phone: string | null; email: string | null;
  nid: string | null; address: string | null; photo_url: string | null;
  date_of_birth: string | null; gender: string | null;
  education_level: string | null; occupation: string | null;
  emergency_contact_name: string | null; emergency_contact_phone: string | null;
  created_at: string;
};

type Doc = {
  id: string; doc_type: string; label: string | null; file_path: string;
  file_name: string; mime_type: string | null; size_bytes: number | null;
  created_at: string;
};

type Enrollment = {
  id: string; pipeline_status: string; performance_score: number | null;
  applied_at: string; certificate_issued_at: string | null;
  batches: { id: string; name: string; start_date: string; end_date: string;
    courses: { title: string } | null } | null;
};

const DOC_TYPES = [
  { value: "nid", label: "NID" },
  { value: "education_certificate", label: "Education certificate" },
  { value: "cv", label: "CV / Resume" },
  { value: "training_certificate", label: "Previous training certificate" },
  { value: "photo", label: "Photo" },
  { value: "other", label: "Other" },
] as const;

const STATUS_COLOR: Record<string, string> = {
  applied: "bg-muted text-foreground",
  shortlisted: "bg-accent/20 text-accent-foreground",
  training_started: "bg-primary/15 text-primary",
  ongoing: "bg-primary/15 text-primary",
  completed: "bg-secondary/20 text-secondary-foreground",
  certified: "bg-secondary text-secondary-foreground",
};

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const { center, user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [editing, setEditing] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!id || !center) return;
    const [s, d, e] = await Promise.all([
      supabase.from("students").select("*").eq("id", id).maybeSingle(),
      supabase.from("student_documents").select("*").eq("student_id", id).order("created_at", { ascending: false }),
      supabase.from("enrollments")
        .select("id, pipeline_status, performance_score, applied_at, certificate_issued_at, batches(id, name, start_date, end_date, courses(title))")
        .eq("student_id", id)
        .order("applied_at", { ascending: false }),
    ]);
    setStudent((s.data as Student) ?? null);
    setDocs((d.data as Doc[]) ?? []);
    setEnrollments((e.data as unknown as Enrollment[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, center?.id]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!student || !center) return;
    const fd = new FormData(e.currentTarget);
    const phone = String(fd.get("phone") || "").trim() || null;
    if (phone && phone !== student.phone) {
      const { count } = await supabase.from("students")
        .select("id", { count: "exact", head: true })
        .eq("center_id", center.id).eq("phone", phone).neq("id", student.id);
      if (count && count > 0) { toast.error("A student with this phone number already exists in your center."); return; }
    }
    const payload = {
      full_name: String(fd.get("full_name") || "").trim(),
      phone,
      email: String(fd.get("email") || "").trim() || null,
      nid: String(fd.get("nid") || "").trim() || null,
      address: String(fd.get("address") || "").trim() || null,
      date_of_birth: (String(fd.get("date_of_birth") || "").trim() || null),
      gender: String(fd.get("gender") || "").trim() || null,
      education_level: String(fd.get("education_level") || "").trim() || null,
      occupation: String(fd.get("occupation") || "").trim() || null,
      emergency_contact_name: String(fd.get("emergency_contact_name") || "").trim() || null,
      emergency_contact_phone: String(fd.get("emergency_contact_phone") || "").trim() || null,
    };
    const { error } = await supabase.from("students").update(payload).eq("id", student.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    setEditing(false);
    load();
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!center || !student) return;
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File | null;
    const docType = String(fd.get("doc_type") || "other");
    const label = String(fd.get("label") || "").trim() || null;
    if (!file || file.size === 0) return toast.error("Pick a file");
    if (file.size > 10 * 1024 * 1024) return toast.error("Max 10MB");
    setUploading(true);
    const ext = file.name.split(".").pop() || "bin";
    const path = `${center.id}/${student.id}/${docType}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("student-docs").upload(path, file, {
      contentType: file.type || undefined,
    });
    if (up.error) { setUploading(false); return toast.error(up.error.message); }
    const { error } = await supabase.from("student_documents").insert({
      student_id: student.id,
      center_id: center.id,
      doc_type: docType as "nid" | "education_certificate" | "cv" | "training_certificate" | "photo" | "other",
      label,
      file_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: user?.id ?? null,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Document uploaded");
    setUploadOpen(false);
    load();

    // If photo, set as profile photo
    if (docType === "photo") {
      const { data } = await supabase.storage.from("student-docs").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (data?.signedUrl) {
        await supabase.from("students").update({ photo_url: data.signedUrl }).eq("id", student.id);
        load();
      }
    }
  };

  const handleDownload = async (doc: Doc) => {
    const { data, error } = await supabase.storage.from("student-docs").createSignedUrl(doc.file_path, 60);
    if (error || !data) return toast.error("Could not generate link");
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (doc: Doc) => {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;
    await supabase.storage.from("student-docs").remove([doc.file_path]);
    const { error } = await supabase.from("student_documents").delete().eq("id", doc.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  if (!student) {
    return (
      <AppLayout>
        <div className="p-8 max-w-5xl mx-auto">
          <Link to="/app/students" className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to students
          </Link>
          <Card className="p-12 text-center text-muted-foreground">Loading…</Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <Link to="/app/students" className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-4 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to students
        </Link>

        {/* Header card */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-5">
            <div className="h-20 w-20 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-2xl font-bold overflow-hidden shrink-0">
              {student.photo_url
                ? <img src={student.photo_url} alt={student.full_name} className="h-full w-full object-cover" />
                : student.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{student.full_name}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                {student.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{student.phone}</span>}
                {student.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{student.email}</span>}
                {student.nid && <span className="font-mono">NID {student.nid}</span>}
              </div>
            </div>
            <Button variant="outline" onClick={() => setEditing((v) => !v)}>
              {editing ? "Cancel" : "Edit"}
            </Button>
          </div>
        </Card>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="education">Education & work</TabsTrigger>
            <TabsTrigger value="training">Training history</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          {/* Personal & Education combined edit form when editing */}
          {editing ? (
            <Card className="p-6">
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Full name *</Label><Input name="full_name" defaultValue={student.full_name} required /></div>
                <div><Label>Phone</Label><Input name="phone" defaultValue={student.phone ?? ""} /></div>
                <div><Label>Email</Label><Input name="email" type="email" defaultValue={student.email ?? ""} /></div>
                <div><Label>NID</Label><Input name="nid" defaultValue={student.nid ?? ""} /></div>
                <div><Label>Date of birth</Label><Input name="date_of_birth" type="date" defaultValue={student.date_of_birth ?? ""} /></div>
                <div>
                  <Label>Gender</Label>
                  <select name="gender" defaultValue={student.gender ?? ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">—</option><option value="male">Male</option>
                    <option value="female">Female</option><option value="other">Other</option>
                  </select>
                </div>
                <div className="md:col-span-2"><Label>Address</Label><Input name="address" defaultValue={student.address ?? ""} /></div>
                <div><Label>Highest education</Label><Input name="education_level" placeholder="e.g. SSC, HSC, Bachelor's" defaultValue={student.education_level ?? ""} /></div>
                <div><Label>Occupation</Label><Input name="occupation" defaultValue={student.occupation ?? ""} /></div>
                <div><Label>Emergency contact name</Label><Input name="emergency_contact_name" defaultValue={student.emergency_contact_name ?? ""} /></div>
                <div><Label>Emergency contact phone</Label><Input name="emergency_contact_phone" defaultValue={student.emergency_contact_phone ?? ""} /></div>
                <div className="md:col-span-2"><Button type="submit">Save changes</Button></div>
              </form>
            </Card>
          ) : (
            <>
              <TabsContent value="personal">
                <Card className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <Field icon={<User className="h-4 w-4" />} label="Full name" value={student.full_name} />
                  <Field icon={<Phone className="h-4 w-4" />} label="Phone" value={student.phone} />
                  <Field icon={<Mail className="h-4 w-4" />} label="Email" value={student.email} />
                  <Field label="NID" value={student.nid} mono />
                  <Field icon={<Calendar className="h-4 w-4" />} label="Date of birth" value={student.date_of_birth} />
                  <Field label="Gender" value={student.gender} />
                  <Field icon={<MapPin className="h-4 w-4" />} label="Address" value={student.address} className="md:col-span-2" />
                  <Field label="Emergency contact" value={
                    student.emergency_contact_name || student.emergency_contact_phone
                      ? `${student.emergency_contact_name ?? ""}${student.emergency_contact_phone ? ` · ${student.emergency_contact_phone}` : ""}`
                      : null
                  } className="md:col-span-2" />
                </Card>
              </TabsContent>

              <TabsContent value="education">
                <Card className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <Field icon={<GraduationCap className="h-4 w-4" />} label="Highest education" value={student.education_level} />
                  <Field icon={<Briefcase className="h-4 w-4" />} label="Occupation" value={student.occupation} />
                </Card>
              </TabsContent>

              <TabsContent value="training">
                {enrollments.length === 0 ? (
                  <Card className="p-12 text-center text-muted-foreground">No training history yet.</Card>
                ) : (
                  <Card className="divide-y">
                    {enrollments.map((en) => (
                      <div key={en.id} className="p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{en.batches?.courses?.title ?? "—"}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Batch: {en.batches?.name ?? "—"} · {en.batches?.start_date} → {en.batches?.end_date}
                          </div>
                          {en.performance_score != null && (
                            <div className="text-xs mt-1">Performance: <span className="font-semibold">{en.performance_score}</span></div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={STATUS_COLOR[en.pipeline_status] ?? "bg-muted"}>
                            {en.pipeline_status.replace(/_/g, " ")}
                          </Badge>
                          {en.certificate_issued_at && (
                            <Link to={`/app/certificates/${en.id}`} className="text-xs text-primary hover:underline">Certificate</Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="documents">
                <div className="flex justify-end mb-3">
                  <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                    <DialogTrigger asChild>
                      <Button><Upload className="h-4 w-4 mr-2" /> Upload document</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Upload document</DialogTitle></DialogHeader>
                      <form onSubmit={handleUpload} className="space-y-3">
                        <div>
                          <Label>Document type</Label>
                          <Select name="doc_type" defaultValue="nid">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DOC_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div><Label>Label (optional)</Label><Input name="label" placeholder="e.g. SSC Certificate 2018" /></div>
                        <div>
                          <Label>File (max 10MB)</Label>
                          <Input name="file" type="file" required accept="image/*,application/pdf" />
                        </div>
                        <Button type="submit" className="w-full" disabled={uploading}>
                          {uploading ? "Uploading…" : "Upload"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                {docs.length === 0 ? (
                  <Card className="p-12 text-center text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-60" />
                    No documents uploaded yet.
                  </Card>
                ) : (
                  <Card className="divide-y">
                    {docs.map((d) => {
                      const isImage = d.mime_type?.startsWith("image/");
                      return (
                        <div key={d.id} className="p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                              {isImage ? <ImageIcon className="h-5 w-5 text-muted-foreground" /> : <FileText className="h-5 w-5 text-muted-foreground" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{d.label || DOC_TYPES.find((t) => t.value === d.doc_type)?.label}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {d.file_name} · {((d.size_bytes ?? 0) / 1024).toFixed(0)} KB
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => handleDownload(d)} title="Download">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(d)} title="Delete">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </Card>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}

function Field({
  label, value, icon, mono, className,
}: { label: string; value?: string | null; icon?: React.ReactNode; mono?: boolean; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-0.5">
        {icon} {label}
      </div>
      <div className={`text-sm ${mono ? "font-mono" : ""} ${value ? "" : "text-muted-foreground italic"}`}>
        {value || "Not provided"}
      </div>
    </div>
  );
}
