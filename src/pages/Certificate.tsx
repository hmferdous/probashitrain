import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Award } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  getBatchTemplateId,
  getTemplateById,
  getBuilderConfig,
  isCustomTemplate,
  CertVariableKey,
} from "@/lib/certificateTemplates";
import { BuiltCertificate } from "@/components/CertificateBuilder";

export default function Certificate() {
  const { id } = useParams<{ id: string }>();
  const { center } = useAuth();
  const [enr, setEnr] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    supabase
      .from("enrollments")
      .select("*, students(*), batches(*, courses(*))")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setEnr(data));
  }, [id]);

  const handleDownload = () => window.print();

  if (!enr) return <AppLayout><div className="p-8">Loading…</div></AppLayout>;

  const batchId = enr.batch_id;
  const templateId = getBatchTemplateId(batchId);
  const useCustom = isCustomTemplate(templateId);
  const tpl = getTemplateById(templateId);

  const builder = useCustom && center ? getBuilderConfig(center.id) : null;
  const values: Partial<Record<CertVariableKey, string>> = {
    student_name: enr.students?.full_name,
    completion_date: enr.certificate_issued_at
      ? format(new Date(enr.certificate_issued_at), "PP")
      : "",
    session_end_date: enr.batches?.end_date
      ? format(new Date(enr.batches.end_date), "PP")
      : "",
    course_end_date: enr.batches?.end_date
      ? format(new Date(enr.batches.end_date), "PP")
      : "",
    course_name: enr.batches?.courses?.title,
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Template: <span className="font-medium text-foreground">
                {useCustom ? "Custom builder" : tpl.name}
              </span>
            </span>
            <Button onClick={handleDownload}><Download className="h-4 w-4 mr-2" /> Download / Print</Button>
          </div>
        </div>

        {useCustom && builder ? (
          <BuiltCertificate cfg={builder} values={values} />
        ) : (
          <PresetCertificate enr={enr} center={center} tpl={tpl} />
        )}
      </div>
    </AppLayout>
  );
}

function PresetCertificate({ enr, center, tpl }: { enr: any; center: any; tpl: ReturnType<typeof getTemplateById> }) {
  const accentText =
    tpl.accent === "gold" ? "text-accent" :
    tpl.accent === "navy" ? "text-primary" :
    tpl.accent === "emerald" ? "text-success" :
    "text-foreground";

  const bgTint =
    tpl.accent === "gold" ? "bg-gradient-gold/10" :
    tpl.accent === "navy" ? "bg-primary/5" :
    tpl.accent === "emerald" ? "bg-success/5" :
    "bg-muted/20";

  return (
    <div className={cn(
      "aspect-[1.414/1] bg-card rounded-lg shadow-elegant relative overflow-hidden p-12 flex flex-col items-center justify-center text-center",
      tpl.border,
      bgTint,
    )}>
      {tpl.layout !== "minimal" && (
        <div className={cn(
          "absolute top-0 left-0 right-0 h-32 opacity-10",
          tpl.accent === "gold" && "bg-gradient-gold",
          tpl.accent === "navy" && "bg-gradient-primary",
          tpl.accent === "emerald" && "bg-success",
        )} />
      )}
      <Award className={cn("h-16 w-16 mb-4", accentText)} />
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Certificate of Completion</p>
      <h1 className="text-4xl font-bold mt-3 mb-1">{center?.name}</h1>
      <div className={cn(
        "h-1 w-24 rounded-full my-4",
        tpl.accent === "gold" && "bg-gradient-gold",
        tpl.accent === "navy" && "bg-primary",
        tpl.accent === "emerald" && "bg-success",
        tpl.accent === "minimal" && "bg-border",
      )} />
      <p className="text-sm text-muted-foreground">This is to certify that</p>
      <h2 className={cn("text-3xl font-bold mt-2 mb-2", accentText)}>{enr.students.full_name}</h2>
      <p className="text-sm max-w-xl text-muted-foreground">
        has successfully completed the training program
      </p>
      <p className="text-xl font-semibold mt-3">{enr.batches?.courses?.title}</p>
      {enr.batches?.duration_value != null && (
        <p className="text-sm text-muted-foreground">
          ({enr.batches.duration_value} {enr.batches.duration_unit ?? "hours"})
        </p>
      )}
      {enr.performance_score != null && (
        <p className="mt-4 text-sm">Performance score: <span className={cn("font-semibold", accentText)}>{enr.performance_score} / 100</span></p>
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
  );
}
