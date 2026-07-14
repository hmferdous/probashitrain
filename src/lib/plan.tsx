import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type PlanTier = "basic" | "premium" | "enterprise";

export interface PlanConfig {
  tier: PlanTier;
  name: string;
  price: string;
  features: string[];
  limits: {
    maxStudents: number | null;
    maxPublishedCourses: number | null;
  };
  locked: {
    advancedCharts: boolean;
    liveClasses: boolean;
    attendance: boolean;
    certificates: boolean;
    inPersonAdmission: boolean;
    customCertificate: boolean;
  };
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  basic: {
    tier: "basic",
    name: "Basic",
    price: "৳ 0",
    features: [
      "Courses & batches",
      "Manage batches",
      "Ami Probashi applications",
      "Up to 50 students",
    ],
    limits: { maxStudents: 50, maxPublishedCourses: 3 },
    locked: {
      advancedCharts: true,
      liveClasses: true,
      attendance: true,
      certificates: true,
      inPersonAdmission: true,
      customCertificate: true,
    },
  },
  premium: {
    tier: "premium",
    name: "Premium",
    price: "৳ 4,999/mo",
    features: [
      "Everything in Basic",
      "Attendance & certificates",
      "Advanced analytics",
      "In-person admission",
      "Up to 500 students",
      "Up to 20 published courses",
    ],
    limits: { maxStudents: 500, maxPublishedCourses: 20 },
    locked: {
      advancedCharts: false,
      liveClasses: true,
      attendance: false,
      certificates: false,
      inPersonAdmission: false,
      customCertificate: false,
    },
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    price: "Custom",
    features: [
      "Everything in Premium",
      "Live online classes",
      "Unlimited students",
      "Unlimited courses",
      "Priority support",
    ],
    limits: { maxStudents: null, maxPublishedCourses: null },
    locked: {
      advancedCharts: false,
      liveClasses: false,
      attendance: false,
      certificates: false,
      inPersonAdmission: false,
      customCertificate: false,
    },
  },
};

interface PlanContextValue {
  plan: PlanConfig;
  tier: PlanTier;
  setTier: (t: PlanTier) => void;
}

const PlanContext = createContext<PlanContextValue | undefined>(undefined);
const STORAGE_KEY = "demo_plan_tier";

export function PlanProvider({ children }: { children: ReactNode }) {
  const [tier, setTierState] = useState<PlanTier>(() => {
    if (typeof window === "undefined") return "basic";
    const stored = localStorage.getItem(STORAGE_KEY) as PlanTier | null;
    return stored && PLANS[stored] ? stored : "basic";
  });

  const setTier = (t: PlanTier) => {
    setTierState(t);
    localStorage.setItem(STORAGE_KEY, t);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, tier);
  }, [tier]);

  return (
    <PlanContext.Provider value={{ plan: PLANS[tier], tier, setTier }}>
      {children}
    </PlanContext.Provider>
  );
}

export const usePlan = () => {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used inside PlanProvider");
  return ctx;
};
