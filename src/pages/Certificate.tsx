import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Award } from "lucide-react";
import { format } from "date-fns";

export default function Certificate() {
  const { id } = useParams<{ id: string }>();
  const { center } = useAuth();
  const [enr, setEnr] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    supabase
      .from("enrollments")
      .select("*, students(*), batches(*, courses(*, trades(name)))")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setEnr(data));
  }, [id]);

  const handleDownload = () => window.print();

  if (!enr) return <AppLayout><div className="p-8">Loading…</div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Button onClick={handleDownload}><Download className="h-4 w-4 mr-2" /> Download / Print</Button>
        </div>

        <div id="cert" className="aspect-[1.414/1] bg-card border-[12px] border-double border-accent rounded-lg shadow-elegant relative overflow-hidden p-12 flex flex-col items-center justify-center text-center">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-primary opacity-10" />
          <Award className="h-16 w-16 text-accent mb-4" />
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Certificate of Completion</p>
          <h1 className="text-4xl font-bold mt-3 mb-1">{center?.name}</h1>
          <div className="h-1 w-24 bg-gradient-gold rounded-full my-4" />
          <p className="text-sm text-muted-foreground">This is to certify that</p>
          <h2 className="text-3xl font-bold mt-2 mb-2 text-primary">{enr.students.full_name}</h2>
          <p className="text-sm max-w-xl text-muted-foreground">
            has successfully completed the training program
          </p>
          <p className="text-xl font-semibold mt-3">
            {enr.batches?.courses?.title}
          </p>
          <p className="text-sm text-muted-foreground">
            ({enr.batches?.courses?.trades?.name} · {enr.batches?.courses?.duration_hours} hours)
          </p>
          {enr.performance_score != null && (
            <p className="mt-4 text-sm">Performance score: <span className="font-semibold text-accent">{enr.performance_score} / 100</span></p>
          )}
          <div className="grid grid-cols-2 gap-12 mt-10 w-full max-w-md">
            <div className="text-center">
              <div className="border-t pt-2 text-xs text-muted-foreground">
                Issued {enr.certificate_issued_at ? format(new Date(enr.certificate_issued_at), "PP") : "—"}
              </div>
            </div>
            <div className="text-center">
              <div className="border-t pt-2 text-xs text-muted-foreground">Authorized Signature</div>
            </div>
          </div>
          <p className="absolute bottom-3 right-4 text-[10px] text-muted-foreground font-mono">
            Cert ID: {enr.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
