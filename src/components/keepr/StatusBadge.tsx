import { Clock, Lock, LockOpen, ShieldQuestion, TimerOff, XCircle } from "lucide-react";

import { STATUS_LABEL, type ItemStatus } from "@/lib/access";
import { cn } from "@/lib/utils";

const STYLE: Record<ItemStatus, string> = {
  private: "border-border bg-surface text-muted-foreground",
  locked: "border-border-strong bg-surface-2 text-foreground",
  pending: "border-warning/40 bg-warning/10 text-warning",
  denied: "border-destructive/40 bg-destructive/10 text-destructive",
  awaiting_pin: "border-primary/40 bg-primary/10 text-primary",
  unlocked: "border-success/45 bg-success/12 text-success",
  expired: "border-border-strong bg-surface-2 text-muted-foreground",
};

const ICON: Record<ItemStatus, typeof Lock> = {
  private: Lock,
  locked: Lock,
  pending: Clock,
  denied: XCircle,
  awaiting_pin: ShieldQuestion,
  unlocked: LockOpen,
  expired: TimerOff,
};

export function StatusBadge({ status, extra }: { status: ItemStatus; extra?: string }) {
  const Icon = ICON[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        STYLE[status],
        status === "unlocked" && "animate-pulse-ring",
      )}
    >
      <Icon className="size-3.5" />
      {STATUS_LABEL[status]}
      {extra ? <span className="font-mono text-[11px] opacity-80">{extra}</span> : null}
    </span>
  );
}
