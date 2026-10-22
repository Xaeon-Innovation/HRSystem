"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { api, setSession } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Chip,
  EmptyState,
  Notice,
  PageHeader,
  PersonCell,
  Segmented,
  StatusChip,
} from "@/components/elevora";
import { Building2, Plus, Search } from "lucide-react";
import { t } from "@/i18n";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  seatsUsed?: number;
  plan?: { code: string; name: string; seatLimit: number | null } | null;
  subscription?: { status: string } | null;
};

type StatusFilter = "" | "active" | "suspended" | "deleted";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    adminEmail: "",
    adminPassword: "",
    adminName: "",
    planCode: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(nextStatus: StatusFilter = status, nextQ = q) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextStatus) params.set("status", nextStatus);
    const data = await api<{ tenants: Tenant[] }>(
      `/v1/tenants?${params.toString()}`,
    );
    setTenants(data.tenants);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      const body: Record<string, string> = {
        name: form.name,
        slug: form.slug,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
        adminName: form.adminName,
      };
      if (form.planCode) body.planCode = form.planCode;
      await api("/v1/tenants", { method: "POST", body: JSON.stringify(body) });
      setForm({
        name: "",
        slug: "",
        adminEmail: "",
        adminPassword: "",
        adminName: "",
        planCode: "",
      });
      setProvisionOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Tenants")}
        subtitle={`${tenants.length} ${t("workspaces")}`}
        actions={
          <Button
            className="w-full sm:w-auto"
            onClick={() => setProvisionOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden />
            {t("Provision tenant")}
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <Input
            className="ps-9"
            placeholder={t("Search org or slug")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                load(status, q).catch((err) => setError(err.message));
              }
            }}
          />
        </div>
        <Segmented<StatusFilter>
          aria-label={t("Status")}
          value={status}
          onChange={(v) => {
            setStatus(v);
            load(v, q).catch((e) => setError(e.message));
          }}
          options={[
            { value: "", label: t("All") },
            { value: "active", label: t("Active") },
            { value: "suspended", label: t("Suspended") },
            { value: "deleted", label: t("Deleted") },
          ]}
        />
        <Button
          className="w-full sm:w-auto"
          variant="outline"
          onClick={() => load().catch((e) => setError(e.message))}
        >
          {t("Filter")}
        </Button>
      </div>

      {error ? <Notice tone="warn">{error}</Notice> : null}

      <Card className="overflow-hidden">
        {tenants.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-5 w-5" aria-hidden />}
            title={t("No tenants match")}
            subtitle={t("Adjust filters or provision a new tenant below.")}
            action={
              <Button onClick={() => setProvisionOpen(true)}>
                {t("Provision tenant")}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b border-line text-start text-2xs text-ink-muted">
                  <th className="px-5 py-3 font-medium">{t("Organization")}</th>
                  <th className="px-3 py-3 font-medium">{t("Plan")}</th>
                  <th className="px-3 py-3 font-medium">{t("Seats")}</th>
                  <th className="px-3 py-3 font-medium">{t("Status")}</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="border-b border-line last:border-0"
                  >
                    <td className="px-5 py-3 align-middle">
                      <PersonCell
                        name={tenant.name}
                        subtitle={`${tenant.slug}.elevora.app`}
                      />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <Chip>{tenant.plan?.name ?? "—"}</Chip>
                    </td>
                    <td className="px-3 py-3 align-middle tabular text-ink">
                      {typeof tenant.seatsUsed === "number"
                        ? `${tenant.seatsUsed}${
                            tenant.plan?.seatLimit != null
                              ? `/${tenant.plan.seatLimit}`
                              : ""
                          }`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <StatusChip
                        status={tenant.status}
                        label={tenant.status}
                      />
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto"
                        >
                          <Link href={`/app/tenants/${tenant.id}`}>
                            {t("Details")}
                          </Link>
                        </Button>
                        {tenant.status === "active" ||
                        tenant.status === "suspended" ? (
                          <Button
                            size="sm"
                            className="w-full sm:w-auto"
                            disabled={busy}
                            onClick={() => {
                              setBusy(true);
                              setError(null);
                              void api<{
                                accessToken: string;
                                refreshToken: string;
                                user: import("@/lib/api").AuthUser;
                              }>("/v1/platform/enter-tenant", {
                                method: "POST",
                                body: JSON.stringify({
                                  tenantId: tenant.id,
                                  workspaceMode: "unlock_all",
                                }),
                              })
                                .then((res) => {
                                  setSession(
                                    res.accessToken,
                                    res.refreshToken,
                                    res.user,
                                  );
                                  window.location.href = "/app";
                                })
                                .catch((err) => {
                                  setError(
                                    err instanceof Error
                                      ? err.message
                                      : "Failed",
                                  );
                                  setBusy(false);
                                });
                            }}
                          >
                            {t("Open")}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Sheet open={provisionOpen} onOpenChange={setProvisionOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t("Provision tenant")}</SheetTitle>
            <SheetDescription>
              {t("Creates the workspace and first admin")}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <form className="grid gap-3" onSubmit={create}>
              {(
                [
                  ["name", t("Organization name")],
                  ["slug", t("Slug")],
                  ["adminName", t("Admin name")],
                  ["adminEmail", t("Admin email")],
                  ["adminPassword", t("Admin password")],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label>{label}</Label>
                  <Input
                    type={key === "adminPassword" ? "password" : "text"}
                    value={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    required
                  />
                </div>
              ))}
              <div className="space-y-1">
                <Label>{t("Plan (optional)")}</Label>
                <select
                  className="h-10 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-ink"
                  value={form.planCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, planCode: e.target.value }))
                  }
                >
                  <option value="">{t("Trial (default)")}</option>
                  <option value="enterprise">{t("Enterprise")}</option>
                  <option value="scale">Scale</option>
                  <option value="ops">Ops</option>
                  <option value="people">People</option>
                  <option value="field">Field</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setProvisionOpen(false)}
                >
                  {t("Cancel")}
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  {t("Provision")}
                </Button>
              </div>
            </form>
          </SheetBody>
        </SheetContent>
      </Sheet>

    </div>
  );
}
