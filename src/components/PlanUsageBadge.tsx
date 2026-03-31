import { Progress } from "@/components/ui/progress";
import { AlertTriangle } from "lucide-react";

interface PlanUsageBadgeProps {
  current: number;
  max: number;
  label: string;
  hasPlan: boolean;
  planName?: string;
}

const PlanUsageBadge = ({ current, max, label, hasPlan, planName }: PlanUsageBadgeProps) => {
  if (!hasPlan) return null;

  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= max;

  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 ${
        isAtLimit
          ? "border-destructive/40 bg-destructive/5"
          : isNearLimit
          ? "border-yellow-500/40 bg-yellow-500/5"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {isAtLimit && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-lg font-bold ${isAtLimit ? "text-destructive" : "text-foreground"}`}>
          {current}
        </span>
        <span className="text-sm text-muted-foreground">/ {max}</span>
      </div>
      <Progress
        value={percentage}
        className={`h-1.5 ${
          isAtLimit
            ? "[&>div]:bg-destructive"
            : isNearLimit
            ? "[&>div]:bg-yellow-500"
            : "[&>div]:bg-primary"
        }`}
      />
      {isAtLimit && (
        <p className="text-xs text-destructive mt-1.5">
          {planName} limit reached. Upgrade to add more.
        </p>
      )}
    </div>
  );
};

export default PlanUsageBadge;
