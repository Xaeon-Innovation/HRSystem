"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Connection = {
  id: string;
  name: string;
  providerType: string;
  status: string;
  syncMode: string;
  lastSyncAt: string | null;
  lastError: string | null;
  connectorConfig?: { preset?: string };
};

const CMS_DEFAULT_BASE = "https://api.creativeintelligent.ae/api/v1";

export default function IntegrationsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Connection[]>([]);
  const [name, setName] = useState("");
  const [providerType, setProviderType] = useState("custom_api");
  const [syncMode, setSyncMode] = useState("polling");
  const [baseUrl, setBaseUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [cmsPhone, setCmsPhone] = useState("");
  const [cmsPassword, setCmsPassword] = useState("");
  const [cmsBaseUrl, setCmsBaseUrl] = useState(CMS_DEFAULT_BASE);
  const [cmsAdvanced, setCmsAdvanced] = useState(false);
  const [cmsConnecting, setCmsConnecting] = useState(false);

  async function load() {
    const data = await api<{ connections: Connection[] }>(
      "/v1/integrations/connections",
    );
    setRows(data.connections);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function connectCmsGoals(e: FormEvent) {
    e.preventDefault();
    setCmsConnecting(true);
    setError(null);
    try {
      const res = await api<{ connection: Connection }>(
        "/v1/integrations/connections",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Creative Intelligent CMS Goals",
            providerType: "cms",
            preset: "creative_cms_goals",
            baseUrl: cmsBaseUrl.trim() || CMS_DEFAULT_BASE,
            authConfig: {
              username: cmsPhone.trim(),
              password: cmsPassword,
            },
          }),
        },
      );
      router.push(`/app/integrations/${res.connection.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect CMS");
      setCmsConnecting(false);
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await api<{ connection: Connection }>(
        "/v1/integrations/connections",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            providerType,
            syncMode,
            baseUrl: baseUrl || null,
            authType: "none",
            status: "draft",
          }),
        },
      );
      router.push(`/app/integrations/${res.connection.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect your CMS so employee goals flow into Analytics — no API wiring
          required for Creative Intelligent CMS.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card className="border-emerald-200/70 bg-emerald-50/30">
        <CardHeader>
          <CardTitle className="text-base">
            Connect Creative Intelligent CMS (Goals)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={connectCmsGoals}>
            <p className="md:col-span-2 text-sm text-muted-foreground">
              Enter a CMS <strong>admin</strong> or <strong>team_leader</strong>{" "}
              service account. We log in, refresh tokens automatically, and set
              endpoints plus field mappings for you.
            </p>
            <div className="space-y-1">
              <Label>Service account phone</Label>
              <Input
                value={cmsPhone}
                onChange={(e) => setCmsPhone(e.target.value)}
                placeholder="+9715XXXXXXXX"
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input
                type="password"
                value={cmsPassword}
                onChange={(e) => setCmsPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="button"
                className="text-xs text-muted-foreground underline hover:text-foreground"
                onClick={() => setCmsAdvanced((v) => !v)}
              >
                {cmsAdvanced ? "Hide advanced" : "Advanced (base URL)"}
              </button>
            </div>
            {cmsAdvanced ? (
              <div className="space-y-1 md:col-span-2">
                <Label>Base URL</Label>
                <Input
                  type="url"
                  value={cmsBaseUrl}
                  onChange={(e) => setCmsBaseUrl(e.target.value)}
                />
              </div>
            ) : null}
            <p className="md:col-span-2 text-xs text-muted-foreground">
              For Analytics attribution, HR employees should use the same CMS
              employee UUID as their external ID.
            </p>
            <div className="md:col-span-2">
              <Button type="submit" disabled={cmsConnecting}>
                {cmsConnecting ? "Connecting…" : "Connect CMS Goals"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {rows.map((row) => (
          <Link key={row.id} href={`/app/integrations/${row.id}`}>
            <Card>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.connectorConfig?.preset === "creative_cms_goals"
                      ? "CMS Goals"
                      : row.providerType}{" "}
                    · {row.syncMode} · last sync{" "}
                    {row.lastSyncAt
                      ? new Date(row.lastSyncAt).toLocaleString()
                      : "never"}
                  </p>
                  {row.lastError ? (
                    <p className="text-xs text-destructive">{row.lastError}</p>
                  ) : null}
                </div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {row.status}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No connections yet — use Connect CMS Goals above.
          </p>
        ) : null}
      </div>

      <div>
        <button
          type="button"
          className="text-sm text-muted-foreground underline hover:text-foreground"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced
            ? "Hide custom / advanced connection"
            : "Custom REST / advanced connection"}
        </button>
      </div>

      {showAdvanced ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custom REST connection</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={create}>
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Provider</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={providerType}
                  onChange={(e) => setProviderType(e.target.value)}
                >
                  <option value="custom_api">Custom REST API</option>
                  <option value="webhook">Webhook</option>
                  <option value="csv">CSV import</option>
                  <option value="crm">CRM (via Custom REST)</option>
                  <option value="erp">ERP (via Custom REST)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Sync mode</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={syncMode}
                  onChange={(e) => setSyncMode(e.target.value)}
                >
                  <option value="polling">Polling</option>
                  <option value="webhook">Webhook</option>
                  <option value="manual">Manual / CSV</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Base URL</Label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.example.com"
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating…" : "Create and continue"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
