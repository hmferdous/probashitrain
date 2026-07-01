import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlan } from "@/lib/plan";
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
  ArrowLeft, UserPlus, Video, Award, ChevronRight, Star, ClipboardCheck, Plus, Lock, Pencil, X
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type EligibilityGender = "any" | "male" | "female";
type EducationLevel = "none" | "jsc" | "ssc" | "hsc" | "diploma" | "bachelors" | "masters";
type DurationUnit = "hours" | "days" | "weeks" | "months";
type DocType = "nid" | "education_certificate" | "cv" | "training_certificate" | "photo" | "other";
type FeeCollection = "ami_probashi" | "manual";

const EDUCATION_LABELS: Record<EducationLevel, string> = {
  none: "No requirement", jsc: "JSC", ssc: "SSC", hsc: "HSC",
  diploma: "Diploma", bachelors: "Bachelor's", masters: "Master's",
};
const DOC_TYPE_LABELS: Record<DocType, string> = {
  nid: "NID", education_certificate: "Education certificate", cv: "CV",
  training_certificate: "Training certificate", photo: "Photo", other: "Other",
};
interface DocRequirement { doc_type: DocType; mandatory: boolean; }

type PipelineStatus = "applied" | "shortlisted" | "training_started" | "ongoing" | "completed" | "certified";
const PIPELINE: { key: PipelineStatus; label: string; color: string }[] = [
  { key: "applied", label: "Applied / Added", color: "bg-info/15 text-info border-info/30" },
  { key: "shortlisted", label: "Shortlisted", color: "bg-warning/15 text-warning border-warning/30" },
  { key: "training_started", label: "Training Started", color: "bg-primary/15 text-primary border-primary/30" },
  { key: "ongoing", label: "Ongoing", color: "bg-accent/20 text-accent-foreground border-accent/30" },
  { key: "completed", label: "Completed", color: "bg-success/15 text-success border-success/30" },
  { key: "certified", label: "Certified", color: "bg-gradient-gold text-accent-foreground border-accent" },
];

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
  const [batch, setBatch] = useState<any>(null);
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

  const load = async () => {
    if (!id) return;
    const { data: b } = await supabase
      .from("batches")
      .select("*, courses(title, duration_hours, trades(name))")
      .eq("id", id).maybeSingle();
    setBatch(b);
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
    toast.success(`Moved to ${status.replace("_", " ")}`);
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
    if (plan.locked.inPersonAdmission) {
      toast.error("In-person admission requires Premium plan");
      return;
    }
    if (plan.limits.maxStudents !== null && students.length >= plan.limits.maxStudents) {
      toast.error(`Your ${plan.name} plan caps students at ${plan.limits.maxStudents}. Upgrade to add more.`);
      return;
    }
    const fd = new FormData(e.currentTarget);
    const { data: s, error } = await supabase.from("students").insert({
      center_id: batch.center_id,
      full_name: String(fd.get("full_name") || "").trim(),
      phone: String(fd.get("phone") || "").trim() || null,
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
    const eligMinAge = String(fd.get("eligibility_min_age") || "");
    const eligMaxAge = String(fd.get("eligibility_max_age") || "");
    const durationValue = String(fd.get("duration_value") || "");
    const tagsRaw = String(fd.get("tags") || "");
    const { error } = await supabase.from("batches").update({
      description: String(fd.get("description") || "").trim() || null,
      description_bn: String(fd.get("description_bn") || "").trim() || null,
      requirements_text: String(fd.get("requirements_text") || "").trim() || null,
      eligibility_gender: eligGender === "unset" ? null : eligGender,
      eligibility_education: eligEducation === "unset" ? null : eligEducation,
      eligibility_min_age: eligMinAge ? Number(eligMinAge) : null,
      eligibility_max_age: eligMaxAge ? Number(eligMaxAge) : null,
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

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <Link to="/app/batches" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to batches
        </Link>
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <Badge variant="secondary" className="mb-2">{batch.courses?.trades?.name} · {batch.courses?.title}</Badge>
            <h1 className="text-3xl font-bold">{batch.name}</h1>
            <p className="text-muted-foreground mt-1">
              {format(new Date(batch.start_date), "MMM d")} → {format(new Date(batch.end_date), "MMM d, yyyy")} ·
              Capacity {batch.capacity} · {enrollments.length} enrolled
            </p>
          </div>
          <div className="flex gap-2">
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
                          <input
                            type="checkbox"
                            checked={d.mandatory}
                            onChange={(ev) => updateDocRequirement(i, { mandatory: ev.target.checked })}
                          />
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

          <TabsContent value="pipeline" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {PIPELINE.map((stage) => {
                const items = enrollments.filter((e) => e.pipeline_status === stage.key);
                return (
                  <div key={stage.key} className="space-y-2">
                    <div className={`text-xs font-semibold px-3 py-2 rounded-md border ${stage.color}`}>
                      {stage.label} <span className="opacity-60">· {items.length}</span>
                    </div>
                    {items.map((enr) => {
                      const idx = PIPELINE.findIndex((s) => s.key === enr.pipeline_status);
                      const next = PIPELINE[idx + 1];
                      return (
                        <Card key={enr.id} className="p-3 text-sm hover:shadow-md transition-shadow">
                          <div className="font-medium">{enr.students.full_name}</div>
                          <div className="text-xs text-muted-foreground truncate">{enr.students.phone || enr.students.email || "—"}</div>
                          <div className="flex items-center gap-1 mt-2">
                            {enr.source === "ami_probashi" && <Badge variant="outline" className="text-[10px] py-0">📱 App</Badge>}
                            {enr.performance_score != null && (
                              <Badge variant="outline" className="text-[10px] py-0">★ {enr.performance_score}</Badge>
                            )}
                          </div>
                          <div className="flex gap-1 mt-2">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOpenGrade(enr)}>
                              <Star className="h-3 w-3 mr-1" /> Grade
                            </Button>
                            {next && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => moveStatus(enr, next.key)}>
                                <ChevronRight className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          {enr.pipeline_status === "completed" && (
                            <Button size="sm" className="w-full mt-2 h-7 text-xs bg-gradient-gold text-accent-foreground" onClick={() => moveStatus(enr, "certified")}>
                              <Award className="h-3 w-3 mr-1" /> Issue cert
                            </Button>
                          )}
                          {enr.pipeline_status === "certified" && (
                            <Link to={`/app/certificates/${enr.id}`}>
                              <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-xs">View certificate</Button>
                            </Link>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </TabsContent>

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
              <AttendanceSheet enrollments={enrollments} onChange={load} />
            )}
          </TabsContent>

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
      </div>
    </AppLayout>
  );
}

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

  if (enrollments.length === 0) return <Card className="p-8 text-center text-muted-foreground">No students enrolled yet.</Card>;

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
                    <Input
                      type="time"
                      value={row.sign_in_time ?? ""}
                      onChange={(ev) => save(e.id, { sign_in_time: ev.target.value })}
                      className="w-32"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="time"
                      value={row.sign_out_time ?? ""}
                      onChange={(ev) => save(e.id, { sign_out_time: ev.target.value })}
                      className="w-32"
                    />
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
