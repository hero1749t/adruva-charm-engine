import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

const badgeToneMap: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Trial: "bg-sky-100 text-sky-700 border-sky-200",
  "At Risk": "bg-amber-100 text-amber-800 border-amber-200",
  Paused: "bg-slate-100 text-slate-700 border-slate-200",
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
  Paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Overdue: "bg-rose-100 text-rose-700 border-rose-200",
  Failed: "bg-rose-100 text-rose-700 border-rose-200",
  Refunded: "bg-slate-100 text-slate-700 border-slate-200",
  "In Progress": "bg-violet-100 text-violet-700 border-violet-200",
  Delayed: "bg-rose-100 text-rose-700 border-rose-200",
  Ready: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Escalated: "bg-rose-100 text-rose-700 border-rose-200",
  Open: "bg-sky-100 text-sky-700 border-sky-200",
  Critical: "bg-rose-100 text-rose-700 border-rose-200",
  High: "bg-amber-100 text-amber-800 border-amber-200",
  Medium: "bg-sky-100 text-sky-700 border-sky-200",
  Low: "bg-slate-100 text-slate-700 border-slate-200",
  Connected: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Error: "bg-rose-100 text-rose-700 border-rose-200",
  Info: "bg-sky-100 text-sky-700 border-sky-200",
  Warning: "bg-amber-100 text-amber-800 border-amber-200",
  Success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Live: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Offline: "bg-rose-100 text-rose-700 border-rose-200",
  "Needs Refresh": "bg-amber-100 text-amber-800 border-amber-200",
  New: "bg-sky-100 text-sky-700 border-sky-200",
  Contacted: "bg-violet-100 text-violet-700 border-violet-200",
  "Demo Scheduled": "bg-amber-100 text-amber-800 border-amber-200",
  Approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-100 text-rose-700 border-rose-200",
  Converted: "bg-slate-100 text-slate-700 border-slate-200",
};

export const AdminStatusBadge = ({ value }: { value: string }) => (
  <Badge
    variant="outline"
    className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", badgeToneMap[value] ?? "bg-slate-100 text-slate-700 border-slate-200")}
  >
    {value}
  </Badge>
);

export const AdminMetricCard = ({
  title,
  value,
  delta,
  icon: Icon,
}: {
  title: string;
  value: string;
  delta: string;
  icon: LucideIcon;
}) => (
  <Card className="rounded-2xl border-slate-200/80 shadow-sm">
    <CardContent className="flex items-start justify-between p-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
        <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
          <ArrowUpRight className="h-3 w-3" />
          {delta}
        </div>
      </div>
      <div className="rounded-2xl bg-orange-50 p-3 text-orange-600">
        <Icon className="h-5 w-5" />
      </div>
    </CardContent>
  </Card>
);

export const AdminSectionHeader = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div className="space-y-1">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
    {action}
  </div>
);

export const AdminPanelCard = ({
  title,
  description,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) => (
  <Card className="rounded-2xl border-slate-200/80 shadow-sm">
    <CardHeader className="flex flex-row items-start justify-between gap-4">
      <div>
        <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
        {description ? <CardDescription className="mt-1 text-sm text-slate-500">{description}</CardDescription> : null}
      </div>
      {actionLabel ? (
        <Button variant="outline" size="sm" className="rounded-full" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export const AdminTableEmptyState = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    <p className="mt-1 text-sm text-slate-500">{description}</p>
  </div>
);

export const AdminLoadingState = () => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <Card key={index} className="rounded-2xl">
        <CardContent className="space-y-4 p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    ))}
  </div>
);
