import { cn } from "@/lib/utils";
import { statusTone, toneTextClass } from "@/lib/status-tone";

export type StatusTextProps = {
  status: string;
  className?: string;
};

export function StatusText({ status, className }: StatusTextProps) {
  const tone = statusTone(status);
  return (
    <span className={cn("text-[11px] font-medium", toneTextClass(tone), className)}>
      {status}
    </span>
  );
}
