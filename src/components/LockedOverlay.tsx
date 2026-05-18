import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  title?: string;
  description?: string;
  requiredPlan?: string;
  className?: string;
}

export default function LockedOverlay({
  children,
  title = "Upgrade to unlock",
  description = "This feature is available on a higher plan.",
  requiredPlan,
  className,
}: Props) {
  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none select-none blur-sm opacity-50">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px] rounded-lg">
        <div className="bg-card border shadow-elegant rounded-xl p-6 text-center max-w-sm mx-4">
          <div className="h-10 w-10 mx-auto rounded-full bg-gradient-gold flex items-center justify-center shadow-gold mb-3">
            <Lock className="h-5 w-5 text-accent-foreground" />
          </div>
          <h3 className="font-semibold mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          <Link to="/app/plans">
            <Button size="sm" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              {requiredPlan ? `Upgrade to ${requiredPlan}` : "View plans"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
