import * as React from "react";
import { cn } from "@/lib/utils";

export type KanbanProps = {
  children: React.ReactNode;
  className?: string;
};

export function Kanban({ children, className }: KanbanProps) {
  return (
    <div
      className={cn(
        "grid auto-cols-[260px] grid-flow-col gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type KanbanColumnProps = {
  title: string;
  count?: number;
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function KanbanColumn({
  title,
  count,
  children,
  className,
  ...rest
}: KanbanColumnProps) {
  return (
    <div
      className={cn(
        "flex w-[260px] shrink-0 flex-col rounded-lg border border-line bg-surface-2 p-3",
        className,
      )}
      {...rest}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-ink">{title}</h3>
        {count != null ? (
          <span className="tabular text-2xs text-ink-muted">{count}</span>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-col gap-2">{children}</div>
    </div>
  );
}

export type KanbanCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function KanbanCard({ children, className }: KanbanCardProps) {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-line bg-surface p-3 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
