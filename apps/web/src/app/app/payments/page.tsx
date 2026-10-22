"use client";

import { Fragment, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Chip,
  EmptyState,
  Notice,
  PageHeader,
  Segmented,
} from "@/components/elevora";
import { Receipt } from "lucide-react";
import { t } from "@/i18n";

type PaymentEvent = {
  id: string;
  provider: string;
  externalId: string;
  triggerType: string;
  tenantId: string | null;
  processedAt: string;
  payload: Record<string, unknown>;
  tenant: { id: string; name: string | null; slug: string | null } | null;
};

type ProviderFilter = "all" | "polar" | "paymob";

export default function PaymentsPage() {
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [provider, setProvider] = useState<ProviderFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(nextProvider: ProviderFilter = provider) {
    const params = new URLSearchParams();
    if (nextProvider !== "all") params.set("provider", nextProvider);
    params.set("limit", "100");
    const data = await api<{ events: PaymentEvent[]; total: number }>(
      `/v1/payment-events?${params.toString()}`,
    );
    setEvents(data.events);
    setTotal(data.total);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Payments")}
        subtitle={`${t("Events from Polar and Paymob")} · ${total}`}
        actions={
          <Segmented<ProviderFilter>
            aria-label={t("Provider")}
            value={provider}
            onChange={(v) => {
              setProvider(v);
              load(v).catch((e) => setError(e.message));
            }}
            options={[
              { value: "all", label: t("All") },
              { value: "polar", label: "Polar" },
              { value: "paymob", label: "Paymob" },
            ]}
          />
        }
      />

      {error ? <Notice tone="warn">{error}</Notice> : null}

      <Card className="overflow-hidden">
        {events.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-5 w-5" aria-hidden />}
            title={t("No payment events found")}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-line text-start text-2xs text-ink-muted">
                  <th className="px-5 py-3 font-medium">{t("Event")}</th>
                  <th className="px-3 py-3 font-medium">{t("Tenant")}</th>
                  <th className="px-3 py-3 font-medium">{t("Provider")}</th>
                  <th className="px-3 py-3 font-medium">{t("Time")}</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <Fragment key={ev.id}>
                    <tr className="border-b border-line last:border-0">
                      <td className="px-5 py-3 align-middle">
                        <p className="font-semibold font-mono text-xs text-ink">
                          {ev.triggerType}
                        </p>
                        <p className="truncate text-2xs text-ink-muted font-mono">
                          {ev.externalId}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-middle text-ink-2">
                        {ev.tenant?.name ?? t("Unlinked tenant")}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <Chip>{ev.provider}</Chip>
                      </td>
                      <td className="px-3 py-3 align-middle tabular text-xs text-ink-muted">
                        {new Date(ev.processedAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 align-middle text-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setExpanded((id) => (id === ev.id ? null : ev.id))
                          }
                        >
                          {expanded === ev.id
                            ? t("Hide payload")
                            : t("Show payload")}
                        </Button>
                      </td>
                    </tr>
                    {expanded === ev.id ? (
                      <tr className="border-b border-line">
                        <td colSpan={5} className="px-5 py-3">
                          <pre className="max-h-64 overflow-auto rounded-sm bg-surface-2 p-3 text-xs text-ink-2">
                            {JSON.stringify(ev.payload, null, 2).slice(0, 4000)}
                          </pre>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
