import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlan } from "@/lib/plan";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  ArrowLeft, UserPlus, Video, Award, Star, ClipboardCheck, Plus, Lock,
  Pencil, X, MessageSquare, Wallet, Smartphone, CheckCircle2, XCircle,
  ChevronRight, RotateCcw, FileText
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type EligibilityGender = "any" | "male" | "female";
type EducationLevel = "none" | "jsc" | "ssc" | "hsc" | "diploma" | "bachelors" | "masters";
type DurationUnit = "hours" | "days" | "weeks" | "months";
type DocType = "nid" | "education_certificate" | "cv" | "training_certificate" | "photo" | "other";
type FeeCollection = "ami_probashi" | "manual";
type PipelineStatus = "applied" | "shortlisted" | "training_started" | "ongoing" | "completed" | "certified" | "rejected";
type PaymentMethod = "cash" | "ami_probashi" | "bank" | "mobile_banking" | "other";

const EDUCATION_LABELS: Record<EducationLevel, string> = {
  none: "No requirement", jsc: "JSC", ssc: "SSC", hsc: "HSC",
  diploma: "Diploma", bachelors: "Bachelor's", masters: "Master's",
};
const DOC_TYPE_LABELS: Record<DocType, string> = {
  nid: "NID", education_certificate: "Education certificate", cv: "CV",
  training_certificate: "Training certificate", photo: "Photo", other: "Other",
};
const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash", ami_probashi: "Ami Probashi", bank: "Bank",
  mobile_banking: "Mobile Banking", other: "Other",
};

const STATUS_CONFIG: Record<PipelineStatus, { label: string; color: string }> = {
  applied:          { label: "Applied",         color: "bg-info/15 text-info border-info/30" },
  shortlisted:      { label: "Shortlisted",     color: "bg-warning/15 text-warning border-warning/30" },
  training_started: { label: "In Training",     color: "bg-primary/15 text-primary border-primary/30" },
  ongoing:          { label: "In Training",     color: "bg-primary/15 text-primary border-primary/30" },
  completed:        { label: "Completed",       color: "bg-success/15 text-success border-success/30" },
  certified:        { label: "Certified",       color: "bg-amber-100 text-amber-800 border-amber-300" },
  rejected:         { label: "Rejected",        color: "bg-destructive/15 text-destructive border-destructive/30" },
};

interface DocRequirement { doc_type: DocType; mandatory: boolean; }

interface Enrollment {
  id: string;
  pipeline_status: PipelineStatus;
  source: string;
  performance_score: number | null;
  performance_notes: string | null;
  certificate_issued_at: string | null;
  applied_at: string;
  students: { id: string; full_name: string; phone: string | null; email: string | null; nid: string | null };
}

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { plan } = usePlan();
  const { center, user } = useAuth();
  const [batch, setBatch] = useState<any>(null);
  const [batchInstructors, setBatchInstructors] = useState<{ id: string; full_name: string }[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [openNew, setOpenNew] = useState(false);
  const [openGrade, setOpenGrade] = useState<Enrollment | null>(null);
  const [openLive, setOpenLive] = useState(false);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [pickStudent, setPickStudent] = useState("");
  const [openEdit, setOpenEdit] = useState(false);
  const [docRequirements, setDocRequirements] = useState<DocRequirement[]>([]);
  const [openStudent, setOpenStudent] = useState<Enrollment | null>(null);

  const load = async () => {
    if (!id) return;
    const { data: b } = await supabase
      .from("batches")
      .select("*, courses(title, duration_hours)")
      .eq("id", id).maybeSingle();
    setBatch(b);
    // Load assigned instructors
    const { data: bi } = await (supabase.from("batch_instructors" as any) as any)
      .select("user_id").eq("batch_id", id);
    if (bi && bi.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", bi.map((r: any) => r.user_id));
      setBatchInstructors((profiles ?? []).map((p: any) => ({ id: p.id, full_name: p.full_name })));
    } else {
      setBatchInstructors([]);
    }
    const { data: docs } = await supabase
      .from("batch_document_requirements")
      .select("doc_type, mandatory")
      .eq("batch_id", id);
    setDocRequirements((docs as any) ?? []);
    const { data: e } = await supabase
      .from("enrollments")
      .select("*, students(id, full_name, phone, email, nid)")
      .eq("batch_id", id)
      .order("applied_at", { ascending: false });
    setEnrollments((e as any) ?? []);
    if (b?.center_id) {
      const { data: s } = await supabase.from("students").select("id, full_name").eq("center_id", b.center_id);
      setStudents(s ?? []);
    }
    const { data: ls } = await supabase.from("live_sessions").select("*").eq("batch_id", id).order("scheduled_at", { ascending: false });
    setLiveSessions(ls ?? []);
  };
  useEffect(() => { load(); }, [id]);

  const moveStatus = async (enr: Enrollment, status: PipelineStatus) => {
    const updates: any = { pipeline_status: status };
    if (status === "certified") updates.certificate_issued_at = new Date().toISOString();
    const { error } = await supabase.from("enrollments").update(updates).eq("id", enr.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Moved to ${STATUS_CONFIG[status].label}`);
    load();
  };

  const addExisting = async () => {
    if (!pickStudent || !id) return;
    const { error } = await supabase.from("enrollments").insert({
      batch_id: id, student_id: pickStudent, source: "manual", pipeline_status: "applied",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Student added");
    setOpenAdd(false); setPickStudent("");
    load();
  };

  const createStudentAndEnroll = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!batch || !id) return;
    if (plan.locked.inPersonAdmission) { toast.error("In-person admission requires Premium plan"); return; }
    if (plan.limits.maxStudents !== null && students.length >= plan.limits.maxStudents) {
      toast.error(`Your ${plan.name} plan caps students at ${plan.limits.maxStudents}. Upgrade to add more.`);
      return;
    }
    const fd = new FormData(e.currentTarget);
    const phone = String(fd.get("phone") || "").trim() || null;
    if (phone) {
      const { count } = await supabase.from("students")
        .select("id", { count: "exact", head: true })
        .eq("center_id", batch.center_id).eq("phone", phone);
      if (count && count > 0) { toast.error("A student with this phone number already exists in your center."); return; }
    }
    const { data: s, error } = await supabase.from("students").insert({
      center_id: batch.center_id,
      full_name: String(fd.get("full_name") || "").trim(),
      phone,
      email: String(fd.get("email") || "").trim() || null,
      nid: String(fd.get("nid") || "").trim() || null,
    }).select().single();
    if (error || !s) { toast.error(error?.message ?? "Failed"); return; }
    const { error: e2 } = await supabase.from("enrollments").insert({
      batch_id: id, student_id: s.id, source: "manual", pipeline_status: "applied",
    });
    if (e2) { toast.error(e2.message); return; }
    toast.success("Student admitted");
    setOpenNew(false);
    load();
  };

  const saveGrade = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!openGrade) return;
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("enrollments").update({
      performance_score: Number(fd.get("score") || 0),
      performance_notes: String(fd.get("notes") || "").trim() || null,
    }).eq("id", openGrade.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Grade saved");
    setOpenGrade(null);
    load();
  };

  const startLive = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;
    const fd = new FormData(e.currentTarget);
    const room = `probashi-${id.slice(0, 8)}-${Date.now()}`;
    const { error } = await supabase.from("live_sessions").insert({
      batch_id: id,
      title: String(fd.get("title") || "").trim(),
      scheduled_at: String(fd.get("scheduled_at")),
      jitsi_room: room,
      is_live: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Live session created");
    setOpenLive(false);
    load();
  };

  const saveDetails = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;
    const fd = new FormData(e.currentTarget);
    const eligGender = String(fd.get("eligibility_gender") || "unset");
    const eligEducation = String(fd.get("eligibility_education") || "unset");
    const durationValue = String(fd.get("duration_value") || "");
    const tagsRaw = String(fd.get("tags") || "");
    const { error } = await supabase.from("batches").update({
      description: String(fd.get("description") || "").trim() || null,
      description_bn: String(fd.get("description_bn") || "").trim() || null,
      requirements_text: String(fd.get("requirements_text") || "").trim() || null,
      eligibility_gender: eligGender === "unset" ? null : eligGender,
      eligibility_education: eligEducation === "unset" ? null : eligEducation,
      eligibility_min_age: fd.get("eligibility_min_age") ? Number(fd.get("eligibility_min_age")) : null,
      eligibility_max_age: fd.get("eligibility_max_age") ? Number(fd.get("eligibility_max_age")) : null,
      duration_value: durationValue ? Number(durationValue) : null,
      duration_unit: String(fd.get("duration_unit") || "hours"),
      price: fd.get("price") ? Number(fd.get("price")) : null,
      tags: tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10) : [],
      application_deadline: String(fd.get("application_deadline") || "") || null,
      fee_collection: String(fd.get("fee_collection") || "manual"),
    } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("batch_document_requirements").delete().eq("batch_id", id);
    if (docRequirements.length > 0) {
      await supabase.from("batch_document_requirements").insert(
        docRequirements.map((d) => ({ batch_id: id, doc_type: d.doc_type, mandatory: d.mandatory }))
      );
    }
    toast.success("Batch details updated");
    setOpenEdit(false);
    load();
  };

  const addDocRequirement = () => setDocRequirements((d) => [...d, { doc_type: "other", mandatory: true }]);
  const updateDocRequirement = (i: number, patch: Partial<DocRequirement>) =>
    setDocRequirements((d) => d.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeDocRequirement = (i: number) => setDocRequirements((d) => d.filter((_, idx) => idx !== i));

  if (!batch) return <AppLayout><div className="p-8">Loading…</div></AppLayout>;

  const activeEnrollments = enrollments.filter((e) => e.pipeline_status !== "rejected");
  const statusCounts = enrollments.reduce<Record<string, number>>((acc, e) => {
    acc[e.pipeline_status] = (acc[e.pipeline_status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <Link to="/app/batches" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to batches
        </Link>
        {/* Batch lifecycle banner */}
        {batch.status === "draft" && (
          <div className="mb-4 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
            <span className="font-semibold">Draft batch.</span> Publish this batch from the Batches page to start accepting applications and enrollments.
          </div>
        )}
        {batch.status === "published" && !batch.published_to_ami_probashi && (
          <div className="mb-4 rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-sm text-info">
            <span className="font-semibold">Published.</span> Toggle "Publish to Ami Probashi" on the Batches page to make this batch discoverable by 9M+ students on the mobile app.
          </div>
        )}
        {batch.status === "published" && batch.published_to_ami_probashi && (
          <div className="mb-4 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
            <span className="font-semibold">Live on Ami Probashi.</span> Students can discover and apply from the mobile app. Review incoming applications in the Applications page.
          </div>
        )}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <Badge variant="secondary" className="mb-2">{batch.courses?.title}</Badge>
            <h1 className="text-3xl font-bold">{batch.name}</h1>
            <p className="text-muted-foreground mt-1">
              {format(new Date(batch.start_date), "MMM d")} → {format(new Date(batch.end_date), "MMM d, yyyy")} ·
              Capacity {batch.capacity} · {activeEnrollments.length} enrolled
            </p>
            {batchInstructors.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">Instructors:</span>
                {batchInstructors.map((inst) => (
                  <span key={inst.id} className="inline-flex items-center gap-1 text-xs bg-info/10 text-info border border-info/20 px-2 py-0.5 rounded-full">
                    {inst.full_name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Edit details dialog */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
              <DialogTrigger asChild><Button variant="outline"><Pencil className="h-4 w-4 mr-2" /> Edit details</Button></DialogTrigger>
              <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Edit batch details</DialogTitle></DialogHeader>
                <form onSubmit={saveDetails} className="space-y-4">
                  <div>
                    <Label>Tags (comma separated)</Label>
                    <Input name="tags" maxLength={300} defaultValue={(batch.tags ?? []).join(", ")} placeholder="online, in-person" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea name="description" rows={3} maxLength={2000} defaultValue={batch.description ?? ""} />
                  </div>
                  <div>
                    <Label>Description (Bangla)</Label>
                    <Textarea name="description_bn" rows={3} maxLength={2000} defaultValue={batch.description_bn ?? ""} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Eligible gender</Label>
                      <Select name="eligibility_gender" defaultValue={batch.eligibility_gender ?? "unset"}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unset">Anyone</SelectItem>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Minimum education</Label>
                      <Select name="eligibility_education" defaultValue={batch.eligibility_education ?? "unset"}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unset">No requirement</SelectItem>
                          {(Object.keys(EDUCATION_LABELS) as EducationLevel[]).map((k) => (
                            <SelectItem key={k} value={k}>{EDUCATION_LABELS[k]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Min age</Label>
                      <Input name="eligibility_min_age" type="number" min={0} defaultValue={batch.eligibility_min_age ?? ""} />
                    </div>
                    <div>
                      <Label>Max age</Label>
                      <Input name="eligibility_max_age" type="number" min={0} defaultValue={batch.eligibility_max_age ?? ""} />
                    </div>
                  </div>
                  <div>
                    <Label>Additional notes (optional, shown to applicants)</Label>
                    <Textarea name="requirements_text" rows={3} maxLength={2000} defaultValue={batch.requirements_text ?? ""} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Duration value</Label>
                      <Input name="duration_value" type="number" min={0} defaultValue={batch.duration_value ?? ""} />
                    </div>
                    <div>
                      <Label>Duration unit</Label>
                      <Select name="duration_unit" defaultValue={batch.duration_unit ?? "hours"}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["hours", "days", "weeks", "months"] as DurationUnit[]).map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Course fee (৳)</Label>
                      <Input name="price" type="number" min={0} step="0.01" defaultValue={batch.price ?? ""} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Application deadline</Label>
                      <Input name="application_deadline" type="date" defaultValue={batch.application_deadline ?? ""} />
                    </div>
                    <div>
                      <Label>Fee collection</Label>
                      <Select name="fee_collection" defaultValue={(batch.fee_collection as FeeCollection) ?? "manual"}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ami_probashi">Ami Probashi</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Document requirements</Label>
                      <Button type="button" size="sm" variant="outline" onClick={addDocRequirement}>
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    </div>
                    {docRequirements.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Select value={d.doc_type} onValueChange={(v) => updateDocRequirement(i, { doc_type: v as DocType })}>
                          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map((k) => (
                              <SelectItem key={k} value={k}>{DOC_TYPE_LABELS[k]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                          <input type="checkbox" checked={d.mandatory} onChange={(ev) => updateDocRequirement(i, { mandatory: ev.target.checked })} />
                          Mandatory
                        </label>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeDocRequirement(i)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="submit" className="w-full">Save details</Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Add existing */}
            <Dialog open={openAdd} onOpenChange={setOpenAdd}>
              <DialogTrigger asChild><Button variant="outline"><UserPlus className="h-4 w-4 mr-2" /> Add existing</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Admit existing student</DialogTitle></DialogHeader>
                <Select value={pickStudent} onValueChange={setPickStudent}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={addExisting} disabled={!pickStudent}>Admit</Button>
              </DialogContent>
            </Dialog>

            {/* Admit new */}
            {plan.locked.inPersonAdmission ? (
              <Link to="/app/plans">
                <Button variant="outline"><Lock className="h-4 w-4 mr-2" /> Admit new · Upgrade</Button>
              </Link>
            ) : (
              <Dialog open={openNew} onOpenChange={setOpenNew}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Admit new</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Admit new student</DialogTitle></DialogHeader>
                  <form onSubmit={createStudentAndEnroll} className="space-y-3">
                    <div><Label>Full name *</Label><Input name="full_name" required maxLength={100} /></div>
                    <div><Label>Phone</Label><Input name="phone" maxLength={30} /></div>
                    <div><Label>Email</Label><Input name="email" type="email" maxLength={255} /></div>
                    <div><Label>NID</Label><Input name="nid" maxLength={30} /></div>
                    <Button type="submit" className="w-full">Admit student</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <Tabs defaultValue="pipeline">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="live">Live Classes</TabsTrigger>
          </TabsList>

          {/* ── Pipeline tab ── */}
          <TabsContent value="pipeline" className="mt-6 space-y-4">
            {/* Journey stepper */}
            <div className="flex items-center gap-0 overflow-x-auto pb-1">
              {(["applied","shortlisted","training_started","completed","certified"] as PipelineStatus[]).map((s, i, arr) => {
                const count = statusCounts[s] ?? 0;
                const cfg = STATUS_CONFIG[s];
                return (
                  <div key={s} className="flex items-center shrink-0">
                    <div className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium border ${count > 0 ? cfg.color : "bg-muted/30 text-muted-foreground border-muted"}`}>
                      <span className="text-base font-bold">{count}</span>
                      <span>{cfg.label}</span>
                    </div>
                    {i < arr.length - 1 && <div className="h-px w-4 bg-border shrink-0" />}
                  </div>
                );
              })}
              {statusCounts["rejected"] ? (
                <div className="ml-4 flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium border bg-destructive/10 text-destructive border-destructive/30">
                  <span className="text-base font-bold">{statusCounts["rejected"]}</span>
                  <span>Rejected</span>
                </div>
              ) : null}
            </div>

            {enrollments.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">No students enrolled yet.</Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-medium">Student</th>
                        <th className="px-4 py-3 font-medium">Contact</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Score</th>
                        <th className="px-4 py-3 font-medium">Source</th>
                        <th className="px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {enrollments.map((enr) => {
                        const cfg = STATUS_CONFIG[enr.pipeline_status];
                        return (
                          <tr key={enr.id} className="hover:bg-muted/30 align-middle">
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setOpenStudent(enr)}
                                className="font-medium hover:underline text-left"
                              >
                                {enr.students.full_name}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {enr.students.phone || enr.students.email || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}>
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {enr.performance_score != null ? (
                                <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" />{enr.performance_score}</span>
                              ) : "—"}
                            </td>
                            <td className="px-4 py-3">
                              {enr.source === "ami_probashi"
                                ? <Badge variant="outline" className="text-[10px]"><Smartphone className="h-3 w-3 mr-1" />App</Badge>
                                : <span className="text-xs text-muted-foreground">Manual</span>}
                            </td>
                            <td className="px-4 py-3">
                              <PipelineActions enr={enr} onMove={moveStatus} onGrade={setOpenGrade} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ── Attendance tab ── */}
          <TabsContent value="attendance" className="mt-6">
            {plan.locked.attendance ? (
              <Card className="p-12 text-center">
                <div className="h-14 w-14 mx-auto rounded-full bg-gradient-gold flex items-center justify-center shadow-gold mb-4">
                  <Lock className="h-6 w-6 text-accent-foreground" />
                </div>
                <p className="font-semibold text-lg mb-1">Attendance tracking is locked</p>
                <p className="text-muted-foreground text-sm mb-4">Available on Premium and Enterprise plans.</p>
                <Link to="/app/plans"><Button>Upgrade plan</Button></Link>
              </Card>
            ) : (
              <AttendanceSheet enrollments={enrollments.filter(e => e.pipeline_status !== "rejected")} onChange={load} />
            )}
          </TabsContent>

          {/* ── Live Classes tab ── */}
          <TabsContent value="live" className="mt-6">
            {plan.locked.liveClasses ? (
              <Card className="p-12 text-center">
                <div className="h-14 w-14 mx-auto rounded-full bg-gradient-gold flex items-center justify-center shadow-gold mb-4">
                  <Lock className="h-6 w-6 text-accent-foreground" />
                </div>
                <p className="font-semibold text-lg mb-1">Live classes are locked</p>
                <p className="text-muted-foreground text-sm mb-4">Available on Enterprise plan.</p>
                <Link to="/app/plans"><Button>Upgrade plan</Button></Link>
              </Card>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Live class sessions</h3>
                  <Dialog open={openLive} onOpenChange={setOpenLive}>
                    <DialogTrigger asChild><Button><Video className="h-4 w-4 mr-2" /> Schedule live class</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>New live session</DialogTitle></DialogHeader>
                      <form onSubmit={startLive} className="space-y-3">
                        <div><Label>Title *</Label><Input name="title" required /></div>
                        <div><Label>Scheduled at *</Label><Input name="scheduled_at" type="datetime-local" required /></div>
                        <Button type="submit" className="w-full">Create & start</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="space-y-2">
                  {liveSessions.length === 0 ? (
                    <Card className="p-8 text-center text-muted-foreground">No live sessions yet.</Card>
                  ) : liveSessions.map((s) => (
                    <Card key={s.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{s.title}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(s.scheduled_at), "PPp")}</div>
                      </div>
                      <Link to={`/app/live/${s.id}`}>
                        <Button size="sm"><Video className="h-4 w-4 mr-2" /> Join</Button>
                      </Link>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Grade dialog */}
        <Dialog open={!!openGrade} onOpenChange={(o) => !o && setOpenGrade(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Grade — {openGrade?.students.full_name}</DialogTitle></DialogHeader>
            <form onSubmit={saveGrade} className="space-y-3">
              <div><Label>Score (0–100)</Label><Input name="score" type="number" min={0} max={100} step="0.1" defaultValue={openGrade?.performance_score ?? ""} /></div>
              <div><Label>Notes</Label><Textarea name="notes" rows={3} defaultValue={openGrade?.performance_notes ?? ""} maxLength={500} /></div>
              <Button type="submit" className="w-full">Save</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Student detail dialog — comments + payment */}
        {openStudent && (
          <StudentDetailDialog
            enr={openStudent}
            centerId={batch.center_id}
            batchPrice={batch.price ?? 0}
            userId={user?.id ?? ""}
            onClose={() => setOpenStudent(null)}
          />
        )}
      </div>
    </AppLayout>
  );
}

// ── Pipeline action buttons ──────────────────────────────────────────────────

function PipelineActions({
  enr, onMove, onGrade,
}: {
  enr: Enrollment;
  onMove: (enr: Enrollment, status: PipelineStatus) => void;
  onGrade: (enr: Enrollment) => void;
}) {
  const s = enr.pipeline_status;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {s === "applied" && (
        <>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onMove(enr, "shortlisted")}>
            <CheckCircle2 className="h-3 w-3 mr-1 text-success" /> Shortlist
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => onMove(enr, "rejected")}>
            <XCircle className="h-3 w-3 mr-1" /> Reject
          </Button>
        </>
      )}
      {s === "shortlisted" && (
        <>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onMove(enr, "training_started")}>
            <ChevronRight className="h-3 w-3 mr-1" /> Start training
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => onMove(enr, "rejected")}>
            <XCircle className="h-3 w-3 mr-1" /> Reject
          </Button>
        </>
      )}
      {(s === "training_started" || s === "ongoing") && (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onMove(enr, "completed")}>
          <CheckCircle2 className="h-3 w-3 mr-1 text-success" /> Mark complete
        </Button>
      )}
      {s === "completed" && (
        <>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onGrade(enr)}>
            <Star className="h-3 w-3 mr-1 text-amber-500" /> Grade
          </Button>
          <Button size="sm" className="h-7 text-xs bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300" onClick={() => onMove(enr, "certified")}>
            <Award className="h-3 w-3 mr-1" /> Issue cert
          </Button>
        </>
      )}
      {s === "certified" && (
        <>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onGrade(enr)}>
            <Star className="h-3 w-3 mr-1 text-amber-500" /> Grade
          </Button>
          <Link to={`/app/certificates/${enr.id}`}>
            <Button size="sm" variant="outline" className="h-7 text-xs">View cert</Button>
          </Link>
        </>
      )}
      {s === "rejected" && (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onMove(enr, "applied")}>
          <RotateCcw className="h-3 w-3 mr-1" /> Reinstate
        </Button>
      )}
    </div>
  );
}

// ── Student detail dialog ────────────────────────────────────────────────────

function StudentDetailDialog({
  enr, centerId, batchPrice, userId, onClose,
}: {
  enr: Enrollment;
  centerId: string;
  batchPrice: number;
  userId: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"comments" | "payment">("comments");
  const [comments, setComments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [payAmount, setPayAmount] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const loadData = async () => {
    const [{ data: c }, { data: p }] = await Promise.all([
      (supabase.from as any)("enrollment_comments")
        .select("id, content, created_at, author_id")
        .eq("enrollment_id", enr.id)
        .order("created_at", { ascending: true }),
      (supabase.from as any)("payments")
        .select("*")
        .eq("enrollment_id", enr.id)
        .order("paid_at", { ascending: false }),
    ]);
    setComments(c ?? []);
    setPayments(p ?? []);
  };

  useEffect(() => { loadData(); }, [enr.id]);

  const submitComment = async () => {
    const text = newComment.trim();
    if (!text || !centerId || !userId) return;
    setSaving(true);
    const { error } = await (supabase.from as any)("enrollment_comments").insert({
      enrollment_id: enr.id,
      center_id: centerId,
      author_id: userId,
      content: text,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setNewComment("");
    loadData();
  };

  const deleteComment = async (commentId: string) => {
    await (supabase.from as any)("enrollment_comments").delete().eq("id", commentId);
    loadData();
  };

  const submitPayment = async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    const { data: invData } = await (supabase.rpc as any)("generate_invoice_no");
    const invoice_no = invData ?? `INV-${Date.now()}`;
    const { data: pay, error } = await (supabase.from as any)("payments").insert({
      enrollment_id: enr.id,
      center_id: centerId,
      amount,
      method: payMethod,
      notes: payNotes.trim() || null,
      invoice_no,
    }).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Payment recorded · ${invoice_no}`);
    setPayAmount(""); setPayNotes("");
    loadData();
    if (pay?.id) window.open(`/app/payments/${pay.id}`, "_blank");
  };

  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const outstanding = Math.max(0, batchPrice - totalPaid);
  const payStatus = totalPaid === 0 ? "Unpaid" : outstanding <= 0 ? "Paid" : "Partial";
  const payStatusColor = payStatus === "Paid"
    ? "bg-success/15 text-success border-success/30"
    : payStatus === "Partial"
    ? "bg-warning/15 text-warning border-warning/30"
    : "bg-destructive/15 text-destructive border-destructive/30";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle>{enr.students.full_name}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {enr.students.phone || ""}{enr.students.phone && enr.students.email ? " · " : ""}{enr.students.email || ""}
                {enr.students.nid ? ` · NID: ${enr.students.nid}` : ""}
              </p>
            </div>
            <Link
              to={`/app/students/${enr.students.id}`}
              className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border rounded-md px-2 py-1 hover:bg-muted transition-colors"
              onClick={onClose}
            >
              <FileText className="h-3.5 w-3.5" /> Full profile
            </Link>
          </div>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-1 border-b pb-2">
          <button
            onClick={() => setTab("comments")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${tab === "comments" ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            <MessageSquare className="h-4 w-4" /> Comments {comments.length > 0 && `(${comments.length})`}
          </button>
          <button
            onClick={() => setTab("payment")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${tab === "payment" ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Wallet className="h-4 w-4" /> Payment
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${payStatusColor}`}>{payStatus}</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-3 pt-1">
          {tab === "comments" && (
            <>
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No comments yet.</p>
              ) : (
                <div className="space-y-2">
                  {comments.map((c: any) => (
                    <div key={c.id} className="bg-muted/40 rounded-md px-3 py-2 text-sm relative group">
                      <p className="whitespace-pre-wrap">{c.content}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), "MMM d, yyyy · h:mm a")}</span>
                        {c.author_id === userId && (
                          <button onClick={() => deleteComment(c.id)} className="text-xs text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2 pt-1">
                <Textarea
                  rows={3}
                  maxLength={2000}
                  placeholder="Add a note about this student…"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button size="sm" className="w-full" onClick={submitComment} disabled={saving || !newComment.trim()}>
                  Add comment
                </Button>
              </div>
            </>
          )}

          {tab === "payment" && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-muted/40 rounded-md p-2">
                  <div className="text-xs text-muted-foreground">Course fee</div>
                  <div className="font-semibold text-sm">৳ {batchPrice.toLocaleString()}</div>
                </div>
                <div className="bg-muted/40 rounded-md p-2">
                  <div className="text-xs text-muted-foreground">Paid</div>
                  <div className="font-semibold text-sm text-success">৳ {totalPaid.toLocaleString()}</div>
                </div>
                <div className="bg-muted/40 rounded-md p-2">
                  <div className="text-xs text-muted-foreground">Outstanding</div>
                  <div className="font-semibold text-sm text-warning">৳ {outstanding.toLocaleString()}</div>
                </div>
              </div>

              {/* Payment history */}
              {payments.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">History</p>
                  {payments.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                      <div>
                        <span className="font-medium">৳ {Number(p.amount).toLocaleString()}</span>
                        <span className="text-muted-foreground ml-2">· {METHOD_LABEL[p.method as PaymentMethod] ?? p.method}</span>
                        {p.notes && <span className="text-muted-foreground ml-2 text-xs">· {p.notes}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {format(new Date(p.paid_at), "MMM d")}
                        <Link to={`/app/payments/${p.id}`} target="_blank">
                          <FileText className="h-3.5 w-3.5 hover:text-foreground" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Record new payment */}
              {outstanding > 0 && (
                <div className="border rounded-md p-3 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Record payment</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Amount (৳) *</Label>
                      <Input type="number" min={1} step="1" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={String(outstanding)} />
                    </div>
                    <div>
                      <Label className="text-xs">Method *</Label>
                      <Select value={payMethod} onValueChange={(v) => setPayMethod(v as PaymentMethod)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
                            <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Receipt #, reference…" maxLength={300} />
                  </div>
                  <Button className="w-full" onClick={submitPayment} disabled={saving || !payAmount}>
                    Record & open invoice
                  </Button>
                </div>
              )}
              {outstanding <= 0 && (
                <p className="text-sm text-center text-success py-2">✓ Fully paid</p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Attendance sheet ─────────────────────────────────────────────────────────

type AttStatus = "present" | "absent" | "late";
type AttRow = { status?: AttStatus; sign_in_time?: string | null; sign_out_time?: string | null };

function AttendanceSheet({ enrollments, onChange }: { enrollments: Enrollment[]; onChange: () => void }) {
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [rows, setRows] = useState<Record<string, AttRow>>({});

  useEffect(() => {
    if (enrollments.length === 0) return;
    (async () => {
      const ids = enrollments.map((e) => e.id);
      const { data } = await supabase.from("attendance").select("*").in("enrollment_id", ids).eq("session_date", date);
      const map: Record<string, AttRow> = {};
      (data ?? []).forEach((a: any) => {
        map[a.enrollment_id] = {
          status: a.status,
          sign_in_time: a.sign_in_time ? String(a.sign_in_time).slice(0, 5) : null,
          sign_out_time: a.sign_out_time ? String(a.sign_out_time).slice(0, 5) : null,
        };
      });
      setRows(map);
    })();
  }, [date, enrollments]);

  const save = async (enrId: string, patch: Partial<AttRow>) => {
    const next: AttRow = { ...(rows[enrId] ?? {}), ...patch };
    setRows((m) => ({ ...m, [enrId]: next }));
    const { error } = await supabase.from("attendance").upsert(
      {
        enrollment_id: enrId,
        session_date: date,
        status: next.status ?? "present",
        sign_in_time: next.sign_in_time || null,
        sign_out_time: next.sign_out_time || null,
      } as any,
      { onConflict: "enrollment_id,session_date" }
    );
    if (error) toast.error(error.message);
    else onChange();
  };

  if (enrollments.length === 0) return <Card className="p-8 text-center text-muted-foreground">No active students enrolled yet.</Card>;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <ClipboardCheck className="h-5 w-5 text-primary" />
        <Label>Date:</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Student</th>
              <th className="px-3 py-2 font-medium">Contact</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Sign-in <span className="text-muted-foreground font-normal">(optional)</span></th>
              <th className="px-3 py-2 font-medium">Sign-out <span className="text-muted-foreground font-normal">(optional)</span></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {enrollments.map((e) => {
              const row = rows[e.id] ?? {};
              return (
                <tr key={e.id} className="align-middle">
                  <td className="px-3 py-2 font-medium">{e.students.full_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{e.students.phone || e.students.email || "—"}</td>
                  <td className="px-3 py-2">
                    <select
                      value={row.status ?? ""}
                      onChange={(ev) => save(e.id, { status: ev.target.value as AttStatus })}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="" disabled>—</option>
                      {(["present", "absent", "late"] as AttStatus[]).map((s) => (
                        <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <Input type="time" value={row.sign_in_time ?? ""} onChange={(ev) => save(e.id, { sign_in_time: ev.target.value })} className="w-32" />
                  </td>
                  <td className="px-3 py-2">
                    <Input type="time" value={row.sign_out_time ?? ""} onChange={(ev) => save(e.id, { sign_out_time: ev.target.value })} className="w-32" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
