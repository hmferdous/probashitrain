import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, CalendarDays, Smartphone, Users, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface Batch {
  id: string; name: string; start_date: string; end_date: string;
  capacity: number; status: string; published_to_ami_probashi: boolean;
  course_id: string; courses?: { title: string; trades?: { name: string } };
  enrollment_count?: number;
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
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [branchCaps, setBranchCaps] = useState<Record<string, number>>({});

  const load = async () => {
    if (!center) return;
    const [b, c, br] = await Promise.all([
      supabase
        .from("batches")
        .select("*, courses(title, trades(name))")
        .eq("center_id", center.id)
        .order("start_date", { ascending: false }),
      supabase.from("courses").select("id, title").eq("center_id", center.id),
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
    setCourses(c.data ?? []);
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
    }).select().single();
    if (error || !created) { toast.error(error?.message || "Failed to create"); return; }
    const links = selectedBranchIds.map((bid) => ({
      batch_id: created.id, branch_id: bid, capacity: branchCaps[bid],
    }));
    const { error: linkErr } = await supabase.from("batch_branches").insert(links);
    if (linkErr) { toast.error(linkErr.message); return; }
    toast.success("Session created");
    setOpen(false); setSelectedCourse(""); setBranchCaps({});
    load();
  };

  const togglePublish = async (b: Batch) => {
    const next = !b.published_to_ami_probashi;
    const updates: any = { published_to_ami_probashi: next };
    if (next && b.status === "draft") updates.status = "published";
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
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button disabled={courses.length === 0}><Plus className="h-4 w-4 mr-2" /> New batch</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New training batch</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Course *</Label>
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
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
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input id="capacity" name="capacity" type="number" defaultValue={30} min={1} />
                  </div>
                  <Button type="submit" className="w-full">Create batch</Button>
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
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {format(new Date(b.start_date), "MMM d")} → {format(new Date(b.end_date), "MMM d, yyyy")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {b.enrollment_count ?? 0} / {b.capacity}
                  </span>
                </div>
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
