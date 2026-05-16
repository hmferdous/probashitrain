import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://probashitrain.lovable.app";

const SEO_SLUGS = [
  "vocational-training-bangladesh",
  "bmet-training-management",
  "ami-probashi-training-centers",
  "skill-development-bangladesh",
  "technical-training-centers-bangladesh",
  "probashi-prosikkhon",
  "dokkhota-unnayan",
  "karigari-prosikkhon",
];

type Entry = { path: string; changefreq?: string; priority?: string };

const entries: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/auth", changefreq: "monthly", priority: "0.5" },
  { path: "/resources", changefreq: "weekly", priority: "0.8" },
  ...SEO_SLUGS.map((slug) => ({
    path: `/${slug}`,
    changefreq: "monthly",
    priority: "0.9",
  })),
];

const xml = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n")
  ),
  `</urlset>`,
].join("\n");

writeFileSync(resolve("public/sitemap.xml"), xml);
console.log(`sitemap.xml written (${entries.length} entries)`);
