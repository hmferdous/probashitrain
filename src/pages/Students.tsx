import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePlan } from "@/lib/plan";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Plus, Users, Mail, Phone, ChevronRight, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Student { id: string; full_name: string; phone: string | null; email: string | null; nid: string | null; address: string | null; guardian_number: string | null; }

export default function Students() {
  const { center } = useAuth();
  const { plan } = usePlan();
  const [students, setStudents] = useState<Student[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!center) return;
    const { data } = await supabase.from("students").select("*").eq("center_id", center.id).order("created_at", { ascending: false });
    setStudents(data ?? []);
  };
  useEffect(() => { load(); }, [center]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!center) return;
    if (plan.locked.inPersonAdmission) {
      toast.error("In-person admission requires Premium plan");
      return;
    }
    if (plan.limits.maxStudents !== null && students.length >= plan.limits.maxStudents) {
      toast.error(`Your ${plan.name} plan caps students at ${plan.limits.maxStudents}. Upgrade to add more.`);
      return;
    }
    const fd = new FormData(e.currentTarget);
    const phone = String(fd.get("phone") || "").trim() || null;
    if (phone) {
      const { count } = await supabase.from("students")
        .select("id", { count: "exact", head: true })
        .eq("center_id", center.id).eq("phone", phone);
      if (count && count > 0) { toast.error("A student with this phone number already exists in your center."); return; }
    }
    const { error } = await supabase.from("students").insert({
      center_id: center.id,
      full_name: String(fd.get("full_name") || "").trim(),
      phone,
      email: String(fd.get("email") || "").trim() || null,
      nid: String(fd.get("nid") || "").trim() || null,
      address: String(fd.get("address") || "").trim() || null,
      guardian_number: String(fd.get("guardian_number") || "").trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Student added");
    setOpen(false);
    load();
  };

  const filtered = students.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone ?? "").includes(search) ||
    (s.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader
          title="Students"
          description="All students across batches at your center."
          action={
            plan.locked.inPersonAdmission ? (
              <Link to="/app/plans">
                <Button variant="outline" className="gap-1.5">
                  <Lock className="h-4 w-4" /> In-person admission — Upgrade
                </Button>
              </Link>
            ) : (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add student</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New student (in-person admission)</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-3">
                    <div><Label>Full name *</Label><Input name="full_name" required maxLength={100} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Phone</Label><Input name="phone" maxLength={30} /></div>
                      <div><Label>NID</Label><Input name="nid" maxLength={30} /></div>
                    </div>
                    <div><Label>Email</Label><Input name="email" type="email" maxLength={255} /></div>
                    <div><Label>Guardian number</Label><Input name="guardian_number" maxLength={30} /></div>
                    <div><Label>Address</Label><Input name="address" maxLength={300} /></div>
                    <Button type="submit" className="w-full">Add student</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )
          }
        />
        {plan.limits.maxStudents !== null && (
          <Card className="p-3 mb-4 flex items-center justify-between bg-muted/30">
            <div className="text-sm">
              <span className="font-medium">{students.length}</span>
              <span className="text-muted-foreground"> / {plan.limits.maxStudents} students used on {plan.name}</span>
            </div>
            {students.length >= plan.limits.maxStudents && (
              <Link to="/app/plans" className="text-xs text-primary font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Upgrade for more
              </Link>
            )}
          </Card>
        )}
        <Input placeholder="Search by name, phone, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 max-w-md" />
        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{students.length === 0 ? "No students yet." : "No matches."}</p>
          </Card>
        ) : (
          <Card className="divide-y">
            {filtered.map((s) => (
              <Link
                key={s.id}
                to={`/app/students/${s.id}`}
                className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center font-semibold">
                    {s.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground flex gap-3 mt-0.5">
                      {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {s.phone}</span>}
                      {s.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {s.email}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.nid && <span className="text-xs text-muted-foreground font-mono">NID {s.nid}</span>}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
