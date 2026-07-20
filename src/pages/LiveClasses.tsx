import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePlan } from "@/lib/plan";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import FeatureLockedPage from "@/components/FeatureLockedPage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Video } from "lucide-react";
import { format } from "date-fns";
import ListSkeleton from "@/components/ListSkeleton";
import EmptyState from "@/components/EmptyState";

export default function LiveClasses() {
  const { center } = useAuth();
  const { plan } = usePlan();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  if (plan.locked.liveClasses) {
    return (
      <FeatureLockedPage
        title="Live Classes"
        feature="Host online classes inside the portal"
        description="Schedule and run live online classes with built-in video, attendance tracking, and recording. Available only on Enterprise."
        requiredPlan="Enterprise"
      />
    );
  }

  useEffect(() => {
    if (!center) return;
    (async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("*, batches!inner(name, center_id, courses(title))")
        .eq("batches.center_id", center.id)
        .order("scheduled_at", { ascending: false });
      setSessions(data ?? []);
      setLoading(false);
    })();
  }, [center]);

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader title="Live Classes" description="All scheduled live sessions across your batches." />
        {loading ? (
          <ListSkeleton />
        ) : sessions.length === 0 ? (
          <EmptyState icon={Video} message="No live sessions yet. Schedule one from a batch." />
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <Card key={s.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.batches?.courses?.title} — {s.batches?.name} · {format(new Date(s.scheduled_at), "PPp")}
                  </div>
                </div>
                <Link to={`/app/live/${s.id}`}>
                  <Button><Video className="h-4 w-4 mr-2" /> Join</Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
