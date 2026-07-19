import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Check, X, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import ListSkeleton from "@/components/ListSkeleton";

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

  const load = async () => {
    if (!center) return;
    const { data: b } = await supabase
      .from("batches")
      .select("*, courses(title)")
      .eq("center_id", center.id)
      .eq("published_to_ami_probashi", true);
    setBatches(b ?? []);
    const { data: e } = await supabase
      .from("enrollments")
      .select("*, students(*), batches!inner(name, courses(title), center_id)")
      .eq("source", "ami_probashi")
      .eq("pipeline_status", "applied")
      .eq("batches.center_id", center.id)
      .order("applied_at", { ascending: false });
    setEnrollments(e ?? []);
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
    if (error) { toast.error(error.message); return; }
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
            {enrollments.map((e) => (
              <div key={e.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-info/10 text-info flex items-center justify-center font-semibold shrink-0">
                    {e.students.full_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.students.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {e.students.phone} · Applied for{" "}
                      <Link to={`/app/batches/${e.batch_id}`} className="font-medium hover:underline">
                        {e.batches?.courses?.title} — {e.batches?.name}
                      </Link>
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
            ))}
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
