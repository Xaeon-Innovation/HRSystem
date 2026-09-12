"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/i18n";

type Audit = {
  id: string;
  action: string;
  actorUserId: string | null;
  actorRole: string | null;
  tenantId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export default function AuditsPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    action: "",
    tenantId: "",
  });

  async function load(e?: FormEvent) {
    e?.preventDefault();
    const qs = new URLSearchParams({ limit: "50" });
    if (filters.action) qs.set("action", filters.action);
    if (filters.tenantId) qs.set("tenantId", filters.tenantId);
    const data = await api<{ audits: Audit[]; total: number }>(
      `/v1/audits?${qs.toString()}`,
    );
    setAudits(data.audits);
    setTotal(data.total);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("Audits")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Platform and tenant-admin sensitive actions (")}{total} {t("matching)")}</p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => load(e).catch((err) => setError(err.message))}
      >
        <div className="space-y-1">
          <Label>{t("Action")}</Label>
          <Input
            placeholder={t("tenant.suspend")}
            value={filters.action}
            onChange={(e) =>
              setFilters((f) => ({ ...f, action: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1">
          <Label>{t("Tenant ID")}</Label>
          <Input
            placeholder={t("uuid")}
            value={filters.tenantId}
            onChange={(e) =>
              setFilters((f) => ({ ...f, tenantId: e.target.value }))
            }
          />
        </div>
        <Button type="submit">{t("Filter")}</Button>
      </form>

      <div className="space-y-2">
        {audits.map((a) => (
          <Card key={a.id}>
            <CardContent className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{a.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.actorRole ?? "system"}
                    {a.tenantId ? ` · tenant ${a.tenantId.slice(0, 8)}…` : ""}
                    {a.resourceType
                      ? ` · ${a.resourceType}:${a.resourceId?.slice(0, 8) ?? ""}`
                      : ""}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(a.createdAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {audits.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No audit events.")}</p>
        ) : null}
      </div>
    </div>
  );
}
