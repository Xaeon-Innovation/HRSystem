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
};

export default function IntegrationsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Connection[]>([]);
  const [name, setName] = useState("");
  const [providerType, setProviderType] = useState("custom_api");
  const [syncMode, setSyncMode] = useState("polling");
  const [baseUrl, setBaseUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const data = await api<{ connections: Connection[] }>(
      "/v1/integrations/connections",
    );
    setRows(data.connections);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

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
          Connect a custom REST CMS, ERP, CRM, or API and map records into workforce
          analytics. CMS / CRM / ERP use the same Custom REST path — there is no
          separate vendor plug-in.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Create a connection with the HTTPS API root (Base URL).</li>
            <li>Add resource endpoints (paths for jobs, tasks, visits, sales).</li>
            <li>Set authentication (API key, Bearer, or Basic).</li>
            <li>Map JSON fields to canonical events and an employee identity.</li>
            <li>Test fetch, Sync now, then open Analytics after materialization.</li>
          </ol>
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
                    {row.providerType} · {row.syncMode} · last sync{" "}
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
          <Card>
            <CardContent className="space-y-2 py-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No connections yet</p>
              <p>
                Start below with a name and Base URL. You will configure endpoints,
                auth, and field mappings on the next screen — a URL alone does not
                fetch data.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New connection</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={create}>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
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
                <option value="cms">CMS (via Custom REST)</option>
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
              <p className="text-xs text-muted-foreground">
                HTTPS API root only — you will add resource paths (e.g. /jobs) next.
              </p>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create and continue"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
