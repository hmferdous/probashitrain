import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Wallet, Plus, FileText, Search, Smartphone, Banknote } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PAYMENT_STATUS_CONFIG, type FeePaymentStatus } from "@/lib/statusColors";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";
import { friendlyError } from "@/lib/errors";

type Method = "cash" | "ami_probashi" | "bank" | "mobile_banking" | "other";
const METHOD_LABEL: Record<Method, string> = {
  cash: "Cash",
  ami_probashi: "Ami Probashi",
  bank: "Bank",
  mobile_banking: "Mobile Banking",
  other: "Other",
};

interface Row {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  student_phone: string | null;
  batch_id: string;
  batch_name: string;
  course_title: string;
  course_price: number;
  source: string;
  fee_collection: "ami_probashi" | "manual";
  paid: number;
  payments: any[];
}

const FEE_COLLECTION_LABEL: Record<"ami_probashi" | "manual", string> = {
  ami_probashi: "Ami Probashi",
  manual: "Manual",
};

export default function Payments() {
  const { center } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "ami_probashi" | "manual">("all");
  const [openPay, setOpenPay] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!center) return;
    const { data: enrolls } = await supabase
      .from("enrollments")
      .select("id, source, batch_id, students(id, full_name, phone), batches!inner(id, name, center_id, fee_collection, courses(title, price))")
      .eq("batches.center_id", center.id)
      .order("applied_at", { ascending: false });
    const filtered = enrolls ?? [];
    const ids = filtered.map((e: any) => e.id);
    const { data: pays } = ids.length
      ? await (supabase.from as any)("payments").select("*").in("enrollment_id", ids)
      : { data: [] as any[] };
    const byEnr: Record<string, any[]> = {};
    (pays ?? []).forEach((p: any) => {
      (byEnr[p.enrollment_id] ||= []).push(p);
    });
    const built: Row[] = filtered.map((e: any) => ({
      enrollment_id: e.id,
      student_id: e.students.id,
      student_name: e.students.full_name,
      student_phone: e.students.phone,
      batch_id: e.batch_id,
      batch_name: e.batches?.name ?? "—",
      course_title: e.batches?.courses?.title ?? "—",
      course_price: Number(e.batches?.courses?.price ?? 0),
      source: e.source,
      fee_collection: (e.batches?.fee_collection ?? "manual") as "ami_probashi" | "manual",
      paid: (byEnr[e.id] ?? []).reduce((s, p) => s + Number(p.amount), 0),
      payments: byEnr[e.id] ?? [],
    }));
    setRows(built);
    setLoading(false);
  };
  useEffect(() => { load(); }, [center]);

  const filtered = useMemo(
    () =>
      rows
        .filter((r) => sourceFilter === "all" || r.fee_collection === sourceFilter)
        .filter(
          (r) =>
            r.student_name.toLowerCase().includes(search.toLowerCase()) ||
            (r.student_phone ?? "").includes(search) ||
            r.batch_name.toLowerCase().includes(search.toLowerCase()) ||
            r.course_title.toLowerCase().includes(search.toLowerCase())
        ),
    [rows, search, sourceFilter]
  );

  const totals = useMemo(() => {
    const expected = rows.reduce((s, r) => s + r.course_price, 0);
    const collected = rows.reduce((s, r) => s + r.paid, 0);
    return { expected, collected, due: expected - collected };
  }, [rows]);

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader
          title="Payment Report"
          description="Track course fees per student. Record cash entries and view Ami Probashi payments."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SummaryCard label="Expected fees" value={totals.expected} icon={<Wallet className="h-5 w-5" />} />
          <SummaryCard label="Collected" value={totals.collected} icon={<Banknote className="h-5 w-5 text-success" />} />
          <SummaryCard label="Outstanding" value={totals.due} icon={<Wallet className="h-5 w-5 text-warning" />} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative max-w-md flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search student, batch, course…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Fee source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="ami_probashi">Ami Probashi</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <ListSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={rows.length === 0 ? Wallet : Search}
            message={rows.length === 0 ? "No enrolled students yet." : "No matches for your search."}
          />
        ) : (
          <Card className="divide-y">
            {filtered.map((r) => {
              const due = r.course_price - r.paid;
              const status: FeePaymentStatus =
                r.paid === 0 ? "Unpaid" : due <= 0 ? "Paid" : "Partial";
              return (
                <div key={r.enrollment_id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{r.student_name}</span>
                      {r.source === "ami_probashi" && (
                        <Badge variant="outline" className="text-[10px]"><Smartphone className="h-3 w-3 mr-1" />App</Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">{FEE_COLLECTION_LABEL[r.fee_collection]}</Badge>
                      <StatusBadge status={PAYMENT_STATUS_CONFIG[status]} className="text-[10px]" />
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.course_title} — {r.batch_name} {r.student_phone ? `· ${r.student_phone}` : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold">৳ {r.paid.toLocaleString()} <span className="text-muted-foreground font-normal">/ ৳ {r.course_price.toLocaleString()}</span></div>
                    {due > 0 && <div className="text-xs text-warning">Due ৳ {due.toLocaleString()}</div>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {r.payments.length > 0 && (
                      <Link to={`/app/payments/${r.payments[0].id}`}>
                        <Button size="sm" variant="outline"><FileText className="h-4 w-4 mr-1" /> Invoices</Button>
                      </Link>
                    )}
                    <Button size="sm" onClick={() => setOpenPay(r)}>
                      <Plus className="h-4 w-4 mr-1" /> Record
                    </Button>
                  </div>
                </div>
              );
            })}
          </Card>
        )}

        <RecordPaymentDialog
          row={openPay}
          centerId={center?.id ?? ""}
          onClose={() => setOpenPay(null)}
          onSaved={() => { setOpenPay(null); load(); }}
        />
      </div>
    </AppLayout>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="text-2xl font-bold mt-1">৳ {value.toLocaleString()}</div>
        </div>
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">{icon}</div>
      </div>
    </Card>
  );
}

function RecordPaymentDialog({
  row, centerId, onClose, onSaved,
}: { row: Row | null; centerId: string; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [method, setMethod] = useState<Method>("cash");
  const navigate = useNavigate();
  if (!row) return null;
  const due = Math.max(0, row.course_price - row.paid);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get("amount") || 0);
    if (amount <= 0) { toast.error("Amount must be greater than 0"); return; }
    const notes = String(fd.get("notes") || "").trim() || null;
    setSaving(true);
    const { data: invData } = await (supabase.rpc as any)("generate_invoice_no");
    const invoice_no = invData ?? `INV-${Date.now()}`;
    const { data: pay, error } = await (supabase.from as any)("payments").insert({
      enrollment_id: row.enrollment_id,
      center_id: centerId,
      amount,
      method,
      notes,
      invoice_no,
    }).select().single();
    setSaving(false);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success(`Payment recorded · Invoice ${invoice_no}`);
    onSaved();
    if (pay?.id && (method === "cash" || method === "bank" || method === "mobile_banking" || method === "other")) {
      navigate(`/app/payments/${pay.id}`);
    }
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment — {row.student_name}</DialogTitle>
        </DialogHeader>
        <div className="text-xs text-muted-foreground mb-2">
          {row.course_title} — {row.batch_name} · Course fee ৳ {row.course_price.toLocaleString()} · Outstanding ৳ {due.toLocaleString()}
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Amount (৳) *</Label>
            <Input name="amount" type="number" min={1} step="1" defaultValue={due || ""} required />
          </div>
          <div>
            <Label>Method *</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(METHOD_LABEL) as Method[]).map((m) => (
                  <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea name="notes" rows={2} maxLength={300} placeholder="Receipt #, reference, etc." />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving…" : "Record & generate invoice"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
