import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Building2, MapPin, Phone, Mail, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

interface Branch {
  id: string;
  name_en: string; name_bn: string;
  address_en: string; address_bn: string;
  map_link: string | null;
  phone: string; email: string;
}

const schema = z.object({
  name_en: z.string().trim().min(1, "English name required").max(120),
  name_bn: z.string().trim().min(1, "Bangla name required").max(120),
  address_en: z.string().trim().min(1, "English address required").max(300),
  address_bn: z.string().trim().min(1, "Bangla address required").max(300),
  map_link: z.string().trim().max(500).optional().or(z.literal("")),
  phone: z.string().trim().min(1, "Phone required").max(30),
  email: z.string().trim().email("Valid email required").max(120),
});

export default function Branches() {
  const { center } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);

  const load = async () => {
    if (!center) return;
    const { data } = await supabase
      .from("branches")
      .select("*")
      .eq("center_id", center.id)
      .order("created_at", { ascending: false });
    setBranches((data as any) ?? []);
  };

  useEffect(() => { load(); }, [center]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!center) return;
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name_en: fd.get("name_en"),
      name_bn: fd.get("name_bn"),
      address_en: fd.get("address_en"),
      address_bn: fd.get("address_bn"),
      map_link: fd.get("map_link") || "",
      phone: fd.get("phone"),
      email: fd.get("email"),
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    const payload = {
      ...parsed.data,
      map_link: parsed.data.map_link || null,
      center_id: center.id,
    };
    const { error } = editing
      ? await supabase.from("branches").update(payload).eq("id", editing.id)
      : await supabase.from("branches").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Branch updated" : "Branch created");
    setOpen(false); setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this branch?")) return;
    const { error } = await supabase.from("branches").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Branch deleted");
    load();
  };

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (b: Branch) => { setEditing(b); setOpen(true); };

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader
          title="Branch Management"
          description="Manage all physical branches of your institute. Branches are selectable when creating training sessions."
          action={
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New branch</Button>
          }
        />

        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit branch" : "New branch"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name_en">Branch name (English) *</Label>
                  <Input id="name_en" name="name_en" defaultValue={editing?.name_en} required maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_bn">শাখার নাম (বাংলা) *</Label>
                  <Input id="name_bn" name="name_bn" defaultValue={editing?.name_bn} required maxLength={120} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address_en">Address (English) *</Label>
                  <Textarea id="address_en" name="address_en" defaultValue={editing?.address_en} required maxLength={300} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_bn">ঠিকানা (বাংলা) *</Label>
                  <Textarea id="address_bn" name="address_bn" defaultValue={editing?.address_bn} required maxLength={300} rows={2} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="map_link">Google Map Link (optional)</Label>
                <Input id="map_link" name="map_link" defaultValue={editing?.map_link ?? ""} placeholder="https://maps.google.com/..." maxLength={500} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Branch phone *</Label>
                  <Input id="phone" name="phone" defaultValue={editing?.phone} required maxLength={30} placeholder="+880 1XXX-XXXXXX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Branch email *</Label>
                  <Input id="email" name="email" type="email" defaultValue={editing?.email} required maxLength={120} placeholder="branch@institute.com" />
                </div>
              </div>
              <Button type="submit" className="w-full">{editing ? "Save changes" : "Create branch"}</Button>
            </form>
          </DialogContent>
        </Dialog>

        {branches.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No branches yet. Create your first branch to get started.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {branches.map((b) => (
              <Card key={b.id} className="p-5 hover:shadow-elegant transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-lg truncate">{b.name_en}</h3>
                    <p className="text-sm text-muted-foreground truncate">{b.name_bn}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div>{b.address_en}</div>
                      <div className="text-xs">{b.address_bn}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" /> {b.phone}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" /> {b.email}
                  </div>
                  {b.map_link && (
                    <a href={b.map_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> View on map
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
