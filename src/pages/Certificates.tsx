import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePlan } from "@/lib/plan";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import FeatureLockedPage from "@/components/FeatureLockedPage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { Award, Check, Lock, Sparkles, Upload, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CERT_TEMPLATES,
  getBatchTemplateId,
  setBatchTemplateId,
  getCustomPdf,
  setCustomPdf,
  CustomCertPdf,
} from "@/lib/certificateTemplates";

export default function Certificates() {
  const { center } = useAuth();
  const { plan } = usePlan();
  const [items, setItems] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [batchTemplates, setBatchTemplates] = useState<Record<string, string>>({});
  const [customPdf, setCustomPdfState] = useState<CustomCertPdf | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const certificatesLocked = plan.locked.certificates;
  const customLocked = plan.locked.customCertificate;

  useEffect(() => {
    if (!center) return;
    setCustomPdfState(getCustomPdf(center.id));
    (async () => {
      const { data: enr } = await supabase
        .from("enrollments")
        .select("*, students(full_name), batches!inner(name, center_id, courses(title))")
        .eq("batches.center_id", center.id)
        .eq("pipeline_status", "certified")
        .order("certificate_issued_at", { ascending: false });
      setItems(enr ?? []);

      const { data: bs } = await supabase
        .from("batches")
        .select("id, name, courses(title)")
        .eq("center_id", center.id)
        .order("created_at", { ascending: false });
      setBatches(bs ?? []);
      const map: Record<string, string> = {};
      (bs ?? []).forEach((b: any) => (map[b.id] = getBatchTemplateId(b.id)));
      setBatchTemplates(map);
    })();
  }, [center]);

  const handlePickTemplate = (batchId: string, templateId: string) => {
    setBatchTemplateId(batchId, templateId);
    setBatchTemplates((m) => ({ ...m, [batchId]: templateId }));
    toast.success("Template updated for this batch");
  };

  const handleUploadCustom = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !center) return;
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("PDF must be under 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const pdf: CustomCertPdf = {
        name: file.name,
        dataUrl: reader.result as string,
        uploadedAt: new Date().toISOString(),
      };
      setCustomPdf(center.id, pdf);
      setCustomPdfState(pdf);
      toast.success("Custom certificate uploaded");
    };
    reader.readAsDataURL(file);
  };

  const removeCustom = () => {
    if (!center) return;
    setCustomPdf(center.id, null);
    setCustomPdfState(null);
    toast.success("Custom certificate removed");
  };

  if (certificatesLocked) {
    return (
      <FeatureLockedPage
        title="Certificates"
        feature="Issue branded completion certificates"
        description="Generate, customize and download branded certificates for students who complete a batch."
        requiredPlan="Premium"
      />
    );
  }

  const templateOptions = [
    ...CERT_TEMPLATES,
    ...(customPdf ? [{ id: "custom-pdf", name: `Custom · ${customPdf.name}` }] : []),
  ];

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader title="Certificates" description="Issue certificates, browse templates and upload your own design." />

        <Tabs defaultValue="issued" className="mt-2">
          <TabsList>
            <TabsTrigger value="issued">Issued</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="custom">Custom Template</TabsTrigger>
          </TabsList>

          {/* ISSUED */}
          <TabsContent value="issued" className="mt-6">
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
          </TabsContent>

          {/* TEMPLATES */}
          <TabsContent value="templates" className="mt-6 space-y-8">
            <div>
              <h2 className="text-lg font-semibold mb-3">Available templates</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {CERT_TEMPLATES.map((tpl) => (
                  <Card key={tpl.id} className="p-4">
                    <div className={cn(
                      "aspect-[1.414/1] rounded-md mb-3 flex flex-col items-center justify-center text-center p-3",
                      tpl.border,
                      tpl.accent === "gold" && "bg-gradient-gold/10",
                      tpl.accent === "navy" && "bg-primary/5",
                      tpl.accent === "emerald" && "bg-success/5",
                      tpl.accent === "minimal" && "bg-muted/30",
                    )}>
                      <Award className={cn("h-6 w-6 mb-1",
                        tpl.accent === "gold" && "text-accent",
                        tpl.accent === "navy" && "text-primary",
                        tpl.accent === "emerald" && "text-success",
                        tpl.accent === "minimal" && "text-muted-foreground",
                      )} />
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Certificate</div>
                      <div className="text-xs font-semibold mt-1">{tpl.name}</div>
                    </div>
                    <div className="font-medium text-sm">{tpl.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{tpl.description}</div>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Assign a template to each batch</h2>
              {batches.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground text-sm">
                  Create a batch first to assign templates.
                </Card>
              ) : (
                <Card className="divide-y">
                  {batches.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-4 p-4">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{b.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{b.courses?.title}</div>
                      </div>
                      <Select
                        value={batchTemplates[b.id] ?? CERT_TEMPLATES[0].id}
                        onValueChange={(v) => handlePickTemplate(b.id, v)}
                      >
                        <SelectTrigger className="w-[260px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {templateOptions.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </Card>
              )}
            </div>
          </TabsContent>

          {/* CUSTOM */}
          <TabsContent value="custom" className="mt-6">
            {customLocked ? (
              <Card className="p-10 text-center">
                <div className="h-14 w-14 mx-auto rounded-full bg-gradient-gold flex items-center justify-center shadow-gold mb-4">
                  <Lock className="h-6 w-6 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-1">Custom certificate templates</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-5">
                  Upload your own designed PDF and use it as the certificate for any batch.
                  Available on the Premium plan.
                </p>
                <Link to="/app/plans">
                  <Button size="lg" className="gap-2">
                    <Sparkles className="h-4 w-4" /> Upgrade to Premium
                  </Button>
                </Link>
              </Card>
            ) : (
              <Card className="p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">Custom PDF template</h3>
                      <Badge variant="outline" className="border-accent/50 text-accent">Premium</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                      Upload a print-ready PDF (A4 landscape recommended, max 5 MB).
                      Once uploaded, you can assign it to any batch from the Templates tab.
                    </p>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleUploadCustom}
                  />
                  <Button onClick={() => fileRef.current?.click()} className="gap-2 shrink-0">
                    <Upload className="h-4 w-4" /> Upload PDF
                  </Button>
                </div>

                {customPdf ? (
                  <div className="border rounded-lg p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded bg-accent/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        {customPdf.name}
                        <Check className="h-4 w-4 text-success" />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Uploaded {format(new Date(customPdf.uploadedAt), "PP p")}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={removeCustom} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">
                    No custom certificate uploaded yet.
                  </div>
                )}
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
