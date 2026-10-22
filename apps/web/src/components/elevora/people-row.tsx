import * as React from "react";
import { cn } from "@/lib/utils";

export type PeopleRowPerson = {
  id: string;
  name: string;
  avatar?: React.ReactNode;
};

export type PeopleRowProps = {
  people: PeopleRowPerson[];
  className?: string;
};

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? full;
}

export function PeopleRow({ people, className }: PeopleRowProps) {
  return (
    <div
      className={cn(
        "flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {people.map((p) => (
        <div key={p.id} className="flex w-[52px] shrink-0 flex-col items-center gap-1.5">
          {p.avatar ?? (
            <span className="inline-grid h-[42px] w-[42px] place-items-center rounded-[10px] bg-surface-2 text-xs font-semibold text-ink">
              {p.name
                .split(/\s+/)
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
          )}
          <span className="w-full truncate text-center text-2xs text-ink-2">
            {firstName(p.name)}
          </span>
        </div>
      ))}
    </div>
  );
}
