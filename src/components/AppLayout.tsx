import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, BookOpen, CalendarDays, Users, ClipboardCheck,
  Award, Video, LogOut, GraduationCap, Inbox, Wallet, Sparkles, Building2, Layers, UserCog
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlan } from "@/lib/plan";
import { Badge } from "@/components/ui/badge";

const navGroups: { label: string; items: { to: string; label: string; icon: any; end?: boolean }[] }[] = [
  {
    label: "Overview",
    items: [{ to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true }],
  },
  {
    label: "Institute Management",
    items: [
      { to: "/app/branches-management", label: "Branch Management", icon: Building2 },
      { to: "/app/users", label: "User Management", icon: UserCog },
    ],
  },
  {
    label: "Academics",
    items: [
      { to: "/app/trades", label: "Trades", icon: Layers },
      { to: "/app/courses", label: "Courses", icon: BookOpen },
      { to: "/app/batches", label: "Batches", icon: CalendarDays },
    ],
  },
  {
    label: "Admissions",
    items: [
      { to: "/app/applications", label: "Applications", icon: Inbox },
      { to: "/app/students", label: "Students", icon: Users },
    ],
  },
  {
    label: "Training",
    items: [
      { to: "/app/attendance", label: "Attendance", icon: ClipboardCheck },
      { to: "/app/live", label: "Live Classes", icon: Video },
      { to: "/app/certificates", label: "Certificates", icon: Award },
    ],
  },
  {
    label: "Billing",
    items: [
      { to: "/app/payments", label: "Payments", icon: Wallet },
      { to: "/app/plans", label: "Plans", icon: Sparkles },
    ],
  },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { profile, center, signOut } = useAuth();
  const { plan } = usePlan();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-gold flex items-center justify-center shadow-gold">
              <GraduationCap className="h-5 w-5 text-accent-foreground" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sidebar-foreground">Probashi Skills</div>
              <div className="text-[11px] text-sidebar-foreground/60 truncate max-w-[140px]">
                {center?.name ?? "Setup pending"}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-accent/50 text-accent">
              {plan.name} plan
            </Badge>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      )
                    }
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 mb-2">
            <div className="text-sm font-medium truncate">{profile?.full_name}</div>
            <div className="text-xs text-sidebar-foreground/60 truncate">{profile?.phone ?? ""}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
