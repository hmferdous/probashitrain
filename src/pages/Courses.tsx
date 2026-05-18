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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, BookOpen, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

interface Course {
  id: string; title: string; description: string | null;
  duration_hours: number; price: number | null; trade_id: string;
  trades?: { name: string };
}
interface Trade { id: string; name: string; }

export default function Courses() {
  const { center } = useAuth();
  const { plan } = usePlan();
  const [courses, setCourses] = useState<Course[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<string>("");

  const load = async () => {
    if (!center) return;
    const [c, t] = await Promise.all([
      supabase.from("courses").select("*, trades(name)").eq("center_id", center.id).order("created_at", { ascending: false }),
      supabase.from("trades").select("id, name").eq("center_id", center.id),
    ]);
    setCourses((c.data as any) ?? []);
    setTrades(t.data ?? []);
  };
  useEffect(() => { load(); }, [center]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!center) return;
    if (plan.limits.maxPublishedCourses !== null && courses.length >= plan.limits.maxPublishedCourses) {
      toast.error(`Your ${plan.name} plan allows up to ${plan.limits.maxPublishedCourses} courses. Upgrade to add more.`);
      return;
    }
    const fd = new FormData(e.currentTarget);
    if (!selectedTrade) { toast.error("Select a trade"); return; }
    const { error } = await supabase.from("courses").insert({
      center_id: center.id,
      trade_id: selectedTrade,
      title: String(fd.get("title") || "").trim(),
      description: String(fd.get("description") || "").trim() || null,
      duration_hours: Number(fd.get("duration_hours") || 40),
      price: Number(fd.get("price") || 0),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Course created");
    setOpen(false); setSelectedTrade("");
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader
          title="Courses"
          description="Specific training programs under each trade."
          action={
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button disabled={trades.length === 0}><Plus className="h-4 w-4 mr-2" /> Add course</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New course</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Trade *</Label>
                    <Select value={selectedTrade} onValueChange={setSelectedTrade}>
                      <SelectTrigger><SelectValue placeholder="Choose trade" /></SelectTrigger>
                      <SelectContent>
                        {trades.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input id="title" name="title" required maxLength={150} placeholder="Industrial Wiring Level 1" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" rows={3} maxLength={1000} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration_hours">Duration (hrs)</Label>
                      <Input id="duration_hours" name="duration_hours" type="number" defaultValue={40} min={1} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (BDT)</Label>
                      <Input id="price" name="price" type="number" defaultValue={0} min={0} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">Create course</Button>
                </form>
              </DialogContent>
            </Dialog>
          }
        />
        {trades.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Add a trade first, then create courses under it.</p>
          </Card>
        ) : courses.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No courses yet.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <Card key={c.id} className="p-5 hover:shadow-elegant transition-shadow group">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary">{c.trades?.name ?? "—"}</Badge>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)} className="opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <h3 className="font-semibold text-lg mb-1">{c.title}</h3>
                {c.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{c.description}</p>}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {c.duration_hours}h</span>
                  <span>৳ {Number(c.price ?? 0).toLocaleString()}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
