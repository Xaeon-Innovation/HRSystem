import * as React from "react";
import { cn } from "@/lib/utils";
import { IconTile } from "./icon-tile";

export type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-4 py-10 text-center",
        className,
      )}
    >
      {icon ? (
        <IconTile size="lg" tone="neutral">
          {icon}
        </IconTile>
      ) : null}
      <h3 className={cn("text-sm font-semibold text-ink", icon && "mt-4")}>{title}</h3>
      {subtitle ? (
        <p className="mt-1 max-w-sm text-sm text-ink-muted">{subtitle}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn("skeleton-block rounded-sm", className)} {...props} />;
}

export type NoticeTone = "neutral" | "warn" | "accent";

const noticeStyles: Record<NoticeTone, string> = {
  neutral: "border-line bg-surface-2 text-ink-2",
  warn: "border-warn/30 bg-warn/10 text-ink",
  accent: "border-accent/30 bg-accent-tint text-accent-ink",
};

export type NoticeProps = {
  children: React.ReactNode;
  tone?: NoticeTone;
  className?: string;
};

export function Notice({ children, tone = "neutral", className }: NoticeProps) {
  return (
    <div
      className={cn(
        "rounded-sm border px-3 py-2.5 text-sm",
        noticeStyles[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
