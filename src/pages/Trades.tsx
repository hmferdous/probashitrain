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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Plus, Layers, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Trade { id: string; name: string; code: string | null; description: string | null; created_at: string; }

export default function Trades() {
  const { center } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!center) return;
    const { data } = await supabase.from("trades").select("*").eq("center_id", center.id).order("created_at", { ascending: false });
    setTrades(data ?? []);
  };
  useEffect(() => { load(); }, [center]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!center) return;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    if (!name) return;
    const { error } = await supabase.from("trades").insert({
      center_id: center.id,
      name,
      code: String(fd.get("code") || "").trim() || null,
      description: String(fd.get("description") || "").trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Trade added");
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this trade and all its courses?")) return;
    const { error } = await supabase.from("trades").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    load();
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader
          title="Trades"
          description="High-level skill categories like Plumbing, Electrical, Caregiving."
          action={
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add trade</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New trade</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" name="name" required maxLength={100} placeholder="Electrical" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Code</Label>
                    <Input id="code" name="code" maxLength={20} placeholder="ELEC" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" rows={3} maxLength={500} />
                  </div>
                  <Button type="submit" className="w-full">Create trade</Button>
                </form>
              </DialogContent>
            </Dialog>
          }
        />
        {trades.length === 0 ? (
          <Card className="p-12 text-center">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No trades yet. Create your first one to start adding courses.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trades.map((t) => (
              <Card key={t.id} className="p-5 hover:shadow-elegant transition-shadow group">
                <div className="flex items-start justify-between mb-2">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Layers className="h-5 w-5" />
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)} className="opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <h3 className="font-semibold text-lg">{t.name}</h3>
                {t.code && <p className="text-xs text-muted-foreground font-mono">{t.code}</p>}
                {t.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{t.description}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
