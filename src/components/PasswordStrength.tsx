import { useMemo } from "react";
import { cn } from "@/lib/utils";

export function scorePassword(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
  const colors = ["bg-destructive", "bg-destructive", "bg-warning", "bg-warning", "bg-success", "bg-success"];
  return { score, label: labels[score], color: colors[score] };
}

export default function PasswordStrength({ password }: { password: string }) {
  const { score, label, color } = useMemo(() => scorePassword(password), [password]);
  if (!password) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < score ? color : "bg-muted"
            )}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>Strength: <span className="font-medium text-foreground">{label}</span></span>
        <span>Use 8+ chars, mix case, number & symbol</span>
      </div>
    </div>
  );
}
