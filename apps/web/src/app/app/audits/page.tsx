"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  EmptyState,
  Notice,
  PageHeader,
  PersonCell,
} from "@/components/elevora";
import { Search, ScrollText } from "lucide-react";
import { t } from "@/i18n";

type Audit = {
  id: string;
  action: string;
  actorUserId: string | null;
  actorRole: string | null;
  actorName: string | null;
  tenantId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  resourceName: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

function auditWho(a: Audit): string {
  if (a.actorName) return a.actorName;
  if (a.resourceType === "user" && a.resourceName) return a.resourceName;
  const email = a.metadata?.email;
  if (typeof email === "string" && email) return email;
  return a.actorRole ?? "System";
}

export default function AuditsPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
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

  const filtered = q.trim()
    ? audits.filter((a) => {
        const hay = `${auditWho(a)} ${a.action} ${a.resourceName ?? ""}`.toLowerCase();
        return hay.includes(q.trim().toLowerCase());
      })
    : audits;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Audits")}
        subtitle={`${t("Platform audit log")} · ${total}`}
        actions={
          <div className="relative w-full sm:w-60">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden
            />
            <Input
              className="ps-9"
              placeholder={t("Filter actor or action")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        }
      />
      {error ? <Notice tone="warn">{error}</Notice> : null}

      <form
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
        onSubmit={(e) => load(e).catch((err) => setError(err.message))}
      >
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t("Action")}
          value={filters.action}
          onChange={(e) =>
            setFilters((f) => ({ ...f, action: e.target.value }))
          }
        />
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t("Tenant ID")}
          value={filters.tenantId}
          onChange={(e) =>
            setFilters((f) => ({ ...f, tenantId: e.target.value }))
          }
        />
        <Button type="submit" className="w-full sm:w-auto">
          {t("Filter")}
        </Button>
      </form>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ScrollText className="h-5 w-5" aria-hidden />}
            title={t("No audit events")}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-line text-start text-2xs text-ink-muted">
                  <th className="px-5 py-3 font-medium">{t("Actor")}</th>
                  <th className="px-3 py-3 font-medium">{t("Action")}</th>
                  <th className="px-3 py-3 font-medium">{t("Target")}</th>
                  <th className="px-5 py-3 font-medium">{t("Time")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 align-middle">
                      <PersonCell
                        name={auditWho(a)}
                        subtitle={a.actorRole ?? "system"}
                      />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <code className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-xs text-ink">
                        {a.action}
                      </code>
                    </td>
                    <td className="px-3 py-3 align-middle text-xs text-ink-2">
                      {a.resourceName ||
                        (a.tenantId
                          ? `tenant ${a.tenantId.slice(0, 8)}…`
                          : "—")}
                    </td>
                    <td className="px-5 py-3 align-middle tabular text-xs text-ink-muted">
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
