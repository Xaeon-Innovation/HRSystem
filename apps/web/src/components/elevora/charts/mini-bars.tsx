import { cn } from "@/lib/utils";

export type MiniBarsProps = {
  values: number[];
  height?: number;
  className?: string;
};

export function MiniBars({ values, height = 44, className }: MiniBarsProps) {
  const mx = Math.max(...values, 1);
  return (
    <div
      className={cn("flex items-end gap-[3px]", className)}
      style={{ height }}
      dir="ltr"
    >
      {values.map((v, i) => (
        <span
          key={i}
          className={cn(
            "flex-1 rounded-[3px]",
            i === values.length - 1 ? "hatch" : "hatch-idle",
          )}
          style={{ height: `${(v / mx) * 100}%` }}
        />
      ))}
    </div>
  );
}
