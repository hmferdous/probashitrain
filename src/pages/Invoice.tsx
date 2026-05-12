import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Printer } from "lucide-react";
import { format } from "date-fns";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  ami_probashi: "Ami Probashi (App)",
  bank: "Bank Transfer",
  mobile_banking: "Mobile Banking",
  other: "Other",
};

export default function Invoice() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: pay } = await (supabase.from as any)("payments")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!pay) { setData({ notFound: true }); return; }
      const { data: enr } = await supabase
        .from("enrollments")
        .select("*, students(*), batches(*, courses(title, price))")
        .eq("id", pay.enrollment_id)
        .maybeSingle();
      const { data: center } = await supabase
        .from("training_centers")
        .select("*")
        .eq("id", pay.center_id)
        .maybeSingle();
      const { data: allPays } = await (supabase.from as any)("payments")
        .select("*")
        .eq("enrollment_id", pay.enrollment_id)
        .order("paid_at", { ascending: true });
      setData({ pay, enr, center, allPays: allPays ?? [] });
    })();
  }, [id]);

  if (!data) return <AppLayout><div className="p-8">Loading…</div></AppLayout>;
  if (data.notFound) return <AppLayout><div className="p-8">Invoice not found.</div></AppLayout>;

  const { pay, enr, center, allPays } = data;
  const totalPaid = allPays.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const fee = Number(enr?.batches?.courses?.price ?? 0);
  const due = Math.max(0, fee - totalPaid);

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Link to="/app/payments" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to payments
          </Link>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print invoice
          </Button>
        </div>

        <Card className="p-10 shadow-elegant print:shadow-none print:border-0">
          <div className="flex justify-between items-start border-b pb-6 mb-6">
            <div>
              <h1 className="text-2xl font-bold">{center?.name ?? "Training Center"}</h1>
              {center?.address && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{center.address}</p>}
              {center?.phone && <p className="text-sm text-muted-foreground">📞 {center.phone}</p>}
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Invoice</div>
              <div className="text-xl font-bold font-mono">{pay.invoice_no}</div>
              <div className="text-xs text-muted-foreground mt-1">{format(new Date(pay.paid_at), "PPP")}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Billed to</div>
              <div className="font-semibold">{enr?.students?.full_name}</div>
              {enr?.students?.phone && <div className="text-sm">{enr.students.phone}</div>}
              {enr?.students?.email && <div className="text-sm">{enr.students.email}</div>}
              {enr?.students?.nid && <div className="text-xs text-muted-foreground">NID: {enr.students.nid}</div>}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Course</div>
              <div className="font-semibold">{enr?.batches?.courses?.title}</div>
              <div className="text-sm">Batch: {enr?.batches?.name}</div>
              <div className="text-xs text-muted-foreground">Method: {METHOD_LABEL[pay.method] ?? pay.method}</div>
            </div>
          </div>

          <table className="w-full mb-6 border-t border-b">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Amount (৳)</th>
              </tr>
            </thead>
            <tbody className="border-t">
              <tr className="border-b">
                <td className="py-3">
                  Payment for {enr?.batches?.courses?.title} — {enr?.batches?.name}
                  {pay.notes && <div className="text-xs text-muted-foreground mt-0.5">{pay.notes}</div>}
                </td>
                <td className="py-3 text-right font-medium">{Number(pay.amount).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <Row label="This payment" value={`৳ ${Number(pay.amount).toLocaleString()}`} />
              <Row label="Course fee" value={`৳ ${fee.toLocaleString()}`} muted />
              <Row label="Total paid to date" value={`৳ ${totalPaid.toLocaleString()}`} muted />
              <Row label="Outstanding" value={`৳ ${due.toLocaleString()}`} bold />
            </div>
          </div>

          {allPays.length > 1 && (
            <div className="mt-8 pt-6 border-t">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">All payments for this enrollment</div>
              <div className="text-sm divide-y">
                {allPays.map((p: any) => (
                  <div key={p.id} className="py-2 flex justify-between">
                    <span className="font-mono text-xs">{p.invoice_no}</span>
                    <span className="text-muted-foreground">{format(new Date(p.paid_at), "PP")}</span>
                    <span>{METHOD_LABEL[p.method] ?? p.method}</span>
                    <span className="font-medium">৳ {Number(p.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 text-center text-xs text-muted-foreground">
            Thank you for your payment. This is a computer-generated invoice.
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted-foreground" : ""} ${bold ? "font-bold text-base border-t pt-2 mt-1" : ""}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
