import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, CalendarDays, Smartphone, Users, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
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

interface Course {
  id: string; title: string;
  description: string | null; description_bn: string | null;
  requirements_text: string | null;
  eligibility_gender: EligibilityGender | null;
  eligibility_min_age: number | null;
  eligibility_max_age: number | null;
  eligibility_education: EducationLevel | null;
  duration_value: number | null; duration_unit: DurationUnit | null;
  price: number | null;
}
interface DocRequirement { doc_type: DocType; mandatory: boolean; }

interface Batch {
  id: string; name: string; start_date: string; end_date: string;
  capacity: number; status: string; published_to_ami_probashi: boolean;
  course_id: string; courses?: { title: string; trades?: { name: string } | null };
  enrollment_count?: number;
  application_deadline: string | null;
  fee_collection: FeeCollection;
  tags: string[] | null;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-info/15 text-info",
  in_progress: "bg-accent/20 text-accent-foreground",
  completed: "bg-success/15 text-success",
  archived: "bg-muted text-muted-foreground",
};

interface Branch { id: string; name_en: string; name_bn: string; }

export default function Batches() {
  const { center } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [branchCaps, setBranchCaps] = useState<Record<string, number>>({});

  // Batch-level editable copies, auto-populated from the selected course.
  const [description, setDescription] = useState("");
  const [descriptionBn, setDescriptionBn] = useState("");
  const [requirementsText, setRequirementsText] = useState("");
  const [eligGender, setEligGender] = useState<EligibilityGender | "">("");
  const [eligEducation, setEligEducation] = useState<EducationLevel | "">("");
  const [eligMinAge, setEligMinAge] = useState<string>("");
  const [eligMaxAge, setEligMaxAge] = useState<string>("");
  const [durationValue, setDurationValue] = useState<string>("");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("hours");
  const [price, setPrice] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [docRequirements, setDocRequirements] = useState<DocRequirement[]>([]);
  const [feeCollection, setFeeCollection] = useState<FeeCollection>("manual");

  const load = async () => {
    if (!center) return;
    const [b, c, br] = await Promise.all([
      supabase
        .from("batches")
        .select("*, courses(title, trades(name))")
        .eq("center_id", center.id)
        .order("start_date", { ascending: false }),
      supabase.from("courses").select("*").eq("center_id", center.id),
      supabase.from("branches").select("id, name_en, name_bn").eq("center_id", center.id).order("name_en"),
    ]);
    const batchList = (b.data as any[]) ?? [];
    const ids = batchList.map((x) => x.id);
    if (ids.length) {
      const { data: enr } = await supabase.from("enrollments").select("batch_id").in("batch_id", ids);
      const counts: Record<string, number> = {};
      (enr ?? []).forEach((e: any) => { counts[e.batch_id] = (counts[e.batch_id] ?? 0) + 1; });
      batchList.forEach((x) => { x.enrollment_count = counts[x.id] ?? 0; });
    }
    setBatches(batchList);
    setCourses((c.data as any) ?? []);
    setBranches((br.data as any) ?? []);
  };
  useEffect(() => { load(); }, [center]);

  const toggleBranch = (id: string, checked: boolean) => {
    setBranchCaps((prev) => {
      const next = { ...prev };
      if (checked) next[id] = next[id] ?? 30;
      else delete next[id];
      return next;
    });
  };

  const resetForm = () => {
    setSelectedCourse(""); setBranchCaps({});
    setDescription(""); setDescriptionBn(""); setRequirementsText("");
    setEligGender(""); setEligEducation(""); setEligMinAge(""); setEligMaxAge("");
    setDurationValue(""); setDurationUnit("hours"); setPrice("");
    setTags([]); setTagInput(""); setDocRequirements([]); setFeeCollection("manual");
  };

  const applyCourseDefaults = async (courseId: string) => {
    setSelectedCourse(courseId);
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    setDescription(course.description ?? "");
    setDescriptionBn(course.description_bn ?? "");
    setRequirementsText(course.requirements_text ?? "");
    setEligGender(course.eligibility_gender ?? "");
    setEligEducation(course.eligibility_education ?? "");
    setEligMinAge(course.eligibility_min_age != null ? String(course.eligibility_min_age) : "");
    setEligMaxAge(course.eligibility_max_age != null ? String(course.eligibility_max_age) : "");
    setDurationValue(course.duration_value != null ? String(course.duration_value) : "");
    setDurationUnit(course.duration_unit ?? "hours");
    setPrice(course.price != null ? String(course.price) : "");
    const { data: docs } = await supabase
      .from("course_document_requirements")
      .select("doc_type, mandatory")
      .eq("course_id", courseId);
    setDocRequirements((docs as any) ?? []);
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

  const addDocRequirement = () =>
    setDocRequirements((p) => [...p, { doc_type: "other", mandatory: true }]);
  const updateDocRequirement = (i: number, patch: Partial<DocRequirement>) =>
    setDocRequirements((p) => p.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const removeDocRequirement = (i: number) =>
    setDocRequirements((p) => p.filter((_, idx) => idx !== i));

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!center || !selectedCourse) { toast.error("Select a course"); return; }
    const selectedBranchIds = Object.keys(branchCaps);
    if (selectedBranchIds.length === 0) {
      toast.error("Select at least one branch with its capacity");
      return;
    }
    for (const id of selectedBranchIds) {
      if (!Number.isFinite(branchCaps[id]) || branchCaps[id] < 1) {
        toast.error("Enter a valid capacity for every selected branch");
        return;
      }
    }
    const fd = new FormData(e.currentTarget);
    const totalCapacity = selectedBranchIds.reduce((s, id) => s + branchCaps[id], 0);
    const { data: created, error } = await supabase.from("batches").insert({
      center_id: center.id,
      course_id: selectedCourse,
      name: String(fd.get("name") || "").trim(),
      start_date: String(fd.get("start_date")),
      end_date: String(fd.get("end_date")),
      capacity: totalCapacity,
      status: "draft",
      description: description.trim() || null,
      description_bn: descriptionBn.trim() || null,
      requirements_text: requirementsText.trim() || null,
      eligibility_gender: eligGender || null,
      eligibility_education: eligEducation || null,
      eligibility_min_age: eligMinAge ? Number(eligMinAge) : null,
      eligibility_max_age: eligMaxAge ? Number(eligMaxAge) : null,
      duration_value: durationValue ? Number(durationValue) : null,
      duration_unit: durationUnit,
      price: price ? Number(price) : null,
      tags,
      application_deadline: String(fd.get("application_deadline") || "") || null,
      fee_collection: feeCollection,
    } as any).select().single();
    if (error || !created) { toast.error(error?.message || "Failed to create"); return; }
    const links = selectedBranchIds.map((bid) => ({
      batch_id: created.id, branch_id: bid, capacity: branchCaps[bid],
    }));
    const { error: linkErr } = await supabase.from("batch_branches").insert(links);
    if (linkErr) { toast.error(linkErr.message); return; }
    if (docRequirements.length) {
      await supabase.from("batch_document_requirements").insert(
        docRequirements.map((d) => ({ batch_id: created.id, doc_type: d.doc_type, mandatory: d.mandatory }))
      );
    }
    toast.success("Session created");
    setOpen(false); resetForm();
    load();
  };

  const togglePublish = async (b: Batch) => {
    const next = !b.published_to_ami_probashi;
    const updates: any = { published_to_ami_probashi: next };
    if (next && b.status === "draft") updates.status = "published";
    if (next) updates.published_at = new Date().toISOString();
    const { error } = await supabase.from("batches").update(updates).eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    toast.success(next ? "Published to Ami Probashi" : "Unpublished");
    load();
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader
          title="Batches"
          description="Live training cohorts — publish to the Ami Probashi mobile app to start receiving applications."
          action={
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button disabled={courses.length === 0}><Plus className="h-4 w-4 mr-2" /> New batch</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>New training session</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Course *</Label>
                    <Select value={selectedCourse} onValueChange={applyCourseDefaults}>
                      <SelectTrigger><SelectValue placeholder="Choose course" /></SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {selectedCourse && (
                      <p className="text-xs text-muted-foreground">
                        Description, requirements, duration, fee and document requirements below are copied from the
                        course — edit freely, the course stays unchanged.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Batch name *</Label>
                    <Input id="name" name="name" required maxLength={100} placeholder="Morning Batch — Jan 2026" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start *</Label>
                      <Input id="start_date" name="start_date" type="date" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">End *</Label>
                      <Input id="end_date" name="end_date" type="date" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (e.g. online, in-person)</Label>
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
                        placeholder={tags.length ? "" : "Press Enter to add"}
                        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (English)</Label>
                    <Textarea id="description" rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description_bn">Description (Bangla)</Label>
                    <Textarea id="description_bn" rows={3} maxLength={1000} value={descriptionBn} onChange={(e) => setDescriptionBn(e.target.value)} />
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
                        <Label className="text-xs font-normal">Min age</Label>
                        <Input type="number" min={0} value={eligMinAge} onChange={(e) => setEligMinAge(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-normal">Max age</Label>
                        <Input type="number" min={0} value={eligMaxAge} onChange={(e) => setEligMaxAge(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-normal">Additional notes (optional, shown to applicants)</Label>
                      <Textarea rows={2} maxLength={500} value={requirementsText} onChange={(e) => setRequirementsText(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <div className="flex gap-2">
                        <Input type="number" min={1} className="w-20" value={durationValue} onChange={(e) => setDurationValue(e.target.value)} />
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
                      <Label>Course fee (BDT)</Label>
                      <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="application_deadline">Application deadline</Label>
                      <Input id="application_deadline" name="application_deadline" type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label>Fee collection</Label>
                      <Select value={feeCollection} onValueChange={(v) => setFeeCollection(v as FeeCollection)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual (center collects)</SelectItem>
                          <SelectItem value="ami_probashi">Ami Probashi collects</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <Label>Branches & capacity *</Label>
                    {branches.length === 0 ? (
                      <div className="text-sm text-muted-foreground border border-dashed rounded-md p-3">
                        No branches yet.{" "}
                        <Link to="/app/branches-management" className="text-primary underline">
                          Add a branch
                        </Link>{" "}
                        before creating a session.
                      </div>
                    ) : (
                      <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                        {branches.map((br) => {
                          const checked = br.id in branchCaps;
                          return (
                            <div key={br.id} className="flex items-center gap-3 p-3">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-primary"
                                checked={checked}
                                onChange={(e) => toggleBranch(br.id, e.target.checked)}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{br.name_en}</div>
                                <div className="text-xs text-muted-foreground truncate">{br.name_bn}</div>
                              </div>
                              <Input
                                type="number"
                                min={1}
                                className="w-24"
                                placeholder="Capacity"
                                disabled={!checked}
                                value={checked ? branchCaps[br.id] : ""}
                                onChange={(e) =>
                                  setBranchCaps((p) => ({ ...p, [br.id]: Number(e.target.value) || 0 }))
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={branches.length === 0 || Object.keys(branchCaps).length === 0}
                  >
                    Create session
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          }
        />
        {courses.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Create courses first, then add batches under them.</p>
          </Card>
        ) : batches.length === 0 ? (
          <Card className="p-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No batches yet.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {batches.map((b) => (
              <Card key={b.id} className="p-5 hover:shadow-elegant transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <Badge variant="secondary" className="mb-2">{b.courses?.trades?.name ?? "—"} · {b.courses?.title}</Badge>
                    <h3 className="font-semibold text-lg">{b.name}</h3>
                  </div>
                  <Badge className={statusColors[b.status] || ""}>{b.status.replace("_", " ")}</Badge>
                </div>
                {(b.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(b.tags ?? []).map((t) => (
                      <span key={t} className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {format(new Date(b.start_date), "MMM d")} → {format(new Date(b.end_date), "MMM d, yyyy")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {b.enrollment_count ?? 0} / {b.capacity}
                  </span>
                </div>
                {b.application_deadline && (
                  <p className="text-xs text-muted-foreground mt-1">Applications close {format(new Date(b.application_deadline), "MMM d, yyyy")}</p>
                )}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Switch checked={b.published_to_ami_probashi} onCheckedChange={() => togglePublish(b)} />
                    <Smartphone className="h-3.5 w-3.5" />
                    Ami Probashi
                  </label>
                  <Link to={`/app/batches/${b.id}`} className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
                    Manage <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
