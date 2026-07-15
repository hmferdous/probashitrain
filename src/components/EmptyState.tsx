import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function EmptyState({
  icon: Icon,
  message,
  className,
}: {
  icon: LucideIcon;
  message: string;
  className?: string;
}) {
  return (
    <Card className={cn("p-12 text-center", className)}>
      <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
      <p className="text-muted-foreground">{message}</p>
    </Card>
  );
}
