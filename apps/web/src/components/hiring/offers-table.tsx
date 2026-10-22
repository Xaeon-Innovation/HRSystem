"use client";

import { PersonCell, StatusChip } from "@/components/elevora";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { HiringEmptyState } from "@/components/hiring/hiring-states";
import { formatDate, formatMoney, offerStatusLabel } from "@/lib/hiring/format";
import type { Offer } from "@/lib/hiring/types";
import { t } from "@/i18n";

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
        title={t("No offers yet")}
        description="When a candidate is ready, draft an offer from their profile or here."
        action={
          canManage ? (
            <Button size="sm" onClick={onNew}>
              {t("New offer")}
            </Button>
          ) : null
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {canManage ? (
        <div className="flex justify-end">
          <Button size="sm" className="w-full sm:w-auto" onClick={onNew}>
            {t("Create offer")}
          </Button>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-sm border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-muted">
                <th className="px-3 py-2.5 font-medium">{t("Candidate")}</th>
                <th className="px-3 py-2.5 text-end font-medium">{t("Salary")}</th>
                <th className="px-3 py-2.5 font-medium">{t("Start")}</th>
                <th className="px-3 py-2.5 font-medium">{t("Expires")}</th>
                <th className="px-3 py-2.5 font-medium">{t("Status")}</th>
                <th className="px-3 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-line last:border-0 hover:bg-surface-2/80"
                >
                  <td className="px-3 py-3">
                    <button type="button" className="text-left" onClick={() => onOpen(o.id)}>
                      <PersonCell
                        name={o.candidateName}
                        subtitle={o.offeredTitle}
                        avatar={<UserAvatar name={o.candidateName} size="sm" />}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-3 text-end tabular-nums text-ink">
                    {formatMoney(o.offeredSalary, o.currency)}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-ink-muted">
                    {formatDate(o.expectedJoinDate)}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-ink-muted">
                    {formatDate(o.expiryDate)}
                  </td>
                  <td className="px-3 py-3">
                    <StatusChip status={o.status} label={offerStatusLabel(o.status)} />
                  </td>
                  <td className="px-3 py-3 text-end">
                    <div className="flex justify-end gap-1">
                      {o.status === "pending_approval" && canManage ? (
                        <Button size="sm" onClick={() => onApprove(o.id)}>
                          {t("Approve & send")}
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" onClick={() => onOpen(o.id)}>
                        {t("Open")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
