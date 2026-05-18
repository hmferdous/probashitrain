import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePlan } from "@/lib/plan";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import LockedOverlay from "@/components/LockedOverlay";
import { Card } from "@/components/ui/card";
import { Layers, BookOpen, CalendarDays, Users, Award, Inbox, TrendingUp, PieChart as PieIcon } from "lucide-react";
import { Link } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from "recharts";

interface Stats {
  trades: number; courses: number; batches: number;
  students: number; applied: number; certified: number;
}

const enrollmentTrend = [
  { month: "Jan", students: 12, certified: 4 },
  { month: "Feb", students: 18, certified: 7 },
  { month: "Mar", students: 24, certified: 10 },
  { month: "Apr", students: 31, certified: 14 },
  { month: "May", students: 28, certified: 18 },
  { month: "Jun", students: 42, certified: 22 },
];

const tradeBreakdown = [
  { name: "Electrical", value: 32 },
  { name: "Plumbing", value: 24 },
  { name: "Welding", value: 18 },
  { name: "Garments", value: 14 },
  { name: "Driving", value: 12 },
];

const sourceMix = [
  { name: "Ami Probashi", value: 64 },
  { name: "Walk-in", value: 22 },
  { name: "Referral", value: 14 },
];

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--info))", "hsl(var(--warning))"];

export default function Dashboard() {
  const { center, profile } = useAuth();
  const { plan } = usePlan();
  const [stats, setStats] = useState<Stats>({ trades: 0, courses: 0, batches: 0, students: 0, applied: 0, certified: 0 });

  useEffect(() => {
    if (!center) return;
    (async () => {
      const [t, c, b, s, a, cert] = await Promise.all([
        supabase.from("trades").select("id", { count: "exact", head: true }).eq("center_id", center.id),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("center_id", center.id),
        supabase.from("batches").select("id", { count: "exact", head: true }).eq("center_id", center.id),
        supabase.from("students").select("id", { count: "exact", head: true }).eq("center_id", center.id),
        supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("pipeline_status", "applied"),
        supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("pipeline_status", "certified"),
      ]);
      setStats({
        trades: t.count ?? 0, courses: c.count ?? 0, batches: b.count ?? 0,
        students: s.count ?? 0, applied: a.count ?? 0, certified: cert.count ?? 0,
      });
    })();
  }, [center]);

  const cards = [
    { label: "Trades", value: stats.trades, icon: Layers, to: "/app/trades", color: "bg-info/10 text-info" },
    { label: "Courses", value: stats.courses, icon: BookOpen, to: "/app/courses", color: "bg-primary/10 text-primary" },
    { label: "Batches", value: stats.batches, icon: CalendarDays, to: "/app/batches", color: "bg-accent/15 text-accent-foreground" },
    { label: "Students", value: stats.students, icon: Users, to: "/app/students", color: "bg-success/10 text-success" },
    { label: "New applications", value: stats.applied, icon: Inbox, to: "/app/applications", color: "bg-warning/15 text-warning" },
    { label: "Certificates issued", value: stats.certified, icon: Award, to: "/app/certificates", color: "bg-accent/15 text-accent" },
  ];

  const trendChart = (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Enrollment & Certification Trend</h3>
          <p className="text-xs text-muted-foreground">Monthly intake vs certified students</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={enrollmentTrend}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="students" stroke="hsl(var(--primary))" strokeWidth={2} />
          <Line type="monotone" dataKey="certified" stroke="hsl(var(--accent))" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );

  const tradeChart = (
    <Card className="p-6">
      <h3 className="font-semibold mb-1 flex items-center gap-2"><PieIcon className="h-4 w-4 text-accent" /> Students by Trade</h3>
      <p className="text-xs text-muted-foreground mb-4">Distribution across active programs</p>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={tradeBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
            {tradeBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );

  const sourceChart = (
    <Card className="p-6">
      <h3 className="font-semibold mb-1">Admission Source Mix</h3>
      <p className="text-xs text-muted-foreground mb-4">Where your students come from</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={sourceMix}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
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
              description="Enrollment trends, trade breakdowns, and source mix unlock on Premium."
              requiredPlan="Premium"
            >
              {trendChart}
            </LockedOverlay>
          ) : trendChart}

          {plan.locked.advancedCharts ? (
            <LockedOverlay
              title="Trade distribution"
              description="Visualize how students split across your trades on Premium."
              requiredPlan="Premium"
            >
              {tradeChart}
            </LockedOverlay>
          ) : tradeChart}
        </div>

        {plan.locked.advancedCharts ? (
          <LockedOverlay
            title="Admission insights"
            description="See where your students come from — Ami Probashi, walk-in, referrals — on Premium."
            requiredPlan="Premium"
          >
            {sourceChart}
          </LockedOverlay>
        ) : sourceChart}

        <Card className="p-8 bg-gradient-primary text-primary-foreground">
          <h3 className="text-xl font-semibold mb-2">Get started</h3>
          <p className="text-primary-foreground/80 mb-4 text-sm">
            Create a trade, add courses, then publish your first training batch to the Ami Probashi app.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Link to="/app/trades" className="px-4 py-2 rounded-lg bg-primary-foreground text-primary text-sm font-medium hover:opacity-90">
              + Add a trade
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
