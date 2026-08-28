import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LeaveHeader({
  isAdmin,
  onNew,
}: {
  isAdmin: boolean;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight">Leave</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? "Review requests, watch who is off, and keep balances and accrual rules in one place."
            : "Check your remaining days, file time off, and follow the status of each request."}
        </p>
      </div>
      <Button size="sm" onClick={onNew}>
        <Plus className="h-4 w-4" />
        New leave request
      </Button>
    </div>
  );
}
