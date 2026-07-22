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
import {
  Plus, CalendarDays, Smartphone, Users, ArrowRight, X, ChevronDown,
  ChevronRight as ChevronRightIcon, Search, Copy, Sparkles,
} from "lucide-react";
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
import { isoToDateSelectValue, dateSelectValueToISO } from "@/lib/dates";

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

interface Course { id: string; title: string; }
interface DocRequirement { doc_type: DocType; mandatory: boolean; }

interface Batch {
  id: string; code: string; name: string;
  start_date: string | null; end_date: string | null;
  capacity: number; status: BatchStatus;
  course_id: string; courses?: { title: string; tags: string[] | null };
  enrollment_count?: number;
  application_deadline: string | null;
  fee_collection: FeeCollection;
  created_at: string;
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
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [branchCaps, setBranchCaps] = useState<Record<string, number>>({});
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);

  const [batchName, setBatchName] = useState("");
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
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [docRequirements, setDocRequirements] = useState<DocRequirement[]>([]);
  const [feeCollection, setFeeCollection] = useState<FeeCollection>("manual");
  const [showDescription, setShowDescription] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [showDurationFee, setShowDurationFee] = useState(false);
  const [showDocRequirements, setShowDocRequirements] = useState(false);
  const [showInstructors, setShowInstructors] = useState(false);
  const [startDate, setStartDate] = useState<DateSelectValue>({ day: "", month: "", year: "" });
  const [endDate, setEndDate] = useState<DateSelectValue>({ day: "", month: "", year: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!center) return;
    const [b, c, br, roles] = await Promise.all([
      supabase
        .from("batches")
        .select("*, courses(title, tags)")
        .eq("center_id", center.id)
        .order("created_at", { ascending: false }),
      supabase.from("courses").select("id, title").eq("center_id", center.id),
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

  // Most recent batch already created under the selected course, if any — source for "copy from previous batch".
  const previousBatchForCourse = useMemo(() => {
    if (!selectedCourse) return null;
    const matches = batches.filter((b) => b.course_id === selectedCourse);
    if (!matches.length) return null;
    return matches.reduce((latest, b) => (b.created_at > latest.created_at ? b : latest));
  }, [batches, selectedCourse]);

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
    setPreviewCode(null);
    setBatchName("");
    setDescription(""); setDescriptionBn(""); setRequirementsText("");
    setEligGender(""); setEligEducation(""); setEligMinAge(""); setEligMaxAge("");
    setDurationValue(""); setDurationUnit("hours"); setPrice("");
    setApplicationDeadline("");
    setDocRequirements([]); setFeeCollection("manual");
    setShowDescription(false); setShowRequirements(false); setShowDurationFee(false);
    setShowDocRequirements(false); setShowInstructors(false);
    setStartDate({ day: "", month: "", year: "" });
    setEndDate({ day: "", month: "", year: "" });
  };

  const copyFromPreviousBatch = async () => {
    if (!previousBatchForCourse) return;
    setCopying(true);
    const prev = previousBatchForCourse;
    const [{ data: links }, { data: instructorLinks }, { data: docs }] = await Promise.all([
      supabase.from("batch_branches").select("branch_id, capacity").eq("batch_id", prev.id),
      (supabase.from("batch_instructors" as any) as any).select("user_id").eq("batch_id", prev.id),
      supabase.from("batch_document_requirements").select("doc_type, mandatory").eq("batch_id", prev.id),
    ]);
    setCopying(false);

    setStartDate(isoToDateSelectValue(prev.start_date));
    setEndDate(isoToDateSelectValue(prev.end_date));
    const capMap: Record<string, number> = {};
    (links ?? []).forEach((l: any) => { capMap[l.branch_id] = l.capacity; });
    setBranchCaps(capMap);
    setSelectedInstructors((instructorLinks ?? []).map((l: any) => l.user_id));
    setDocRequirements((docs as any) ?? []);
    setApplicationDeadline(prev.application_deadline ?? "");
    setFeeCollection(prev.fee_collection ?? "manual");

    // Batch-level fields not in the summary row — fetch the full previous batch.
    const { data: full } = await supabase.from("batches").select("*").eq("id", prev.id).maybeSingle();
    if (full) {
      setDescription((full as any).description ?? "");
      setDescriptionBn((full as any).description_bn ?? "");
      setRequirementsText((full as any).requirements_text ?? "");
      setEligGender((full as any).eligibility_gender ?? "");
      setEligEducation((full as any).eligibility_education ?? "");
      setEligMinAge((full as any).eligibility_min_age != null ? String((full as any).eligibility_min_age) : "");
      setEligMaxAge((full as any).eligibility_max_age != null ? String((full as any).eligibility_max_age) : "");
      setDurationValue((full as any).duration_value != null ? String((full as any).duration_value) : "");
      setDurationUnit((full as any).duration_unit ?? "hours");
      setPrice((full as any).price != null ? String((full as any).price) : "");
    }

    setShowDescription(true); setShowRequirements(true); setShowDurationFee(true);
    setShowDocRequirements((docs ?? []).length > 0); setShowInstructors((instructorLinks ?? []).length > 0);
    toast.success("Copied from previous batch — review and adjust as needed");
  };

  const onSelectCourse = async (courseId: string) => {
    setSelectedCourse(courseId);
    const { data } = await (supabase.rpc as any)("peek_next_batch_code");
    setPreviewCode(data ?? null);
  };

  const addDocRequirement = () =>
    setDocRequirements((p) => [...p, { doc_type: "other", mandatory: true }]);
  const updateDocRequirement = (i: number, patch: Partial<DocRequirement>) =>
    setDocRequirements((p) => p.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const removeDocRequirement = (i: number) =>
    setDocRequirements((p) => p.filter((_, idx) => idx !== i));

  const buildPayload = (status: "draft" | "unpublished") => {
    const startISO = dateSelectValueToISO(startDate);
    const endISO = dateSelectValueToISO(endDate);
    return {
      course_id: selectedCourse,
      name: batchName.trim(),
      start_date: startISO,
      end_date: endISO,
      status,
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
      application_deadline: applicationDeadline || null,
      fee_collection: feeCollection,
    };
  };

  const saveLinkedRecords = async (batchId: string) => {
    const selectedBranchIds = Object.keys(branchCaps);
    if (selectedBranchIds.length) {
      const links = selectedBranchIds.map((bid) => ({ batch_id: batchId, branch_id: bid, capacity: branchCaps[bid] }));
      await supabase.from("batch_branches").insert(links);
    }
    if (docRequirements.length) {
      await supabase.from("batch_document_requirements").insert(
        docRequirements.map((d) => ({ batch_id: batchId, doc_type: d.doc_type, mandatory: d.mandatory }))
      );
    }
    if (selectedInstructors.length) {
      await (supabase.from("batch_instructors" as any) as any).insert(
        selectedInstructors.map((uid) => ({ batch_id: batchId, user_id: uid, center_id: center!.id }))
      );
    }
  };

  const handleSaveDraft = async () => {
    if (!center) return;
    if (!selectedCourse) { toast.error("Select a course"); return; }
    if (!batchName.trim()) { toast.error("Enter at least a batch name to save a draft"); return; }
    setSaving(true);
    const totalCapacity = Object.values(branchCaps).reduce((s, c) => s + c, 0);
    const { data: created, error } = await supabase.from("batches").insert({
      center_id: center.id,
      ...buildPayload("draft"),
      capacity: totalCapacity || 0,
    } as any).select().single();
    setSaving(false);
    if (error || !created) { toast.error(friendlyError(error, "Failed to save draft")); return; }
    await saveLinkedRecords(created.id);
    toast.success("Saved as draft");
    setOpen(false); resetForm();
    load();
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!center || !selectedCourse) { toast.error("Select a course"); return; }
    if (!batchName.trim()) { toast.error("Batch name is required"); return; }
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
    const payload = buildPayload("unpublished");
    if (new Date(payload.start_date!) > new Date(payload.end_date!)) { toast.error("Start date must be before end date"); return; }
    const { count: nameCount } = await supabase.from("batches")
      .select("id", { count: "exact", head: true })
      .eq("center_id", center.id).eq("name", batchName.trim());
    if (nameCount && nameCount > 0) {
      toast.error("A batch with this name already exists in your center.");
      return;
    }
    setSaving(true);
    const totalCapacity = selectedBranchIds.reduce((s, id) => s + branchCaps[id], 0);
    const { data: created, error } = await supabase.from("batches").insert({
      center_id: center.id,
      ...payload,
      capacity: totalCapacity,
    } as any).select().single();
    if (error || !created) { setSaving(false); toast.error(friendlyError(error, "Failed to create batch")); return; }
    await saveLinkedRecords(created.id);
    setSaving(false);
    toast.success("Batch created");
    setOpen(false); resetForm();
    load();
  };

  // unpublished -> under_review (admin submits for Ami Probashi's review)
  const submitForReview = async (b: Batch) => {
    const { error } = await supabase.from("batches").update({ status: "under_review" }).eq("id", b.id);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("Submitted to Ami Probashi for review");
    load();
  };

  // published -> unpublished (admin pulls it back down, no review needed for this direction)
  const unpublish = async (b: Batch) => {
    const { error } = await supabase.from("batches").update({ status: "unpublished" }).eq("id", b.id);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("Unpublished");
    load();
  };

  // Demo only: stands in for Ami Probashi's internal review team approving the submission.
  const simulateApproval = async (b: Batch) => {
    const { error } = await supabase.from("batches").update({ status: "published" }).eq("id", b.id);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("Approved — now live on Ami Probashi");
    load();
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader
          title="Batches"
          description="Live training cohorts — submit to Ami Probashi for review to start receiving applications."
          action={
            <Dialog open={open} onOpenChange={(o) => {
              setOpen(o);
              if (!o) {
                resetForm();
              } else if (branches.length === 1) {
                setBranchCaps({ [branches[0].id]: 30 });
              } else if (branches.length > 1) {
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
                  {previewCode && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Will be assigned: <span className="font-semibold text-foreground">{previewCode}</span>
                      <span className="italic"> (only if saved)</span>
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label>Course *</Label>
                    <Select value={selectedCourse} onValueChange={onSelectCourse}>
                      <SelectTrigger><SelectValue placeholder="Choose course" /></SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {previousBatchForCourse && (
                    <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        Found a previous batch (<span className="font-medium text-foreground">{previousBatchForCourse.name}</span>) for this course.
                      </p>
                      <Button type="button" size="sm" variant="outline" onClick={copyFromPreviousBatch} disabled={copying}>
                        <Copy className="h-3.5 w-3.5 mr-1.5" /> {copying ? "Copying…" : "Copy from previous batch"}
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="name">Batch name *</Label>
                    <Input
                      id="name" maxLength={100} placeholder="Morning Batch — Jan 2026"
                      value={batchName} onChange={(e) => setBatchName(e.target.value)}
                    />
                  </div>

                  <DateSelect label="Start date" value={startDate} onChange={setStartDate} />
                  <DateSelect label="End date" value={endDate} onChange={setEndDate} />

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

                  {/* ── Description ── */}
                  <CollapsibleSection title="Description" open={showDescription} onToggle={() => setShowDescription((v) => !v)}>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (English)</Label>
                      <Textarea id="description" rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description_bn">Description (Bangla)</Label>
                      <Textarea id="description_bn" rows={3} maxLength={1000} value={descriptionBn} onChange={(e) => setDescriptionBn(e.target.value)} />
                    </div>
                  </CollapsibleSection>

                  {/* ── Requirements ── */}
                  <CollapsibleSection title="Requirements" open={showRequirements} onToggle={() => setShowRequirements((v) => !v)}>
                    <p className="text-xs text-muted-foreground -mt-2">Used to gate who can apply on the app. Leave any field unset for no restriction.</p>
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
                  </CollapsibleSection>

                  {/* ── Duration & fee ── */}
                  <CollapsibleSection title="Duration & fee" open={showDurationFee} onToggle={() => setShowDurationFee((v) => !v)}>
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
                        <Input id="application_deadline" type="date" value={applicationDeadline} onChange={(e) => setApplicationDeadline(e.target.value)} />
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
                  </CollapsibleSection>

                  {/* ── Document requirements ── */}
                  <CollapsibleSection title="Document requirements" open={showDocRequirements} onToggle={() => setShowDocRequirements((v) => !v)}>
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
                  </CollapsibleSection>

                  {/* ── Instructors ── */}
                  <CollapsibleSection title="Instructors" open={showInstructors} onToggle={() => setShowInstructors((v) => !v)}>
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
                  </CollapsibleSection>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      disabled={saving || !selectedCourse || !batchName.trim()}
                      onClick={handleSaveDraft}
                    >
                      Save as draft
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={saving || branches.length === 0 || Object.keys(branchCaps).length === 0}
                    >
                      {saving ? "Saving…" : "Create batch"}
                    </Button>
                  </div>
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
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{b.courses?.title}</Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">{b.code}</span>
                    </div>
                    <h3 className="font-semibold text-lg">{b.name}</h3>
                  </div>
                  <StatusBadge status={BATCH_STATUS_CONFIG[b.status] ?? BATCH_STATUS_CONFIG.draft} />
                </div>
                {(b.courses?.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(b.courses?.tags ?? []).map((t) => (
                      <span key={t} className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {b.start_date && b.end_date
                      ? `${format(new Date(b.start_date), "MMM d")} → ${format(new Date(b.end_date), "MMM d, yyyy")}`
                      : "Dates not set"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {b.enrollment_count ?? 0} / {b.capacity}
                  </span>
                </div>
                {b.application_deadline && (
                  <p className="text-xs text-muted-foreground mt-1">Applications close {format(new Date(b.application_deadline), "MMM d, yyyy")}</p>
                )}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  {b.status === "published" ? (
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Switch checked onCheckedChange={() => unpublish(b)} />
                      <Smartphone className="h-3.5 w-3.5 text-success" />
                      <span className="text-success font-medium">Live on Ami Probashi</span>
                    </label>
                  ) : b.status === "under_review" ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-warning font-medium">Pending Ami Probashi review</span>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => simulateApproval(b)}>
                        <Sparkles className="h-3.5 w-3.5" /> Simulate approval (demo)
                      </Button>
                    </div>
                  ) : b.status === "unpublished" ? (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPendingPublish(b)}>
                      <Smartphone className="h-3.5 w-3.5" /> Publish to Ami Probashi
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Complete this draft to publish it</span>
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
        title="Submit this batch to Ami Probashi?"
        description={`"${pendingPublish?.name}" will be sent for review. Once approved by the Ami Probashi team it becomes visible to app users and starts accepting applications.`}
        confirmLabel="Submit for review"
        variant="default"
        onConfirm={() => {
          if (pendingPublish) submitForReview(pendingPublish);
          setPendingPublish(null);
        }}
      />
    </AppLayout>
  );
}

function CollapsibleSection({
  title, open, onToggle, children,
}: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border rounded-md overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
      >
        <span>{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-4 border-t pt-4">{children}</div>}
    </div>
  );
}
