"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
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
  const [rows, setRows] = useState<Connection[]>([]);
  const [name, setName] = useState("");
  const [providerType, setProviderType] = useState("custom_api");
  const [syncMode, setSyncMode] = useState("polling");
  const [baseUrl, setBaseUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    try {
      await api("/v1/integrations/connections", {
        method: "POST",
        body: JSON.stringify({
          name,
          providerType,
          syncMode,
          baseUrl: baseUrl || null,
          authType: "none",
          status: "draft",
        }),
      });
      setName("");
      setBaseUrl("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect CMS, ERP, CRM, or custom APIs and map them to workforce analytics
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
          <p className="text-sm text-muted-foreground">No connections yet.</p>
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
                <option value="cms">CMS</option>
                <option value="crm">CRM</option>
                <option value="erp">ERP</option>
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
              <Button type="submit">Create</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
