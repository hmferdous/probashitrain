import AppLayout from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  title: string;
  feature: string;
  description: string;
  requiredPlan: string;
}

export default function FeatureLockedPage({ title, feature, description, requiredPlan }: Props) {
  return (
    <AppLayout>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-1">{title}</h1>
        <p className="text-muted-foreground mb-8">{feature}</p>
        <Card className="p-12 text-center">
          <div className="h-14 w-14 mx-auto rounded-full bg-gradient-gold flex items-center justify-center shadow-gold mb-4">
            <Lock className="h-6 w-6 text-accent-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Available on {requiredPlan}</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">{description}</p>
          <Link to="/app/plans">
            <Button size="lg" className="gap-2">
              <Sparkles className="h-4 w-4" /> Upgrade to {requiredPlan}
            </Button>
          </Link>
        </Card>
      </div>
    </AppLayout>
  );
}
