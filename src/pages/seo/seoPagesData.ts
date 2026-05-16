export type FAQ = { q: string; a: string };

export type SeoPage = {
  slug: string;
  lang: "en" | "bn";
  title: string;
  description: string;
  keyword: string;
  h1: string;
  intro: string;
  sections: { heading: string; body: string }[];
  faqs: FAQ[];
};

export const SEO_PAGES: SeoPage[] = [
  {
    slug: "vocational-training-bangladesh",
    lang: "en",
    title: "Vocational Training in Bangladesh — Manage Centers with Probashi Skills",
    description:
      "Run a vocational training center in Bangladesh. Publish courses to Ami Probashi, manage admissions, attendance, certificates and BMET-aligned training.",
    keyword: "vocational training Bangladesh",
    h1: "Vocational Training in Bangladesh",
    intro:
      "Bangladesh's vocational training sector trains hundreds of thousands of aspiring migrants every year. Probashi Skills is the all-in-one platform built for BTEB- and BMET-registered training centers to digitize the entire student lifecycle — from application on the Ami Probashi app to final certificate.",
    sections: [
      {
        heading: "Why vocational training matters for Bangladesh",
        body: "Skilled migrant workers earn 2–3x more than unskilled ones overseas. With over 3 crore registered aspirant migrants on the OEP platform, the demand for high-quality vocational training in trades like electrical work, motor driving, garments, welding, plumbing, and computer operation is at an all-time high.",
      },
      {
        heading: "What training centers can do on Probashi Skills",
        body: "Organize your catalog as Trades → Courses → Batches. Publish batches to the Ami Probashi mobile app. Receive applications, shortlist students, admit them manually for cash payments, track attendance, run live classes from inside the portal, grade performance and issue downloadable certificates.",
      },
      {
        heading: "BMET-aligned workflow",
        body: "The pipeline mirrors how BMET-registered TTCs (Technical Training Centers) operate: Applied → Shortlisted → Training Started → Ongoing → Completed → Certificate. Payment tracking supports both upfront app payments and manual cash with auto-generated invoices.",
      },
    ],
    faqs: [
      {
        q: "Is Probashi Skills approved by BMET?",
        a: "Probashi Skills is a private management platform for training centers. Your center must hold its own BMET / BTEB registration to issue government-recognized certificates.",
      },
      {
        q: "Can students apply through the Ami Probashi app?",
        a: "Yes. Batches you publish are listed on Ami Probashi. Aspirant migrants apply from the app and you receive their profiles in real time.",
      },
      {
        q: "What trades are most popular in Bangladesh?",
        a: "Computer operation, motor driving, electrical work, garments, welding, refrigeration & AC, and house-keeping are the most in-demand trades for both domestic and overseas employment.",
      },
    ],
  },
  {
    slug: "bmet-training-management",
    lang: "en",
    title: "BMET Training Management Software — Probashi Skills",
    description:
      "Software for BMET-registered Technical Training Centers (TTCs) in Bangladesh. Manage PDO, skill training, attendance, batches and certificates online.",
    keyword: "BMET training",
    h1: "BMET Training Management for TTCs",
    intro:
      "The Bureau of Manpower, Employment and Training (BMET) operates 100+ Technical Training Centers across Bangladesh. Probashi Skills helps both government TTCs and private BMET-approved centers move admissions, attendance, PDO scheduling, and certificate issuance from paper to a single online dashboard.",
    sections: [
      {
        heading: "Pre-Departure Orientation (PDO) & skill training in one place",
        body: "Manage both 3-day PDO sessions and longer skill courses (electrical, welding, driving, garments, RAC) from one platform. Auto-schedule batches, track per-day attendance, and issue completion certificates that students can download.",
      },
      {
        heading: "Receive applications from the OEP / Ami Probashi platform",
        body: "Every batch you publish flows to the Ami Probashi app where registered aspirant migrants can apply. Shortlist, admit, or reject applicants from your dashboard — no separate spreadsheet needed.",
      },
      {
        heading: "Cash admissions & invoice generation",
        body: "Most rural admissions are still cash-based. Probashi Skills generates a formatted invoice (INV-YYYYMM-XXXXXX) for every cash payment so your accounts team has a clean audit trail.",
      },
    ],
    faqs: [
      {
        q: "Does this replace the BMET LMS?",
        a: "No. The BMET LMS (training.oep.gov.bd) is the government portal. Probashi Skills is a private operations platform for the training center itself — they complement each other.",
      },
      {
        q: "Can I issue BMET PDO certificates from this platform?",
        a: "You can issue your center's completion certificate. The official BMET PDO certificate is downloaded by the worker directly from the BMET LMS using their passport number.",
      },
    ],
  },
  {
    slug: "ami-probashi-training-centers",
    lang: "en",
    title: "Ami Probashi for Training Centers — List Courses & Receive Applications",
    description:
      "Are you a training center serving migrants? Publish your courses to the Ami Probashi app, receive applications, and manage admissions with Probashi Skills.",
    keyword: "ami probashi training center",
    h1: "Publish Your Training Courses to Ami Probashi",
    intro:
      "Ami Probashi is Bangladesh's most-downloaded app for aspiring migrant workers, with millions of registered users. Probashi Skills connects your training center to the Ami Probashi ecosystem so every batch you open can be discovered by the people who need it most.",
    sections: [
      {
        heading: "How the integration works",
        body: "Create a batch in Probashi Skills with seats, fees, trade, schedule and location. It appears as a listing on the Ami Probashi app. Workers apply with a single tap; their profile, NID, education and passport details flow back to your dashboard.",
      },
      {
        heading: "Shortlist, admit, and track the entire pipeline",
        body: "Your team moves applicants through Applied → Shortlisted → Training Started → Ongoing → Completed. Mark attendance, score performance, and issue certificates without leaving the portal.",
      },
      {
        heading: "Built for Bangladesh",
        body: "Mobile-friendly, supports cash + mobile banking + upfront app payments, and designed around the BMET training pipeline used by every recognized TTC.",
      },
    ],
    faqs: [
      {
        q: "Is there a fee to list batches on Ami Probashi?",
        a: "Probashi Skills includes Ami Probashi publishing in your subscription — there are no per-listing fees.",
      },
      {
        q: "Can students pay the course fee in the app?",
        a: "Yes. Students can pay upfront from the Ami Probashi app or pay by cash on arrival; both routes are tracked in your payments dashboard.",
      },
    ],
  },
  {
    slug: "skill-development-bangladesh",
    lang: "en",
    title: "Skill Development Training Platform for Bangladesh | Probashi Skills",
    description:
      "Bangladesh skill development simplified. Manage trades, courses, batches, attendance, live classes and certificates for your training center.",
    keyword: "skill development Bangladesh",
    h1: "Skill Development Training, Digitized",
    intro:
      "Skill development is at the heart of Bangladesh's plan to move from a low-wage labour exporter to a skilled-labour exporter. Probashi Skills equips your center to scale that mission — without spreadsheets, paper attendance, or lost certificates.",
    sections: [
      {
        heading: "Trades, courses, batches — organized",
        body: "A three-level hierarchy that mirrors how training is actually delivered. Add a trade (e.g. Electrical), nest courses under it (House Wiring, Industrial Wiring), then publish dated batches with seats and fees.",
      },
      {
        heading: "Attendance & performance grading",
        body: "Daily attendance marking with Present / Absent / Late. Instructors can score students on theory, practical and discipline; final scores feed directly into the printable certificate.",
      },
      {
        heading: "Live online classes built in",
        body: "Run online theory classes through embedded video rooms — no Zoom account, no separate link sharing. One click and instructor + students are in the same room.",
      },
    ],
    faqs: [
      {
        q: "Do students need accounts on Probashi Skills?",
        a: "No. Students interact with your center via the Ami Probashi app or in person; Probashi Skills accounts are only for your center staff and instructors.",
      },
      {
        q: "How are certificates issued?",
        a: "Once a batch is marked Completed and grades are entered, certificates become downloadable PDFs branded with your center's name and logo.",
      },
    ],
  },
  {
    slug: "technical-training-centers-bangladesh",
    lang: "en",
    title: "Technical Training Center (TTC) Software in Bangladesh — Probashi Skills",
    description:
      "End-to-end software for Technical Training Centers in Bangladesh: admissions, batches, attendance, live classes, grading, certificates and payments.",
    keyword: "technical training Bangladesh",
    h1: "Software Built for Technical Training Centers",
    intro:
      "Whether you run a single TTC in Dhaka or a network across all 64 districts, Probashi Skills gives your team one dashboard to manage everything — from the first application to the final printed certificate.",
    sections: [
      {
        heading: "Multi-trade catalog management",
        body: "Computer operation, motor driving, electrical, plumbing, welding, RAC, garments, mason, house-keeping — model your full catalog and re-use it across batches.",
      },
      {
        heading: "Attendance that holds up to audit",
        body: "Per-day, per-batch attendance with timestamped records. Generate attendance reports for BMET inspections in seconds.",
      },
      {
        heading: "Payment tracking with auto invoices",
        body: "Every cash admission produces a formatted invoice. Track expected vs. collected vs. outstanding fees across your entire student base from one screen.",
      },
    ],
    faqs: [
      {
        q: "Can I add instructors and limit what they see?",
        a: "Yes. Instructors can be invited and given access only to the batches they teach — they can mark attendance, run live classes, and enter grades, but cannot see finance.",
      },
      {
        q: "Does it work on mobile?",
        a: "Yes — the dashboard is fully responsive so instructors can mark attendance from a phone in the classroom.",
      },
    ],
  },
  {
    slug: "probashi-prosikkhon",
    lang: "bn",
    title: "প্রবাসী প্রশিক্ষণ কেন্দ্র ব্যবস্থাপনা সফটওয়্যার | Probashi Skills",
    description:
      "বাংলাদেশের প্রবাসী প্রশিক্ষণ কেন্দ্রের জন্য সম্পূর্ণ সফটওয়্যার। Ami Probashi অ্যাপে কোর্স প্রকাশ, ভর্তি, হাজিরা, লাইভ ক্লাস ও সার্টিফিকেট।",
    keyword: "প্রবাসী প্রশিক্ষণ",
    h1: "প্রবাসী প্রশিক্ষণ কেন্দ্রের জন্য সম্পূর্ণ সমাধান",
    intro:
      "Probashi Skills হল বাংলাদেশের প্রবাসী প্রশিক্ষণ কেন্দ্রগুলোর জন্য তৈরি একটি অত্যাধুনিক ম্যানেজমেন্ট প্ল্যাটফর্ম। Ami Probashi অ্যাপে কোর্স প্রকাশ থেকে শুরু করে শিক্ষার্থী ভর্তি, হাজিরা, পরীক্ষা ও সার্টিফিকেট প্রদান — সবকিছু একটি ড্যাশবোর্ডে।",
    sections: [
      {
        heading: "কেন Probashi Skills?",
        body: "প্রতিদিন হাজার হাজার অভিবাসন প্রত্যাশী Ami Probashi অ্যাপ ব্যবহার করছেন। আপনার প্রশিক্ষণ কেন্দ্রের ব্যাচ সরাসরি এই অ্যাপে প্রকাশ করুন এবং দেশের যেকোনো প্রান্ত থেকে আবেদন গ্রহণ করুন।",
      },
      {
        heading: "সম্পূর্ণ পাইপলাইন",
        body: "আবেদন → শর্টলিস্ট → প্রশিক্ষণ শুরু → চলমান → সম্পন্ন → সার্টিফিকেট ডাউনলোড। প্রতিটি ধাপে শিক্ষার্থীর অবস্থা পরিষ্কারভাবে দেখা যায়।",
      },
      {
        heading: "নগদ ভর্তি ও ইনভয়েস",
        body: "ম্যানুয়াল নগদ পেমেন্টের জন্য স্বয়ংক্রিয়ভাবে ইনভয়েস তৈরি হয়। মোট প্রাপ্য, সংগ্রহ ও বকেয়া — সব এক জায়গায়।",
      },
    ],
    faqs: [
      {
        q: "এটি কি BMET অনুমোদিত?",
        a: "Probashi Skills একটি বেসরকারি ম্যানেজমেন্ট সফটওয়্যার। সরকারি স্বীকৃত সার্টিফিকেট ইস্যু করতে আপনার কেন্দ্রের নিজস্ব BMET / BTEB রেজিস্ট্রেশন থাকতে হবে।",
      },
      {
        q: "শিক্ষার্থীরা কীভাবে আবেদন করবেন?",
        a: "আপনি ব্যাচ প্রকাশ করলে তা Ami Probashi অ্যাপে দেখা যাবে। শিক্ষার্থীরা সেখান থেকে এক ক্লিকে আবেদন করতে পারবেন।",
      },
    ],
  },
  {
    slug: "dokkhota-unnayan",
    lang: "bn",
    title: "দক্ষতা উন্নয়ন প্রশিক্ষণ ব্যবস্থাপনা | Probashi Skills",
    description:
      "বাংলাদেশের কারিগরি ও দক্ষতা উন্নয়ন প্রশিক্ষণ কেন্দ্রের জন্য আধুনিক সফটওয়্যার। ট্রেড, কোর্স, ব্যাচ, হাজিরা ও সার্টিফিকেট — সবকিছু এক জায়গায়।",
    keyword: "দক্ষতা উন্নয়ন",
    h1: "দক্ষতা উন্নয়নের জন্য আধুনিক প্ল্যাটফর্ম",
    intro:
      "বাংলাদেশের দক্ষতা উন্নয়ন খাতকে কাগজ থেকে ডিজিটালে নিয়ে যান। ইলেকট্রিক্যাল, ড্রাইভিং, ওয়েল্ডিং, RAC, গার্মেন্টস — প্রতিটি ট্রেডের ব্যাচ পরিচালনা সহজ করুন।",
    sections: [
      {
        heading: "ট্রেড → কোর্স → ব্যাচ",
        body: "একটি ট্রেডের অধীনে একাধিক কোর্স, প্রতিটি কোর্সের অধীনে একাধিক ব্যাচ — ঠিক যেভাবে আপনি বাস্তবে প্রশিক্ষণ পরিচালনা করেন।",
      },
      {
        heading: "হাজিরা ও মূল্যায়ন",
        body: "প্রতিদিনের হাজিরা মার্ক করুন, পরীক্ষায় নম্বর দিন, এবং সম্পন্ন হলে সরাসরি সার্টিফিকেট তৈরি করুন।",
      },
      {
        heading: "লাইভ ক্লাস",
        body: "পোর্টালের ভেতরেই লাইভ থিওরি ক্লাস নিন — আলাদা Zoom লিংক প্রয়োজন নেই।",
      },
    ],
    faqs: [
      {
        q: "ছোট প্রশিক্ষণ কেন্দ্রের জন্যও কি উপযোগী?",
        a: "হ্যাঁ। যেকোনো আকারের কেন্দ্র — এক ব্যাচ থেকে শত ব্যাচ পর্যন্ত — Probashi Skills ব্যবহার করতে পারে।",
      },
      {
        q: "প্রশিক্ষকদের কীভাবে যোগ করব?",
        a: "ড্যাশবোর্ড থেকে প্রশিক্ষক ইনভাইট করুন। তারা শুধু নিজেদের ব্যাচের তথ্য দেখতে পারবেন।",
      },
    ],
  },
  {
    slug: "karigari-prosikkhon",
    lang: "bn",
    title: "কারিগরি প্রশিক্ষণ কেন্দ্রের সফটওয়্যার | Probashi Skills",
    description:
      "বাংলাদেশের TTC ও কারিগরি প্রশিক্ষণ কেন্দ্রের জন্য সম্পূর্ণ ডিজিটাল সমাধান। ভর্তি, হাজিরা, পেমেন্ট ট্র্যাকিং ও সার্টিফিকেট।",
    keyword: "কারিগরি প্রশিক্ষণ",
    h1: "কারিগরি প্রশিক্ষণ কেন্দ্রের ডিজিটাল রূপান্তর",
    intro:
      "BMET অনুমোদিত TTC এবং বেসরকারি কারিগরি প্রশিক্ষণ কেন্দ্রগুলোর জন্য Probashi Skills একটি সম্পূর্ণ ব্যবস্থাপনা প্ল্যাটফর্ম। কাগজের রেজিস্টার, এক্সেল ফাইল এবং হাতের লেখা সার্টিফিকেট — সবকিছু একটি অনলাইন ড্যাশবোর্ডে।",
    sections: [
      {
        heading: "BMET পাইপলাইন অনুসরণ করে",
        body: "আবেদন, শর্টলিস্ট, প্রশিক্ষণ, সম্পন্ন — পুরো প্রক্রিয়া BMET-এর মান অনুযায়ী।",
      },
      {
        heading: "পেমেন্ট ও ইনভয়েস",
        body: "নগদ, মোবাইল ব্যাংকিং, অথবা Ami Probashi অ্যাপ — যেকোনো মাধ্যমে নেওয়া পেমেন্ট ট্র্যাক করুন। প্রতিটি লেনদেনের জন্য স্বয়ংক্রিয় ইনভয়েস।",
      },
      {
        heading: "অডিট-প্রস্তুত রেকর্ড",
        body: "BMET পরিদর্শনের সময় হাজিরা, ভর্তি এবং সার্টিফিকেট রিপোর্ট কয়েক সেকেন্ডে তৈরি করুন।",
      },
    ],
    faqs: [
      {
        q: "শুরু করতে কত সময় লাগবে?",
        a: "৫ মিনিটে সাইন আপ এবং কেন্দ্র সেটআপ। প্রথম ব্যাচ একই দিনেই প্রকাশ করা যায়।",
      },
      {
        q: "ফি কত?",
        a: "শুরু করা বিনামূল্যে। বড় কেন্দ্রের জন্য পেইড প্ল্যান পরে যোগ করা হবে।",
      },
    ],
  },
];
