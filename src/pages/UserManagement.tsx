import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  UserPlus, Copy, Check, Trash2, GitBranch, ShieldCheck, GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

interface CenterUser {
  user_id: string;
  role: "center_admin" | "instructor";
  profiles: { full_name: string; phone: string | null; avatar_url: string | null } | null;
  branch_ids: string[];
}

interface Branch {
  id: string;
  name_en: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  created_at: string;
  expires_at: string;
}

const ROLE_CONFIG = {
  center_admin: { label: "Admin",      color: "bg-primary/10 text-primary border-primary/20",    icon: ShieldCheck },
  instructor:   { label: "Instructor", color: "bg-info/10 text-info border-info/20",              icon: GraduationCap },
};

export default function UserManagement() {
  const { center, user: me } = useAuth();
  const [users, setUsers] = useState<CenterUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [openInvite, setOpenInvite] = useState(false);
  const [openBranches, setOpenBranches] = useState<CenterUser | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"center_admin" | "instructor">("instructor");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!center) return;

    const [{ data: roles }, { data: branchData }, { data: ub }, { data: inv }] = await Promise.all([
      supabase.from("user_roles").select("user_id, role, profiles(full_name, phone, avatar_url)").eq("center_id", center.id),
      supabase.from("branches").select("id, name_en").eq("center_id", center.id).order("name_en"),
      supabase.from("user_branches" as any).select("user_id, branch_id").eq("center_id", center.id),
      supabase.from("pending_invites" as any).select("*").eq("center_id", center.id).order("created_at", { ascending: false }),
    ]);

    const branchMap: Record<string, string[]> = {};
    ((ub ?? []) as any[]).forEach((r: any) => {
      branchMap[r.user_id] = [...(branchMap[r.user_id] ?? []), r.branch_id];
    });

    setUsers(((roles ?? []) as any[]).map((r: any) => ({
      user_id: r.user_id,
      role: r.role,
      profiles: r.profiles,
      branch_ids: branchMap[r.user_id] ?? [],
    })));
    setBranches(branchData ?? []);
    setInvites((inv ?? []) as any[]);
  };

  useEffect(() => { load(); }, [center]);

  const sendInvite = async () => {
    if (!center || !me || !inviteEmail.trim()) return;
    setSaving(true);
    const { error } = await (supabase.from("pending_invites" as any) as any).insert({
      center_id: center.id,
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      created_by: me.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Invite created — copy and share the link");
    setInviteEmail("");
    setOpenInvite(false);
    load();
  };

  const revokeInvite = async (id: string) => {
    await (supabase.from("pending_invites" as any) as any).delete().eq("id", id);
    toast.success("Invite revoked");
    load();
  };

  const changeRole = async (userId: string, role: "center_admin" | "instructor") => {
    if (!center) return;
    const { error } = await supabase.from("user_roles").update({ role }).eq("user_id", userId).eq("center_id", center.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Role updated");
    load();
  };

  const toggleBranch = async (cu: CenterUser, branchId: string) => {
    if (!center) return;
    const has = cu.branch_ids.includes(branchId);
    if (has) {
      await (supabase.from("user_branches" as any) as any).delete().eq("user_id", cu.user_id).eq("branch_id", branchId);
    } else {
      await (supabase.from("user_branches" as any) as any).insert({ user_id: cu.user_id, center_id: center.id, branch_id: branchId });
    }
    load();
    setOpenBranches((prev) => prev ? { ...prev, branch_ids: has ? prev.branch_ids.filter(b => b !== branchId) : [...prev.branch_ids, branchId] } : prev);
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/auth?invite=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast.success("Invite link copied");
  };

  const initials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <PageHeader
          title="User Management"
          description="Manage who has access to this portal and their branch assignments."
          action={
            <Dialog open={openInvite} onOpenChange={setOpenInvite}>
              <DialogTrigger asChild>
                <Button><UserPlus className="h-4 w-4 mr-2" /> Invite user</Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Invite a user</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Email address</Label>
                    <Input
                      type="email"
                      placeholder="trainer@example.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instructor">Instructor</SelectItem>
                        <SelectItem value="center_admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    An invite link will be generated. Share it with the person — they'll register and land directly in your center.
                  </p>
                  <Button className="w-full" onClick={sendInvite} disabled={saving || !inviteEmail.trim()}>
                    Generate invite link
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          }
        />

        {/* Active users */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Active users ({users.length})</h2>
          <Card className="divide-y">
            {users.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">No users found.</div>
            )}
            {users.map((cu) => {
              const cfg = ROLE_CONFIG[cu.role];
              const Icon = cfg.icon;
              const isMe = cu.user_id === me?.id;
              const branchNames = cu.branch_ids.map(bid => branches.find(b => b.id === bid)?.name_en).filter(Boolean);
              return (
                <div key={cu.user_id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0 text-sm">
                      {cu.profiles?.full_name ? initials(cu.profiles.full_name) : "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        {cu.profiles?.full_name ?? "Unknown"}
                        {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{cu.profiles?.phone ?? "—"}</div>
                      {branchNames.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {branchNames.map(n => (
                            <span key={n} className="inline-flex items-center gap-0.5 text-[10px] bg-muted px-1.5 py-0.5 rounded">
                              <GitBranch className="h-2.5 w-2.5" />{n}
                            </span>
                          ))}
                        </div>
                      )}
                      {cu.role === "instructor" && branchNames.length === 0 && branches.length > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">All branches (no restriction)</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}>
                      <Icon className="h-3 w-3" />{cfg.label}
                    </span>
                    {!isMe && (
                      <>
                        {branches.length > 0 && (
                          <Button size="sm" variant="outline" onClick={() => setOpenBranches(cu)}>
                            <GitBranch className="h-3.5 w-3.5 mr-1" /> Branches
                          </Button>
                        )}
                        <Select value={cu.role} onValueChange={(v) => changeRole(cu.user_id, v as any)}>
                          <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="instructor">Instructor</SelectItem>
                            <SelectItem value="center_admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        {/* Pending invites */}
        {invites.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pending invites ({invites.length})</h2>
            <Card className="divide-y">
              {invites.map((inv) => {
                const expired = new Date(inv.expires_at) < new Date();
                return (
                  <div key={inv.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{inv.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {ROLE_CONFIG[inv.role as keyof typeof ROLE_CONFIG]?.label ?? inv.role} ·{" "}
                        {expired ? <span className="text-destructive">Expired</span> : `Expires ${new Date(inv.expires_at).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!expired && (
                        <Button size="sm" variant="outline" onClick={() => copyLink(inv.token)}>
                          {copiedToken === inv.token
                            ? <><Check className="h-3.5 w-3.5 mr-1 text-success" /> Copied</>
                            : <><Copy className="h-3.5 w-3.5 mr-1" /> Copy link</>}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => revokeInvite(inv.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {/* Branch assignment dialog */}
        <Dialog open={!!openBranches} onOpenChange={(o) => !o && setOpenBranches(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Branch access — {openBranches?.profiles?.full_name}</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              Assign branches this user can access. No selection means access to all branches.
            </p>
            <div className="space-y-2 pt-2">
              {branches.map(b => {
                const assigned = openBranches?.branch_ids.includes(b.id) ?? false;
                return (
                  <button
                    key={b.id}
                    onClick={() => openBranches && toggleBranch(openBranches, b.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                      assigned ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <span className="flex items-center gap-2"><GitBranch className="h-3.5 w-3.5" />{b.name_en}</span>
                    {assigned && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
              {branches.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No branches set up yet.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
