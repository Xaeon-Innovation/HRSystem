"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/i18n";

type SubscriptionRow = {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  seatsUsed: number;
  seatLimit: number | null;
  tenant: { id: string; name: string; slug: string; status: string } | null;
  plan: { id: string; code: string; name: string } | null;
};

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await api<{ subscriptions: SubscriptionRow[] }>(
      "/v1/subscriptions",
    );
    setRows(data.subscriptions);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("Subscriptions")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Cross-tenant billing status and overrides")}</p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="space-y-2">
        {rows.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">
                  {s.tenant?.name ?? t("Unknown tenant")}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({s.tenant?.slug})
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.plan?.name ?? t("No plan")} · {s.status}
                  {s.cancelAtPeriodEnd ? t(" · cancel at period end") : ""}
                  {" · "}
                  {s.seatsUsed}
                  {s.seatLimit != null ? `/${s.seatLimit}` : ""} {t("seats")}{s.currentPeriodEnd
                    ? ` · ends ${new Date(s.currentPeriodEnd).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {s.status !== "canceled" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      api(`/v1/subscriptions/${s.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({
                          cancelAtPeriodEnd: true,
                          status: "canceled",
                        }),
                      })
                        .then(load)
                        .catch((e) => setError(e.message))
                    }
                  >
                    {t("Cancel")}</Button>
                ) : null}
                {s.status === "past_due" || s.status === "canceled" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      api(`/v1/subscriptions/${s.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: "active" }),
                      })
                        .then(load)
                        .catch((e) => setError(e.message))
                    }
                  >
                    {t("Force active")}</Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No subscriptions.")}</p>
        ) : null}
      </div>
    </div>
  );
}
