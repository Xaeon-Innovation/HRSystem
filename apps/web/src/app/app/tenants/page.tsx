"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { api, setSession } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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

type PendingAction =
  | { type: "suspend" | "activate" | "delete"; tenant: Tenant }
  | null;

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    adminEmail: "",
    adminPassword: "",
    adminName: "",
    planCode: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function confirmAction() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      if (pending.type === "delete") {
        await api(`/v1/tenants/${pending.tenant.id}`, { method: "DELETE" });
      } else {
        await api(`/v1/tenants/${pending.tenant.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: pending.type === "suspend" ? "suspended" : "active",
          }),
        });
      }
      setPending(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const confirmTitle =
    pending?.type === "delete"
      ? `Soft-delete “${pending.tenant.name}”?`
      : pending?.type === "suspend"
        ? `Suspend “${pending.tenant.name}”?`
        : pending
          ? `Activate “${pending.tenant.name}”?`
          : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("Tenants")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Platform super-admin provisioning")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("Open a workspace to test all product pages.")}
        </p>
      </div>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3 text-sm text-muted-foreground">
          {t("Integrations Hub and Analytics live in the")}{" "}
          <span className="font-medium text-foreground">{t("tenant admin")}</span>{" "}
          {t("app, not here. Sign out and log in as that tenant&apos;s admin (e.g.")}{" "}
          <code>admin@cms.local</code>
          {t(", slug")}
          <code>{t("cms")}</code>
          {t(
            ") to configure connectors and dashboards. Connection health counts appear on each tenant detail page.",
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t("Search name or slug")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{t("All statuses")}</option>
          <option value="active">active</option>
          <option value="suspended">suspended</option>
          <option value="deleted">deleted</option>
        </select>
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
        {tenants.map((tenant) => (
          <Card key={tenant.id}>
            <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link
                  href={`/app/tenants/${tenant.id}`}
                  className="font-medium hover:underline"
                >
                  {tenant.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {tenant.slug}
                  {tenant.plan ? ` · ${tenant.plan.name}` : ""}
                  {tenant.subscription ? ` · ${tenant.subscription.status}` : ""}
                  {typeof tenant.seatsUsed === "number"
                    ? ` · ${tenant.seatsUsed}${tenant.plan?.seatLimit != null ? `/${tenant.plan.seatLimit}` : ""} seats`
                    : ""}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-xs uppercase">{tenant.status}</span>
                {tenant.status === "active" || tenant.status === "suspended" ? (
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
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
                            err instanceof Error ? err.message : "Failed",
                          );
                          setBusy(false);
                        });
                    }}
                    disabled={busy}
                  >
                    {t("Open workspace")}
                  </Button>
                ) : null}
                {tenant.status === "active" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setPending({ type: "suspend", tenant })}
                  >
                    {t("Suspend")}
                  </Button>
                ) : tenant.status !== "deleted" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setPending({ type: "activate", tenant })}
                  >
                    {t("Activate")}
                  </Button>
                ) : null}
                {tenant.status !== "deleted" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setPending({ type: "delete", tenant })}
                  >
                    {t("Soft delete")}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Provision tenant")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={create}>
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
            <div className="space-y-1 md:col-span-2">
              <Label>{t("Plan (optional)")}</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-xs"
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
              <p className="text-xs text-muted-foreground">
                {t(
                  "Enterprise skips Polar checkout and activates immediately. Customize modules on the tenant page.",
                )}
              </p>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" className="w-full sm:w-auto">
                {t("Create tenant")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(pending)}
        title={confirmTitle}
        description={
          pending?.type === "delete"
            ? "This marks the tenant deleted. Logins will be blocked."
            : pending?.type === "suspend"
              ? "Users in this tenant will not be able to sign in until reactivated."
              : "This restores login access. It does not create a Polar subscription."
        }
        confirmLabel={
          pending?.type === "delete"
            ? "Soft delete"
            : pending?.type === "suspend"
              ? "Suspend"
              : "Activate"
        }
        variant={
          pending?.type === "activate" ? "default" : "destructive"
        }
        busy={busy}
        onConfirm={confirmAction}
        onOpenChange={(open) => {
          if (!open && !busy) setPending(null);
        }}
      />
    </div>
  );
}
