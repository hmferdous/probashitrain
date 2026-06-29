import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  GraduationCap, Layers, Users, ClipboardCheck, Award, Video,
  Smartphone, ArrowRight, CheckCircle2
} from "lucide-react";

const features = [
  { icon: Layers, title: "Trades → Courses → Batches", desc: "Organize your training catalog with a clean three-level hierarchy." },
  { icon: Smartphone, title: "Ami Probashi integration", desc: "Publish batches to the mobile app and receive applications instantly." },
  { icon: Users, title: "Student pipeline", desc: "Applied → Shortlisted → Training → Completed → Certificate, end-to-end." },
  { icon: ClipboardCheck, title: "Attendance tracking", desc: "Daily attendance per batch with present/absent/late marking." },
  { icon: Award, title: "Performance & certificates", desc: "Score students and issue downloadable certificates on completion." },
  { icon: Video, title: "Live classes", desc: "Instructors host live sessions with one-click join links." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="absolute top-0 inset-x-0 z-10">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary-foreground">
            <div className="h-9 w-9 rounded-lg bg-gradient-gold flex items-center justify-center shadow-gold">
              <GraduationCap className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="font-bold text-lg">Probashi Skills</span>
          </div>
          <Button asChild variant="secondary">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-hero text-primary-foreground pt-32 pb-24">
        <div className="container mx-auto px-6 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-sm mb-6 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            Built for Bangladesh's training centers
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Run your training center.<br />
            <span className="text-accent-glow">Reach every aspiring migrant.</span>
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/85 mb-8 max-w-2xl mx-auto">
            The all-in-one B2B SaaS to publish courses to the Ami Probashi app, manage admissions,
            track attendance, run live classes, and issue certificates — all in one place.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button asChild size="lg" className="bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold">
              <Link to="/auth">Get started free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10">
              <a href="#features">See features</a>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 mt-10 text-sm text-primary-foreground/70 flex-wrap">
            {["No setup fees", "Unlimited batches", "Live classes built-in"].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-accent" /> {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need, nothing you don't</h2>
          <p className="text-muted-foreground text-lg">From first application to final certificate.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="p-6 hover:shadow-elegant transition-shadow">
              <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-6 text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to digitize your training center?</h2>
          <p className="text-muted-foreground mb-8">Get up and running in under 5 minutes.</p>
          <Button asChild size="lg" className="bg-gradient-primary shadow-glow">
            <Link to="/auth">Create your center <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © 2026 Probashi Skills · Empowering Bangladesh's workforce ·{" "}
        <Link to="/resources" className="hover:underline text-primary">Resources</Link>
      </footer>
    </div>
  );
}
