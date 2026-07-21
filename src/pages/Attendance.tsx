import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePlan } from "@/lib/plan";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import FeatureLockedPage from "@/components/FeatureLockedPage";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ClipboardCheck, ArrowRight } from "lucide-react";

export default function Attendance() {
  const { center } = useAuth();
  const { plan } = usePlan();
  const [batches, setBatches] = useState<any[]>([]);

  if (plan.locked.attendance) {
    return (
      <FeatureLockedPage
        title="Attendance"
        feature="Daily attendance tracking"
        description="Track student attendance per session, export reports, and link attendance to certificate eligibility."
        requiredPlan="Premium"
      />
    );
  }

  useEffect(() => {
    if (!center) return;
    (async () => {
      const { data } = await supabase
        .from("batches")
        .select("*, courses(title)")
        .eq("center_id", center.id)
        .in("status", ["in_progress", "published"]);
      setBatches(data ?? []);
    })();
  }, [center]);

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader title="Attendance" description="Pick a batch to mark daily attendance." />
        {batches.length === 0 ? (
          <Card className="p-12 text-center">
            <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No active batches yet.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {batches.map((b) => (
              <Link key={b.id} to={`/app/batches/${b.id}?tab=attendance`}>
                <Card className="p-5 hover:shadow-elegant transition-shadow flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{b.name}</div>
                    <div className="text-sm text-muted-foreground">{b.courses?.title}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
