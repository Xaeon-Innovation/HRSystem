"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    adminEmail: "",
    adminPassword: "",
    adminName: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await api<{ tenants: Tenant[] }>("/v1/tenants");
    setTenants(data.tenants);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/v1/tenants", { method: "POST", body: JSON.stringify(form) });
      setForm({
        name: "",
        slug: "",
        adminEmail: "",
        adminPassword: "",
        adminName: "",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("Tenants")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Platform super-admin provisioning")}</p>
      </div>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3 text-sm text-muted-foreground">
          {t("Integrations Hub and Analytics live in the")}{" "}
          <span className="font-medium text-foreground">{t("tenant admin")}</span> {t("app, not here. Sign out and log in as that tenant&apos;s admin (e.g.")}{" "}
          <code>admin@cms.local</code>{t(", slug")}<code>{t("cms")}</code>{t(") to configure connectors and dashboards. Connection health counts appear on each tenant detail page.")}</CardContent>
      </Card>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="space-y-2">
        {tenants.map((tenant) => (
          <Card key={tenant.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
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
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase">{tenant.status}</span>
                {tenant.status === "active" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      api(`/v1/tenants/${tenant.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: "suspended" }),
                      }).then(load)
                    }
                  >
                    {t("Suspend")}</Button>
                ) : tenant.status !== "deleted" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      api(`/v1/tenants/${tenant.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: "active" }),
                      }).then(load)
                    }
                  >
                    {t("Activate")}</Button>
                ) : null}
                {tenant.status !== "deleted" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      api(`/v1/tenants/${tenant.id}`, { method: "DELETE" }).then(load)
                    }
                  >
                    {t("Soft delete")}</Button>
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
            <div className="md:col-span-2">
              <Button type="submit">{t("Create tenant")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
