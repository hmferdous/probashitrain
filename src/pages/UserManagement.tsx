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
import ListSkeleton from "@/components/ListSkeleton";

interface CenterUser {
  user_id: string;
  role: "center_admin" | "instructor";
  full_name: string;
  phone: string | null;
  branch_ids: string[];
}

interface Branch {
  id: string;
  name_en: string;
}

interface PendingInvite {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  branch_ids: string[];
  token: string;
  created_at: string;
}

const ROLE_CONFIG = {
  center_admin: {
    label: "Admin",
    color: "bg-primary/10 text-primary border-primary/20",
    icon: ShieldCheck,
    access: "Full access — Dashboard, Courses, Batches, Students, Applications, Attendance, Certificates, Payments, Live Classes, Branch & User Management",
  },
  instructor: {
    label: "Instructor",
    color: "bg-info/10 text-info border-info/20",
    icon: GraduationCap,
    access: "Limited access — Assigned Batches, Attendance marking, Live Classes, Student view (read-only)",
  },
};

// localStorage helpers — invites and branch assignments are demo-only
const LS_INVITES = (centerId: string) => `invites_${centerId}`;
const LS_BRANCHES = (centerId: string) => `user_branches_${centerId}`;

function getStoredInvites(centerId: string): PendingInvite[] {
  try { return JSON.parse(localStorage.getItem(LS_INVITES(centerId)) ?? "[]"); } catch { return []; }
}
function saveInvites(centerId: string, invites: PendingInvite[]) {
  localStorage.setItem(LS_INVITES(centerId), JSON.stringify(invites));
}
function getStoredBranches(centerId: string): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(LS_BRANCHES(centerId)) ?? "{}"); } catch { return {}; }
}
function saveBranches(centerId: string, map: Record<string, string[]>) {
  localStorage.setItem(LS_BRANCHES(centerId), JSON.stringify(map));
}

export default function UserManagement() {
  const { center, user: me } = useAuth();
  const [users, setUsers] = useState<CenterUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [openInvite, setOpenInvite] = useState(false);
  const [openBranches, setOpenBranches] = useState<CenterUser | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<"center_admin" | "instructor">("instructor");
  const [inviteBranches, setInviteBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!center) return;

    // Fetch user_roles + profiles in two steps (no direct FK between them)
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("center_id", center.id);

    const { data: branchData } = await supabase
      .from("branches")
      .select("id, name_en")
      .eq("center_id", center.id)
      .order("name_en");

    const branchMap = getStoredBranches(center.id);

    if (roles && roles.length > 0) {
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds);

      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

      setUsers(roles.map(r => ({
        user_id: r.user_id,
        role: r.role as "center_admin" | "instructor",
        full_name: profileMap[r.user_id]?.full_name ?? "Unknown",
        phone: profileMap[r.user_id]?.phone ?? null,
        branch_ids: branchMap[r.user_id] ?? [],
      })));
    } else {
      setUsers([]);
    }

    setBranches(branchData ?? []);
    setInvites(getStoredInvites(center.id));
    setLoading(false);
  };

  useEffect(() => { load(); }, [center]);

  const resetInviteForm = () => {
    setInviteName(""); setInviteEmail(""); setInvitePhone("");
    setInviteRole("instructor"); setInviteBranches([]);
  };

  const sendInvite = () => {
    if (!center || !inviteName.trim() || !inviteEmail.trim()) return;
    const newInvite: PendingInvite = {
      id: crypto.randomUUID(),
      name: inviteName.trim(),
      email: inviteEmail.trim().toLowerCase(),
      phone: invitePhone.trim(),
      role: inviteRole,
      branch_ids: inviteBranches,
      token: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    const updated = [newInvite, ...getStoredInvites(center.id)];
    saveInvites(center.id, updated);
    setInvites(updated);
    resetInviteForm();
    setOpenInvite(false);
    toast.success("Invite created — copy and share the link");
  };

  const revokeInvite = (id: string) => {
    if (!center) return;
    const updated = getStoredInvites(center.id).filter(i => i.id !== id);
    saveInvites(center.id, updated);
    setInvites(updated);
    toast.success("Invite removed");
  };

  const changeRole = async (userId: string, role: "center_admin" | "instructor") => {
    if (!center) return;
    const { error } = await supabase.from("user_roles").update({ role }).eq("user_id", userId).eq("center_id", center.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Role updated");
    load();
  };

  const toggleBranch = (cu: CenterUser, branchId: string) => {
    if (!center) return;
    const map = getStoredBranches(center.id);
    const current = map[cu.user_id] ?? [];
    const has = current.includes(branchId);
    map[cu.user_id] = has ? current.filter(b => b !== branchId) : [...current, branchId];
    saveBranches(center.id, map);
    // update local state immediately
    setOpenBranches(prev => prev ? { ...prev, branch_ids: map[cu.user_id] } : prev);
    setUsers(prev => prev.map(u => u.user_id === cu.user_id ? { ...u, branch_ids: map[cu.user_id] } : u));
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
            <Dialog open={openInvite} onOpenChange={(o) => { setOpenInvite(o); if (!o) resetInviteForm(); }}>
              <DialogTrigger asChild>
                <Button><UserPlus className="h-4 w-4 mr-2" /> Invite user</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Invite a user</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Full name <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="e.g. Md. Rahim Uddin"
                      value={inviteName}
                      onChange={e => setInviteName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Email address <span className="text-destructive">*</span></Label>
                    <Input
                      type="email"
                      placeholder="trainer@example.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Phone number <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input
                      type="tel"
                      placeholder="+880 1X XX XXX XXX"
                      value={invitePhone}
                      onChange={e => setInvitePhone(e.target.value)}
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
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {ROLE_CONFIG[inviteRole].access}
                    </p>
                  </div>
                  {branches.length > 0 && (
                    <div>
                      <Label>Branch access <span className="text-muted-foreground text-xs">(optional — leave blank for all branches)</span></Label>
                      <div className="mt-2 space-y-1.5">
                        {branches.map(b => {
                          const selected = inviteBranches.includes(b.id);
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setInviteBranches(prev =>
                                selected ? prev.filter(id => id !== b.id) : [...prev, b.id]
                              )}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                                selected ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted/50"
                              }`}
                            >
                              <span className="flex items-center gap-2"><GitBranch className="h-3.5 w-3.5" />{b.name_en}</span>
                              {selected && <Check className="h-4 w-4" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    An invite link will be generated. Share it with the person — they'll register and land directly in your center.
                  </p>
                  <Button className="w-full" onClick={sendInvite} disabled={!inviteName.trim() || !inviteEmail.trim()}>
                    Generate invite link
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          }
        />

        {/* Active users */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Active users ({users.length})
          </h2>
          {loading ? (
            <ListSkeleton />
          ) : (
          <Card className="divide-y">
            {users.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">No users found.</div>
            )}
            {users.map((cu) => {
              const cfg = ROLE_CONFIG[cu.role] ?? ROLE_CONFIG.instructor;
              const Icon = cfg.icon;
              const isMe = cu.user_id === me?.id;
              const branchNames = cu.branch_ids.map(bid => branches.find(b => b.id === bid)?.name_en).filter(Boolean);
              return (
                <div key={cu.user_id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0 text-sm">
                      {initials(cu.full_name)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        {cu.full_name}
                        {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{cu.phone ?? "—"}</div>
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
                    <Badge variant="outline" className={`gap-1 ${cfg.color}`}>
                      <Icon className="h-3 w-3" />{cfg.label}
                    </Badge>
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
          )}
        </div>

        {/* Pending invites */}
        {invites.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Pending invites ({invites.length})
            </h2>
            <Card className="divide-y">
              {invites.map((inv) => {
                const invBranchNames = (inv.branch_ids ?? []).map(bid => branches.find(b => b.id === bid)?.name_en).filter(Boolean);
                return (
                <div key={inv.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{inv.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{inv.email}{inv.phone ? ` · ${inv.phone}` : ""}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] ${ROLE_CONFIG[inv.role as keyof typeof ROLE_CONFIG]?.color ?? ""}`}>
                        {ROLE_CONFIG[inv.role as keyof typeof ROLE_CONFIG]?.label ?? inv.role}
                      </Badge>
                      {invBranchNames.length > 0
                        ? invBranchNames.map(n => (
                            <span key={n} className="inline-flex items-center gap-0.5 text-[10px] bg-muted px-1.5 py-0.5 rounded">
                              <GitBranch className="h-2.5 w-2.5" />{n}
                            </span>
                          ))
                        : <span className="text-[10px] text-muted-foreground">All branches</span>
                      }
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => copyLink(inv.token)}>
                      {copiedToken === inv.token
                        ? <><Check className="h-3.5 w-3.5 mr-1 text-success" /> Copied</>
                        : <><Copy className="h-3.5 w-3.5 mr-1" /> Copy link</>}
                    </Button>
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
              <DialogTitle>Branch access — {openBranches?.full_name}</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              Tick the branches this user can access. No selection means access to all branches.
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
                <p className="text-sm text-muted-foreground text-center py-4">No branches set up yet. Add branches first.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
