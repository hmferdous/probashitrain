import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Eye } from "lucide-react";
import { PLANS, PlanTier, usePlan } from "@/lib/plan";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Plans() {
  const { tier, setTier } = usePlan();

  const handleSwitch = (t: PlanTier) => {
    setTier(t);
    toast.success(`Now previewing the ${PLANS[t].name} plan`);
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader
          title="Plans"
          description="Choose a plan. In this demo, switching previews exactly what each plan unlocks across the portal."
        />

        <Card className="p-4 mb-6 bg-accent/10 border-accent/40 flex items-center gap-3">
          <Eye className="h-5 w-5 text-accent" />
          <div className="text-sm">
            <span className="font-medium">Demo mode:</span> currently previewing{" "}
            <Badge className="ml-1">{PLANS[tier].name}</Badge>
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-5">
          {(Object.keys(PLANS) as PlanTier[]).map((key) => {
            const p = PLANS[key];
            const active = key === tier;
            const highlight = key === "premium";
            return (
              <Card
                key={key}
                className={cn(
                  "p-6 flex flex-col relative transition-all",
                  active && "ring-2 ring-primary shadow-elegant",
                  highlight && !active && "border-accent/60"
                )}
              >
                {highlight && (
                  <Badge className="absolute -top-2 right-4 bg-gradient-gold text-accent-foreground">
                    Most popular
                  </Badge>
                )}
                <div className="mb-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {p.tier}
                  </div>
                  <h3 className="text-2xl font-bold mt-1">{p.name}</h3>
                  <div className="text-3xl font-bold mt-2">{p.price}</div>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSwitch(key)}
                  disabled={active}
                  variant={active ? "outline" : highlight ? "default" : "secondary"}
                  className="w-full gap-1.5"
                >
                  {active ? (
                    "Current preview"
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Preview as {p.name}
                    </>
                  )}
                </Button>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-6 text-center">
          Switch plans freely — your data stays the same. Locks and limits update instantly across the portal.
        </p>
      </div>
    </AppLayout>
  );
}
