import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePlan } from "@/lib/plan";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import FeatureLockedPage from "@/components/FeatureLockedPage";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Award } from "lucide-react";
import { format } from "date-fns";

export default function Certificates() {
  const { center } = useAuth();
  const { plan } = usePlan();
  const [items, setItems] = useState<any[]>([]);

  if (plan.locked.certificates) {
    return (
      <FeatureLockedPage
        title="Certificates"
        feature="Issue branded completion certificates"
        description="Generate and download branded certificates for students who complete a batch."
        requiredPlan="Premium"
      />
    );
  }

  useEffect(() => {
    if (!center) return;
    (async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*, students(full_name), batches!inner(name, center_id, courses(title))")
        .eq("batches.center_id", center.id)
        .eq("pipeline_status", "certified")
        .order("certificate_issued_at", { ascending: false });
      setItems(data ?? []);
    })();
  }, [center]);

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader title="Certificates" description="Issued certificates for completed students." />
        {items.length === 0 ? (
          <Card className="p-12 text-center">
            <Award className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No certificates issued yet.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => (
              <Link key={it.id} to={`/app/certificates/${it.id}`}>
                <Card className="p-5 bg-gradient-gold/10 border-accent/40 hover:shadow-gold transition-shadow">
                  <Award className="h-6 w-6 text-accent mb-3" />
                  <div className="font-semibold">{it.students.full_name}</div>
                  <div className="text-sm text-muted-foreground">{it.batches?.courses?.title}</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Issued {it.certificate_issued_at ? format(new Date(it.certificate_issued_at), "PP") : "—"}
                  </div>
                  {it.performance_score != null && (
                    <div className="text-xs mt-1">Score: <span className="font-semibold">{it.performance_score}</span></div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
