import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Check, X, Sparkles, ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import ListSkeleton from "@/components/ListSkeleton";
import { friendlyError } from "@/lib/errors";

const MOCK_NAMES = [
  { name: "Md. Rahim Uddin", phone: "+8801712345001", nid: "1990123456789" },
  { name: "Sumaiya Akter", phone: "+8801712345002", nid: "1992123456790" },
  { name: "Abdul Karim", phone: "+8801712345003", nid: "1988123456791" },
  { name: "Nasir Hossain", phone: "+8801712345004", nid: "1995123456792" },
  { name: "Fatema Begum", phone: "+8801712345005", nid: "1993123456793" },
];

export default function Applications() {
  const { center } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [shortlistedBatchId, setShortlistedBatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [branchNamesByBatch, setBranchNamesByBatch] = useState<Record<string, string[]>>({});

  const load = async () => {
    if (!center) return;
    const { data: b } = await supabase
      .from("batches")
      .select("*, courses(title)")
      .eq("center_id", center.id)
      .eq("status", "published");
    setBatches(b ?? []);
    const { data: e } = await supabase
      .from("enrollments")
      .select("*, students(*), batches!inner(name, start_date, courses(title), center_id)")
      .eq("source", "ami_probashi")
      .eq("pipeline_status", "applied")
      .eq("batches.center_id", center.id)
      .order("applied_at", { ascending: false });
    setEnrollments(e ?? []);

    // batch_branches has no FK to branches at the DB level, so PostgREST can't
    // embed it — resolve the two steps manually (same pattern as user_roles -> profiles).
    const batchIds = Array.from(new Set((e ?? []).map((row: any) => row.batch_id)));
    if (batchIds.length) {
      const { data: links } = await supabase
        .from("batch_branches")
        .select("batch_id, branch_id")
        .in("batch_id", batchIds);
      const branchIds = Array.from(new Set((links ?? []).map((l: any) => l.branch_id)));
      const { data: branchRows } = branchIds.length
        ? await supabase.from("branches").select("id, name_en").in("id", branchIds)
        : { data: [] as any[] };
      const nameById = new Map((branchRows ?? []).map((br: any) => [br.id, br.name_en]));
      const grouped: Record<string, string[]> = {};
      (links ?? []).forEach((l: any) => {
        (grouped[l.batch_id] ??= []).push(nameById.get(l.branch_id) ?? "Unknown branch");
      });
      setBranchNamesByBatch(grouped);
    } else {
      setBranchNamesByBatch({});
    }

    setLoading(false);
  };
  useEffect(() => { load(); }, [center]);

  const seedMockApplications = async () => {
    if (!center || batches.length === 0) { toast.error("Publish a batch first."); return; }
    const batch = batches[0];
    let created = 0;
    for (const m of MOCK_NAMES) {
      const { data: s } = await supabase.from("students").insert({
        center_id: center.id, full_name: m.name, phone: m.phone, nid: m.nid,
      }).select().single();
      if (!s) continue;
      const { error } = await supabase.from("enrollments").insert({
        batch_id: batch.id, student_id: s.id, source: "ami_probashi", pipeline_status: "applied",
      });
      if (!error) created++;
    }
    toast.success(`${created} mock applications received from Ami Probashi`);
    load();
  };

  const decide = async (enrId: string, accept: boolean, batchId?: string) => {
    const { error } = await supabase.from("enrollments").update({
      pipeline_status: accept ? "shortlisted" : "rejected",
    }).eq("id", enrId);
    if (error) { toast.error(friendlyError(error)); return; }
    if (accept) {
      setShortlistedBatchId(batchId ?? null);
      toast.success("Shortlisted — student moved to batch pipeline");
    } else {
      toast.success("Application rejected");
    }
    load();
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader
          title="Applications"
          description="Incoming applications from the Ami Probashi mobile app."
          action={
            <Button variant="outline" onClick={seedMockApplications}>
              <Sparkles className="h-4 w-4 mr-2" /> Simulate app applications
            </Button>
          }
        />
        {shortlistedBatchId && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-success/30 bg-success/5 px-4 py-3">
            <p className="text-sm text-success font-medium">Student shortlisted. Continue in the batch pipeline.</p>
            <Link to={`/app/batches/${shortlistedBatchId}`}>
              <Button size="sm" variant="outline" className="gap-1">
                Go to batch <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}
        {loading ? (
          <ListSkeleton />
        ) : enrollments.length === 0 ? (
          <Card className="p-12 text-center">
            <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-2">No pending applications.</p>
            <p className="text-xs text-muted-foreground">
              Publish a batch to Ami Probashi to start receiving applications, or click "Simulate" to test.
            </p>
          </Card>
        ) : (
          <Card className="divide-y">
            {enrollments.map((e) => {
              const branchNames = branchNamesByBatch[e.batch_id] ?? [];
              return (
              <div key={e.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-info/10 text-info flex items-center justify-center font-semibold shrink-0">
                    {e.students.full_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{e.students.full_name}</span>
                      <span className="text-xs text-muted-foreground truncate">{e.students.phone}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <Link to={`/app/batches/${e.batch_id}`} className="hover:underline">
                        <Badge variant="secondary" className="text-[10px]">
                          {e.batches?.courses?.title} — {e.batches?.name}
                        </Badge>
                      </Link>
                      {e.batches?.start_date && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <CalendarDays className="h-3 w-3" /> Starts {format(new Date(e.batches.start_date), "MMM d, yyyy")}
                        </span>
                      )}
                      {branchNames.length > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {branchNames.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px]"><Smartphone className="h-3 w-3 mr-1" />Ami Probashi</Badge>
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => decide(e.id, false)}>
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button size="sm" onClick={() => decide(e.id, true, e.batch_id)}>
                    <Check className="h-4 w-4 mr-1" /> Shortlist
                  </Button>
                </div>
              </div>
              );
            })}
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
