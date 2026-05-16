import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowRight } from "lucide-react";
import { SEO_PAGES } from "./seoPagesData";

const SITE = "https://probashitrain.lovable.app";

export default function SeoHub() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Training Center Resources — Probashi Skills</title>
        <meta
          name="description"
          content="Guides for Bangladesh training centers: vocational training, BMET, Ami Probashi integration, skill development, কারিগরি ও দক্ষতা উন্নয়ন প্রশিক্ষণ।"
        />
        <link rel="canonical" href={`${SITE}/resources`} />
        <meta property="og:title" content="Training Center Resources — Probashi Skills" />
        <meta property="og:url" content={`${SITE}/resources`} />
      </Helmet>

      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-gold flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-accent-foreground" />
            </div>
            <span className="font-bold">Probashi Skills</span>
          </Link>
          <Button asChild size="sm">
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="container mx-auto px-6 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Resources for Bangladesh training centers</h1>
        <p className="text-lg text-muted-foreground mb-10">
          Guides covering vocational training, BMET workflows, Ami Probashi integration, and skill
          development — in English and Bangla.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {SEO_PAGES.map((p) => (
            <Card key={p.slug} className="p-5 hover:shadow-elegant transition">
              <div className="text-xs text-primary mb-1.5 font-medium">
                {p.lang === "bn" ? "বাংলা" : "English"} · {p.keyword}
              </div>
              <h2 className="font-semibold text-lg mb-2 leading-snug">{p.h1}</h2>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
              <Link
                to={`/${p.slug}`}
                className="text-sm text-primary font-medium inline-flex items-center gap-1"
              >
                Read more <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © 2026 Probashi Skills
      </footer>
    </div>
  );
}
