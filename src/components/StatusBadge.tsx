import { Badge } from "@/components/ui/badge";
import type { StatusStyle } from "@/lib/statusColors";
import { cn } from "@/lib/utils";

export default function StatusBadge({ status, className }: { status: StatusStyle; className?: string }) {
  return (
    <Badge variant="outline" className={cn(status.color, className)}>
      {status.label}
    </Badge>
  );
}
