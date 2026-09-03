"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HiringEmptyState } from "@/components/hiring/hiring-states";
import { OfferStatusBadge } from "@/components/hiring/hiring-status-badge";
import { formatDate, formatMoney } from "@/lib/hiring/format";
import type { Offer } from "@/lib/hiring/types";

export function OffersTable({
  offers,
  canManage,
  onOpen,
  onNew,
  onApprove,
}: {
  offers: Offer[];
  canManage: boolean;
  onOpen: (id: string) => void;
  onNew: () => void;
  onApprove: (id: string) => void;
}) {
  if (offers.length === 0) {
    return (
      <HiringEmptyState
        title="No offers yet"
        description="When a candidate is ready, draft an offer from their profile or here."
        action={
          canManage ? (
            <Button size="sm" onClick={onNew}>
              New offer
            </Button>
          ) : null
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      {canManage ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={onNew}>
            New offer
          </Button>
        </div>
      ) : null}
      {offers.map((o) => (
        <Card key={o.id}>
          <CardContent className="flex flex-wrap items-start justify-between gap-3 py-3">
            <button type="button" className="min-w-0 text-left" onClick={() => onOpen(o.id)}>
              <p className="font-semibold">{o.candidateName}</p>
              <p className="text-xs text-muted-foreground">
                {o.offeredTitle} · {formatMoney(o.offeredSalary, o.currency)} · join{" "}
                {formatDate(o.expectedJoinDate)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Offered {formatDate(o.offerDate)} · expires {formatDate(o.expiryDate)}
                {o.approvedByName ? ` · approved by ${o.approvedByName}` : ""}
              </p>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <OfferStatusBadge status={o.status} />
              {o.status === "pending_approval" && canManage ? (
                <Button size="sm" onClick={() => onApprove(o.id)}>
                  Approve & send
                </Button>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => onOpen(o.id)}>
                Open
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
