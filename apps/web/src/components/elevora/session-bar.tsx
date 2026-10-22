import { cn } from "@/lib/utils";

export type SessionBlock = {
  id: string;
  startPercent: number;
  widthPercent: number;
  tone?: "accent" | "warn" | "idle";
};

export type SessionBarProps = {
  dayLabels?: string[];
  blocks: SessionBlock[];
  className?: string;
};

const blockClass = {
  accent: "hatch",
  warn: "hatch-warn",
  idle: "hatch-idle",
} as const;

export function SessionBar({
  dayLabels = ["M", "T", "W", "T", "F", "S", "S"],
  blocks,
  className,
}: SessionBarProps) {
  return (
    <div className={cn("min-w-0", className)} dir="ltr">
      <div className="relative h-8 rounded-xs bg-surface-2">
        {blocks.map((b) => (
          <span
            key={b.id}
            className={cn(
              "absolute top-1 bottom-1 rounded-[3px]",
              blockClass[b.tone ?? "accent"],
            )}
            style={{
              left: `${b.startPercent}%`,
              width: `${b.widthPercent}%`,
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-2xs text-ink-muted">
        {dayLabels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  );
}
