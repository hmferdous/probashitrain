import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { friendlyError } from "@/lib/errors";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
});

export default function Onboarding() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: fd.get("name"),
      phone: fd.get("phone") || undefined,
      address: fd.get("address") || undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLoading(true);
    const { error } = await supabase.rpc("create_training_center", {
      _name: parsed.data.name,
      _phone: parsed.data.phone ?? "",
      _address: parsed.data.address ?? "",
    });
    if (error) { setLoading(false); toast.error(friendlyError(error)); return; }
    await refresh();
    setLoading(false);
    toast.success("Training center created!");
    navigate("/app");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-6">
      <Card className="w-full max-w-lg p-8 shadow-elegant">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Set up your training center</h1>
            <p className="text-sm text-muted-foreground">One-time setup. You'll be the admin.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Center name *</Label>
            <Input id="name" name="name" required placeholder="Dhaka Skills Institute" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" placeholder="+880 1XXX-XXXXXX" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" rows={3} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create center & continue
          </Button>
        </form>
      </Card>
    </div>
  );
}
