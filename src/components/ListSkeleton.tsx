import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ListSkeleton({
  rows = 5,
  variant = "rows",
}: {
  rows?: number;
  /** "rows" for a divide-y list of avatar+text rows, "cards" for a 2-col card grid. */
  variant?: "rows" | "cards";
}) {
  if (variant === "cards") {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Card key={i} className="p-5 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </Card>
        ))}
      </div>
    );
  }
  return (
    <Card className="divide-y">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </Card>
  );
}
