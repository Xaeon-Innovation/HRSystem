"use client";

import { Button } from "@/components/ui/button";
import { TEXTAREA_CLASS } from "@/lib/hiring/format";
import { formatDate, formatMoney } from "@/lib/hiring/format";
import type { Offer } from "@/lib/hiring/types";
import { OfferStatusBadge } from "@/components/hiring/hiring-status-badge";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";

export function OfferDetailDrawer({
  offer,
  open,
  onOpenChange,
  canManage,
  onSend,
  onApprove,
  onAccept,
  onReject,
  onOpenCandidate,
}: {
  offer: Offer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onSend: (id: string) => void;
  onApprove: (id: string) => void;
  onAccept: (id: string) => void;
  onReject: (id: string, notes: string) => void;
  onOpenCandidate: (id: string) => void;
}) {
  const [notes, setNotes] = useState("");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {offer ? (
          <>
            <SheetHeader>
              <SheetTitle>{offer.candidateName}</SheetTitle>
              <SheetDescription>
                {offer.offeredTitle} · {formatMoney(offer.offeredSalary, offer.currency)}
              </SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-4">
              <OfferStatusBadge status={offer.status} />
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Fact label="Offer date" value={formatDate(offer.offerDate)} />
                <Fact label="Expiry" value={formatDate(offer.expiryDate)} />
                <Fact label="Join date" value={formatDate(offer.expectedJoinDate)} />
                <Fact label="Approved by" value={offer.approvedByName ?? "—"} />
              </dl>
              {offer.benefitsNotes ? (
                <p className="text-sm">{offer.benefitsNotes}</p>
              ) : null}
              {offer.notes ? (
                <p className="rounded-lg bg-secondary/70 px-3 py-2 text-sm">{offer.notes}</p>
              ) : null}
              {offer.negotiationNotes ? (
                <p className="text-sm text-muted-foreground">Negotiation: {offer.negotiationNotes}</p>
              ) : null}
              {canManage && (offer.status === "sent" || offer.status === "draft") ? (
                <textarea
                  className={TEXTAREA_CLASS}
                  placeholder="Negotiation notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => onOpenCandidate(offer.candidateId)}>
                Open candidate
              </Button>
            </SheetBody>
            {canManage ? (
              <SheetFooter className="flex-wrap">
                {offer.status === "draft" ? (
                  <Button size="sm" variant="outline" onClick={() => onSend(offer.id)}>
                    Mark sent
                  </Button>
                ) : null}
                {offer.status === "pending_approval" ? (
                  <Button size="sm" onClick={() => onApprove(offer.id)}>
                    Approve & send
                  </Button>
                ) : null}
                {offer.status === "sent" || offer.status === "draft" ? (
                  <>
                    <Button size="sm" onClick={() => onAccept(offer.id)}>
                      Mark accepted
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onReject(offer.id, notes)}
                    >
                      Mark declined
                    </Button>
                  </>
                ) : null}
              </SheetFooter>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
