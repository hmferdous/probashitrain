import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePlan } from "@/lib/plan";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import LockedOverlay from "@/components/LockedOverlay";
import { Card } from "@/components/ui/card";
import { BookOpen, CalendarDays, Users, Award, Inbox, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from "recharts";
import { format, startOfMonth, subMonths } from "date-fns";

interface Stats {
  courses: number; batches: number;
  students: number; applied: number; certified: number;
}

interface TrendPoint { month: string; students: number; certified: number }
interface NamedValue { name: string; value: number }

const SOURCE_LABEL: Record<string, string> = { ami_probashi: "Ami Probashi", manual: "Manual entry" };

export default function Dashboard() {
  const { center, profile } = useAuth();
  const { plan } = usePlan();
  const [stats, setStats] = useState<Stats>({ courses: 0, batches: 0, students: 0, applied: 0, certified: 0 });
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [sourceMix, setSourceMix] = useState<NamedValue[]>([]);

  useEffect(() => {
    if (!center) return;
    (async () => {
      const [c, b, s, a, cert] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("center_id", center.id),
        supabase.from("batches").select("id", { count: "exact", head: true }).eq("center_id", center.id),
        supabase.from("students").select("id", { count: "exact", head: true }).eq("center_id", center.id),
        supabase.from("enrollments").select("id, batches!inner(center_id)", { count: "exact", head: true }).eq("pipeline_status", "applied").eq("batches.center_id", center.id),
        supabase.from("enrollments").select("id, batches!inner(center_id)", { count: "exact", head: true }).eq("pipeline_status", "certified").eq("batches.center_id", center.id),
      ]);
      setStats({
        courses: c.count ?? 0, batches: b.count ?? 0,
        students: s.count ?? 0, applied: a.count ?? 0, certified: cert.count ?? 0,
      });

      const { data: enrolls } = await supabase
        .from("enrollments")
        .select("applied_at, certificate_issued_at, source, batches!inner(center_id)")
        .eq("batches.center_id", center.id);
      const rows = enrolls ?? [];

      const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(), 5 - i)));
      const trendData: TrendPoint[] = months.map((m) => {
        const label = format(m, "MMM");
        const next = startOfMonth(subMonths(m, -1));
        const inMonth = (d: string | null) => d && new Date(d) >= m && new Date(d) < next;
        return {
          month: label,
          students: rows.filter((r: any) => inMonth(r.applied_at)).length,
          certified: rows.filter((r: any) => inMonth(r.certificate_issued_at)).length,
        };
      });
      setTrend(trendData);

      const sourceCounts: Record<string, number> = {};
      rows.forEach((r: any) => {
        const label = SOURCE_LABEL[r.source] ?? r.source;
        sourceCounts[label] = (sourceCounts[label] ?? 0) + 1;
      });
      setSourceMix(Object.entries(sourceCounts).map(([name, value]) => ({ name, value })));
    })();
  }, [center]);

  const cards = [
    { label: "Courses", value: stats.courses, icon: BookOpen, to: "/app/courses", color: "bg-primary/10 text-primary" },
    { label: "Batches", value: stats.batches, icon: CalendarDays, to: "/app/batches", color: "bg-accent/15 text-accent-foreground" },
    { label: "Students", value: stats.students, icon: Users, to: "/app/students", color: "bg-success/10 text-success" },
    { label: "New applications", value: stats.applied, icon: Inbox, to: "/app/applications", color: "bg-warning/15 text-warning" },
    { label: "Certificates issued", value: stats.certified, icon: Award, to: "/app/certificates", color: "bg-accent/15 text-accent" },
  ];

  const chartEmptyState = (
    <div className="h-[260px] flex flex-col items-center justify-center text-center text-muted-foreground">
      <p className="text-sm font-medium">No data yet</p>
      <p className="text-xs mt-1">This fills in once you have enrollments.</p>
    </div>
  );

  const hasTrendData = trend.some((p) => p.students > 0 || p.certified > 0);

  const trendChart = (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Enrollment & Certification Trend</h3>
          <p className="text-xs text-muted-foreground">Monthly intake vs certified students</p>
        </div>
      </div>
      {hasTrendData ? (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="students" name="Enrolled" stroke="hsl(var(--primary))" strokeWidth={2} />
            <Line type="monotone" dataKey="certified" name="Certified" stroke="hsl(var(--accent))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      ) : chartEmptyState}
    </Card>
  );

  const sourceChart = (
    <Card className="p-6">
      <h3 className="font-semibold mb-1">Admission Source Mix</h3>
      <p className="text-xs text-muted-foreground mb-4">Where your students come from</p>
      {sourceMix.length > 0 ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={sourceMix}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : chartEmptyState}
    </Card>
  );

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <PageHeader
          title={`Welcome back, ${profile?.full_name?.split(" ")[0] ?? ""}`}
          description={center?.name}
        />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {cards.map((c) => (
            <Link key={c.label} to={c.to}>
              <Card className="p-6 hover:shadow-elegant transition-all hover:-translate-y-0.5">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}>
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="text-3xl font-bold">{c.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {plan.locked.advancedCharts ? (
            <LockedOverlay
              title="Advanced analytics"
              description="Enrollment trends and source mix unlock on Premium."
              requiredPlan="Premium"
            >
              {trendChart}
            </LockedOverlay>
          ) : trendChart}

          {plan.locked.advancedCharts ? (
            <LockedOverlay
              title="Admission insights"
              description="See where your students come from — Ami Probashi, walk-in, referrals — on Premium."
              requiredPlan="Premium"
            >
              {sourceChart}
            </LockedOverlay>
          ) : sourceChart}
        </div>

        <Card className="p-8 bg-gradient-primary text-primary-foreground">
          <h3 className="text-xl font-semibold mb-2">Get started</h3>
          <p className="text-primary-foreground/80 mb-4 text-sm">
            Create a course, then publish a training batch to the Ami Probashi app.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Link to="/app/courses" className="px-4 py-2 rounded-lg bg-primary-foreground text-primary text-sm font-medium hover:opacity-90">
              + Add a course
            </Link>
            <Link to="/app/batches" className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90">
              + Publish a batch
            </Link>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
