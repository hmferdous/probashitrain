import { Link, useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, GraduationCap } from "lucide-react";
import { SEO_PAGES, type SeoPage } from "./seoPagesData";

const SITE = "https://probashitrain.lovable.app";

function PageInner({ page }: { page: SeoPage }) {
  const url = `${SITE}/${page.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: page.title,
        description: page.description,
        url,
        inLanguage: page.lang === "bn" ? "bn-BD" : "en",
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background" lang={page.lang === "bn" ? "bn" : "en"}>
      <Helmet>
        <html lang={page.lang === "bn" ? "bn" : "en"} />
        <title>{page.title}</title>
        <meta name="description" content={page.description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
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
            <Link to="/auth">{page.lang === "bn" ? "শুরু করুন" : "Get started"}</Link>
          </Button>
        </div>
      </header>

      <article className="container mx-auto px-6 py-14 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-5">
          {page.keyword}
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">{page.h1}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-10">{page.intro}</p>

        <div className="space-y-8">
          {page.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-2xl font-bold mb-3">{s.heading}</h2>
              <p className="text-muted-foreground leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>

        <Card className="p-6 my-12 bg-gradient-subtle border-primary/20">
          <h3 className="font-bold text-lg mb-2">
            {page.lang === "bn"
              ? "আপনার প্রশিক্ষণ কেন্দ্র ডিজিটাল করুন"
              : "Ready to digitize your training center?"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {page.lang === "bn"
              ? "৫ মিনিটে সেটআপ। কোনো সেটআপ ফি নেই।"
              : "Set up in 5 minutes. No setup fees."}
          </p>
          <Button asChild className="bg-gradient-primary">
            <Link to="/auth">
              {page.lang === "bn" ? "ফ্রি অ্যাকাউন্ট তৈরি করুন" : "Create your center"}{" "}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </Card>

        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-5">
            {page.lang === "bn" ? "সাধারণ প্রশ্নোত্তর" : "Frequently asked questions"}
          </h2>
          <div className="space-y-5">
            {page.faqs.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold mb-1.5 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                  {f.q}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed pl-6">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <nav className="mt-16 pt-8 border-t">
          <h2 className="font-bold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
            {page.lang === "bn" ? "আরও পড়ুন" : "Explore more"}
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            {SEO_PAGES.filter((p) => p.slug !== page.slug).map((p) => (
              <li key={p.slug}>
                <Link to={`/${p.slug}`} className="text-primary hover:underline">
                  {p.h1}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © 2026 Probashi Skills · <Link to="/" className="hover:underline">Home</Link>
      </footer>
    </div>
  );
}

export default function SeoLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = SEO_PAGES.find((p) => p.slug === slug);
  if (!page) return <Navigate to="/404" replace />;
  return <PageInner page={page} />;
}
