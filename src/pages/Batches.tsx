import { useEffect, useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, CalendarDays, Smartphone, Users, ArrowRight, X, ChevronDown, ChevronRight as ChevronRightIcon, Search } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { BATCH_STATUS_CONFIG, type BatchStatus } from "@/lib/statusColors";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import DateSelect, { type DateSelectValue } from "@/components/DateSelect";
import ListSkeleton from "@/components/ListSkeleton";
import { friendlyError } from "@/lib/errors";
import ConfirmDialog from "@/components/ConfirmDialog";
import MultiSelectFilter from "@/components/MultiSelectFilter";

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
  course_id: string; courses?: { title: string };
  enrollment_count?: number;
  application_deadline: string | null;
  fee_collection: FeeCollection;
  tags: string[] | null;
}

interface Branch { id: string; name_en: string; name_bn: string; }

export default function Batches() {
  const { center } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [instructors, setInstructors] = useState<{ id: string; full_name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BatchStatus | "all">("all");
  const [courseFilter, setCourseFilter] = useState<string[]>([]);
  const [pendingPublish, setPendingPublish] = useState<Batch | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [branchCaps, setBranchCaps] = useState<Record<string, number>>({});
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);

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
  const [showCourseDetails, setShowCourseDetails] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [startDate, setStartDate] = useState<DateSelectValue>({ day: "", month: "", year: "" });
  const [endDate, setEndDate] = useState<DateSelectValue>({ day: "", month: "", year: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!center) return;
    const [b, c, br, roles] = await Promise.all([
      supabase
        .from("batches")
        .select("*, courses(title)")
        .eq("center_id", center.id)
        .order("start_date", { ascending: false }),
      supabase.from("courses").select("*").eq("center_id", center.id),
      supabase.from("branches").select("id, name_en, name_bn").eq("center_id", center.id).order("name_en"),
      supabase.from("user_roles").select("user_id").eq("center_id", center.id).eq("role", "instructor"),
    ]);
    if (roles.data && roles.data.length > 0) {
      const ids = roles.data.map((r: any) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      setInstructors((profiles ?? []).map((p: any) => ({ id: p.id, full_name: p.full_name })));
    } else {
      setInstructors([]);
    }
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
    setLoading(false);
  };
  useEffect(() => { load(); }, [center]);

  const courseFilterOptions = useMemo(() => {
    const seen = new Map<string, string>();
    batches.forEach((b) => {
      if (b.course_id && !seen.has(b.course_id)) seen.set(b.course_id, b.courses?.title ?? "Untitled course");
    });
    return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [batches]);

  const filteredBatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return batches.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (courseFilter.length > 0 && !courseFilter.includes(b.course_id)) return false;
      if (!q) return true;
      return b.name.toLowerCase().includes(q) || (b.courses?.title ?? "").toLowerCase().includes(q);
    });
  }, [batches, search, statusFilter, courseFilter]);

  const toggleBranch = (id: string, checked: boolean) => {
    setBranchCaps((prev) => {
      const next = { ...prev };
      if (checked) next[id] = next[id] ?? 30;
      else delete next[id];
      return next;
    });
  };

  const resetForm = () => {
    setSelectedCourse(""); setBranchCaps({}); setSelectedInstructors([]);
    setDescription(""); setDescriptionBn(""); setRequirementsText("");
    setEligGender(""); setEligEducation(""); setEligMinAge(""); setEligMaxAge("");
    setDurationValue(""); setDurationUnit("hours"); setPrice("");
    setTags([]); setTagInput(""); setDocRequirements([]); setFeeCollection("manual");
    setShowCourseDetails(false); setShowMoreOptions(false);
    setStartDate({ day: "", month: "", year: "" });
    setEndDate({ day: "", month: "", year: "" });
  };

  const applyCourseDefaults = async (courseId: string) => {
    setSelectedCourse(courseId);
    setShowCourseDetails(true);
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
    if (!startDate.month || !startDate.year) { toast.error("Start month and year are required"); return; }
    if (!endDate.month || !endDate.year) { toast.error("End month and year are required"); return; }
    const startISO = `${startDate.year}-${startDate.month.padStart(2, "0")}-${(startDate.day || "01").padStart(2, "0")}`;
    const endISO = `${endDate.year}-${endDate.month.padStart(2, "0")}-${(endDate.day || "01").padStart(2, "0")}`;
    if (new Date(startISO) > new Date(endISO)) { toast.error("Start date must be before end date"); return; }
    const fd = new FormData(e.currentTarget);
    const batchName = String(fd.get("name") || "").trim();
    if (!batchName) { toast.error("Batch name is required"); return; }
    const { count: nameCount } = await supabase.from("batches")
      .select("id", { count: "exact", head: true })
      .eq("center_id", center.id).eq("name", batchName);
    if (nameCount && nameCount > 0) {
      toast.error("A batch with this name already exists in your center.");
      return;
    }
    const totalCapacity = selectedBranchIds.reduce((s, id) => s + branchCaps[id], 0);
    const { data: created, error } = await supabase.from("batches").insert({
      center_id: center.id,
      course_id: selectedCourse,
      name: batchName,
      start_date: startISO,
      end_date: endISO,
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
    if (error || !created) { toast.error(friendlyError(error, "Failed to create batch")); return; }
    const links = selectedBranchIds.map((bid) => ({
      batch_id: created.id, branch_id: bid, capacity: branchCaps[bid],
    }));
    const { error: linkErr } = await supabase.from("batch_branches").insert(links);
    if (linkErr) { toast.error(friendlyError(linkErr)); return; }
    if (docRequirements.length) {
      await supabase.from("batch_document_requirements").insert(
        docRequirements.map((d) => ({ batch_id: created.id, doc_type: d.doc_type, mandatory: d.mandatory }))
      );
    }
    if (selectedInstructors.length) {
      await (supabase.from("batch_instructors" as any) as any).insert(
        selectedInstructors.map((uid) => ({ batch_id: created.id, user_id: uid, center_id: center.id }))
      );
    }
    toast.success("Batch created");
    setOpen(false); resetForm();
    load();
  };

  const togglePublish = async (b: Batch) => {
    const next = !b.published_to_ami_probashi;
    const updates: any = { published_to_ami_probashi: next };
    if (next && b.status === "draft") updates.status = "published";
    if (next) updates.published_at = new Date().toISOString();
    const { error } = await supabase.from("batches").update(updates).eq("id", b.id);
    if (error) { toast.error(friendlyError(error)); return; }
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
            <Dialog open={open} onOpenChange={(o) => {
              setOpen(o);
              if (!o) {
                resetForm();
              } else if (branches.length === 1) {
                // Only branch — pre-select it, nothing to choose.
                setBranchCaps({ [branches[0].id]: 30 });
              } else if (branches.length > 1) {
                // Multiple branches — pre-select the default one created at onboarding; admin can add/remove.
                const main = branches.find((b) => b.name_en === "Main Branch");
                if (main) setBranchCaps({ [main.id]: 30 });
              }
            }}>
              <DialogTrigger asChild>
                <Button disabled={courses.length === 0}><Plus className="h-4 w-4 mr-2" /> New batch</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>New batch</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  {/* ── Required fields ── */}
                  <div className="space-y-2">
                    <Label>Course *</Label>
                    <Select value={selectedCourse} onValueChange={applyCourseDefaults}>
                      <SelectTrigger><SelectValue placeholder="Choose course" /></SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Batch name *</Label>
                    <Input id="name" name="name" required maxLength={100} placeholder="Morning Batch — Jan 2026" />
                  </div>

                  <DateSelect label="Start date" value={startDate} onChange={setStartDate} />
                  <DateSelect label="End date" value={endDate} onChange={setEndDate} />

                  {/* ── Branches & capacity (required) ── */}
                  <div className="space-y-2">
                    <Label>Branches & capacity *</Label>
                    {branches.length === 0 ? (
                      <div className="text-sm text-muted-foreground border border-dashed rounded-md p-3">
                        No branches yet.{" "}
                        <Link to="/app/branches-management" className="text-primary underline">Add a branch</Link>{" "}
                        before creating a batch.
                      </div>
                    ) : (
                      <div className="border rounded-md divide-y max-h-52 overflow-y-auto">
                        {branches.map((br) => {
                          const checked = br.id in branchCaps;
                          return (
                            <div key={br.id} className="flex items-center gap-3 p-3">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => toggleBranch(br.id, v === true)}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{br.name_en}</div>
                                {br.name_bn && <div className="text-xs text-muted-foreground truncate">{br.name_bn}</div>}
                              </div>
                              <Input
                                type="number" min={1} className="w-24" placeholder="Capacity"
                                disabled={!checked}
                                value={checked ? branchCaps[br.id] : ""}
                                onChange={(e) => setBranchCaps((p) => ({ ...p, [br.id]: Number(e.target.value) || 0 }))}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ── Collapsible: Course details (pre-filled) ── */}
                  <div className="border rounded-md overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowCourseDetails((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
                    >
                      <span>
                        Course details
                        {selectedCourse && <span className="ml-2 text-xs font-normal text-muted-foreground">(pre-filled from course — editable)</span>}
                      </span>
                      {showCourseDetails ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    {showCourseDetails && (
                      <div className="px-4 pb-4 space-y-4 border-t pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="description">Description (English)</Label>
                          <Textarea id="description" rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description_bn">Description (Bangla)</Label>
                          <Textarea id="description_bn" rows={3} maxLength={1000} value={descriptionBn} onChange={(e) => setDescriptionBn(e.target.value)} />
                        </div>

                        <div className="space-y-3 border rounded-md p-3 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Eligibility requirements</Label>
                            <span className="text-xs text-muted-foreground">Leave unset for no restriction</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-normal text-muted-foreground">Gender</Label>
                              <Select value={eligGender || "unset"} onValueChange={(v) => setEligGender(v === "unset" ? "" : (v as EligibilityGender))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unset">No restriction</SelectItem>
                                  <SelectItem value="male">Male</SelectItem>
                                  <SelectItem value="female">Female</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-normal text-muted-foreground">Min education</Label>
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
                              <Label className="text-xs font-normal text-muted-foreground">Min age</Label>
                              <Input type="number" min={0} value={eligMinAge} onChange={(e) => setEligMinAge(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-normal text-muted-foreground">Max age</Label>
                              <Input type="number" min={0} value={eligMaxAge} onChange={(e) => setEligMaxAge(e.target.value)} />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-normal text-muted-foreground">Additional notes (shown to applicants)</Label>
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
                      </div>
                    )}
                  </div>

                  {/* ── Collapsible: More options ── */}
                  <div className="border rounded-md overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowMoreOptions((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
                    >
                      <span>More options <span className="text-xs font-normal text-muted-foreground">(tags, deadline, docs, instructors)</span></span>
                      {showMoreOptions ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    {showMoreOptions && (
                      <div className="px-4 pb-4 space-y-4 border-t pt-4">
                        <div className="space-y-2">
                          <Label>Tags</Label>
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
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={onTagKey}
                              onBlur={() => tagInput && addTag(tagInput)}
                              placeholder={tags.length ? "" : "e.g. online, evening — press Enter to add"}
                              className="flex-1 min-w-[160px] bg-transparent outline-none text-sm py-1"
                            />
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
                                    <Checkbox checked={d.mandatory} onCheckedChange={(v) => updateDocRequirement(i, { mandatory: v === true })} />
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
                          <Label>Instructors <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                          {instructors.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No instructors added yet. Invite instructors from User Management.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {instructors.map((inst) => {
                                const selected = selectedInstructors.includes(inst.id);
                                return (
                                  <button
                                    key={inst.id}
                                    type="button"
                                    onClick={() => setSelectedInstructors((prev) =>
                                      selected ? prev.filter((id) => id !== inst.id) : [...prev, inst.id]
                                    )}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                                      selected
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border hover:bg-muted/50 text-muted-foreground"
                                    }`}
                                  >
                                    <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold">
                                      {inst.full_name.charAt(0).toUpperCase()}
                                    </span>
                                    {inst.full_name}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={branches.length === 0 || Object.keys(branchCaps).length === 0}
                  >
                    Create batch
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          }
        />
        {!loading && batches.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search batches or courses…"
                className="pl-8 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BatchStatus | "all")}>
              <SelectTrigger className="h-9 w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(BATCH_STATUS_CONFIG) as BatchStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{BATCH_STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {courseFilterOptions.length > 0 && (
              <MultiSelectFilter
                options={courseFilterOptions}
                selected={courseFilter}
                onChange={setCourseFilter}
                placeholder="All courses"
                className="w-44"
              />
            )}
            {(search || statusFilter !== "all" || courseFilter.length > 0) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setCourseFilter([]); }}>
                Clear
              </Button>
            )}
          </div>
        )}
        {loading ? (
          <ListSkeleton variant="cards" />
        ) : courses.length === 0 ? (
          <EmptyState icon={CalendarDays} message="Create courses first, then add batches under them." />
        ) : batches.length === 0 ? (
          <EmptyState icon={CalendarDays} message="No batches yet." />
        ) : filteredBatches.length === 0 ? (
          <EmptyState icon={Search} message="No batches match your filters." />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredBatches.map((b) => (
              <Card key={b.id} className="p-5 hover:shadow-elegant transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <Badge variant="secondary" className="mb-2">{b.courses?.title}</Badge>
                    <h3 className="font-semibold text-lg">{b.name}</h3>
                  </div>
                  <StatusBadge status={BATCH_STATUS_CONFIG[b.status as BatchStatus] ?? BATCH_STATUS_CONFIG.draft} />
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
                  {b.published_to_ami_probashi ? (
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Switch checked onCheckedChange={() => togglePublish(b)} />
                      <Smartphone className="h-3.5 w-3.5 text-success" />
                      <span className="text-success font-medium">Live on Ami Probashi</span>
                    </label>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPendingPublish(b)}>
                      <Smartphone className="h-3.5 w-3.5" /> Publish to Ami Probashi
                    </Button>
                  )}
                  <Link to={`/app/batches/${b.id}`} className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
                    Manage <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingPublish}
        onOpenChange={(o) => !o && setPendingPublish(null)}
        title="Publish this batch to Ami Probashi?"
        description={`"${pendingPublish?.name}" will become visible to Ami Probashi's app users and start accepting applications. You can unpublish it again at any time.`}
        confirmLabel="Publish"
        variant="default"
        onConfirm={() => {
          if (pendingPublish) togglePublish(pendingPublish);
          setPendingPublish(null);
        }}
      />
    </AppLayout>
  );
}
