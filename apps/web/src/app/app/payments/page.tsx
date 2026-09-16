"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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

export default function PaymentsPage() {
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [provider, setProvider] = useState("");
  const [triggerType, setTriggerType] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (provider.trim()) params.set("provider", provider.trim());
    if (triggerType.trim()) params.set("triggerType", triggerType.trim());
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
      <div>
        <h1 className="text-2xl font-semibold">{t("Payments")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Webhook and billing events")} ({total})
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t("Provider (polar, paymob)")}
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        />
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t("Trigger type")}
          value={triggerType}
          onChange={(e) => setTriggerType(e.target.value)}
        />
        <Button
          className="w-full sm:w-auto"
          variant="outline"
          onClick={() => load().catch((e) => setError(e.message))}
        >
          {t("Filter")}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="space-y-2">
        {events.map((ev) => (
          <Card key={ev.id}>
            <CardContent className="space-y-2 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{ev.triggerType}</p>
                  <p className="text-xs text-muted-foreground">
                    {ev.provider} · {ev.tenant?.name ?? t("Unlinked tenant")}
                    {ev.tenant?.slug ? ` (${ev.tenant.slug})` : ""} ·{" "}
                    {new Date(ev.processedAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    setExpanded((id) => (id === ev.id ? null : ev.id))
                  }
                >
                  {expanded === ev.id ? t("Hide payload") : t("Show payload")}
                </Button>
              </div>
              {expanded === ev.id ? (
                <pre className="max-h-64 overflow-auto rounded-md bg-muted/50 p-3 text-xs">
                  {JSON.stringify(ev.payload, null, 2).slice(0, 4000)}
                </pre>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("No payment events found.")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
