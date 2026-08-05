"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
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
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <p className="text-sm text-muted-foreground">
          Platform super-admin provisioning
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="space-y-2">
        {tenants.map((t) => (
          <Card key={t.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase">{t.status}</span>
                {t.status === "active" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      api(`/v1/tenants/${t.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: "suspended" }),
                      }).then(load)
                    }
                  >
                    Suspend
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      api(`/v1/tenants/${t.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: "active" }),
                      }).then(load)
                    }
                  >
                    Activate
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provision tenant</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={create}>
            {(
              [
                ["name", "Organization name"],
                ["slug", "Slug"],
                ["adminName", "Admin name"],
                ["adminEmail", "Admin email"],
                ["adminPassword", "Admin password"],
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
              <Button type="submit">Create tenant</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
