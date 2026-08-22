"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  authType: string;
  hasAuth: boolean;
  hasWebhookSecret: boolean;
  baseUrl: string | null;
  syncMode: string;
  pollIntervalMinutes: number | null;
  connectorConfig: {
    entities?: Array<{
      sourceEntity: string;
      path: string;
      itemsPath?: string;
      idField?: string;
    }>;
  };
  lastSyncAt: string | null;
  lastError: string | null;
};

type Mapping = {
  id: string;
  sourceEntity: string;
  sourceField: string;
  targetEntity: string;
  targetField: string;
  transformType: string;
  isRequired: boolean;
};

type Run = {
  id: string;
  triggerType: string;
  status: string;
  startedAt: string;
  recordsReceived: number;
  recordsProcessed: number;
  recordsFailed: number;
  errorSummary: string | null;
};

type RawEvent = {
  id: string;
  sourceEventType: string;
  externalRecordId: string;
  processingStatus: string;
  errorDetails: string | null;
  receivedAt: string;
  payloadJson: Record<string, unknown>;
};

type LinkRow = {
  id: string;
  externalEmployeeKey?: string;
  externalBranchKey?: string;
  employeeId?: string | null;
  branchId?: string | null;
  matchMethod?: string;
};

const TABS = [
  "Overview",
  "Authentication",
  "Mapping",
  "Sync history",
  "Raw events",
  "CSV",
] as const;

export default function IntegrationDetailPage() {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [conn, setConn] = useState<Connection | null>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [canonical, setCanonical] = useState<Record<string, string[]>>({});
  const [runs, setRuns] = useState<Run[]>([]);
  const [events, setEvents] = useState<RawEvent[]>([]);
  const [links, setLinks] = useState<{ employees: LinkRow[]; branches: LinkRow[] }>({
    employees: [],
    branches: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [csv, setCsv] = useState("id,employee_email,status,completed_at,amount\n");
  const [sourceEntity, setSourceEntity] = useState("task");
  const [targetEntity, setTargetEntity] = useState("canonical_task_event");
  const [newMap, setNewMap] = useState({
    sourceEntity: "task",
    sourceField: "id",
    targetEntity: "canonical_task_event",
    targetField: "external_record_id",
  });

  async function load() {
    const [c, m, r, e, l] = await Promise.all([
      api<{ connection: Connection }>(`/v1/integrations/connections/${params.id}`),
      api<{ mappings: Mapping[]; canonicalFields: Record<string, string[]> }>(
        `/v1/integrations/connections/${params.id}/mappings`,
      ),
      api<{ runs: Run[] }>(`/v1/integrations/connections/${params.id}/sync-runs`),
      api<{ events: RawEvent[] }>(
        `/v1/integrations/connections/${params.id}/raw-events`,
      ),
      api<{ employees: LinkRow[]; branches: LinkRow[] }>(
        `/v1/integrations/connections/${params.id}/links`,
      ),
    ]);
    setConn(c.connection);
    setMappings(m.mappings);
    setCanonical(m.canonicalFields);
    setRuns(r.runs);
    setEvents(e.events);
    setLinks(l);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [params.id]);

  async function saveAuth(e: FormEvent) {
    e.preventDefault();
    try {
      await api(`/v1/integrations/connections/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          authType: apiKey ? "api_key" : conn?.authType,
          authConfig: apiKey ? { apiKey } : undefined,
          webhookSecret: webhookSecret || undefined,
          status: "active",
        }),
      });
      setApiKey("");
      setWebhookSecret("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function testFetch() {
    try {
      const res = await api<{ ok: boolean; error?: string; sample?: unknown }>(
        `/v1/integrations/connections/${params.id}/test`,
        { method: "POST" },
      );
      setTestResult(res.ok ? JSON.stringify(res.sample, null, 2) : res.error ?? "Failed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed");
    }
  }

  async function syncNow() {
    try {
      await api(`/v1/integrations/connections/${params.id}/sync`, {
        method: "POST",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    }
  }

  async function replay() {
    try {
      await api(`/v1/integrations/connections/${params.id}/replay`, {
        method: "POST",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Replay failed");
    }
  }

  async function saveMappings(e: FormEvent) {
    e.preventDefault();
    try {
      await api(`/v1/integrations/connections/${params.id}/mappings`, {
        method: "POST",
        body: JSON.stringify({
          mappings: [
            ...mappings.map((m) => ({
              sourceEntity: m.sourceEntity,
              sourceField: m.sourceField,
              targetEntity: m.targetEntity,
              targetField: m.targetField,
              transformType: m.transformType,
              isRequired: m.isRequired,
            })),
            newMap,
          ],
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function importCsv() {
    try {
      await api(`/v1/integrations/connections/${params.id}/csv/import`, {
        method: "POST",
        body: JSON.stringify({ csv, sourceEntity, targetEntity }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    }
  }

  if (!conn) {
    return <p className="text-muted-foreground">{error ?? "Loading…"}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/integrations" className="text-sm text-muted-foreground hover:underline">
          ← Integrations
        </Link>
        <h1 className="text-2xl font-semibold">{conn.name}</h1>
        <p className="text-sm text-muted-foreground">
          {conn.providerType} · {conn.syncMode} · {conn.status}
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t}
            variant={tab === t ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t)}
          >
            {t}
          </Button>
        ))}
      </div>

      {tab === "Overview" ? (
        <Card>
          <CardContent className="space-y-3 py-4 text-sm">
            <p>Base URL: {conn.baseUrl ?? "—"}</p>
            <p>
              Last sync:{" "}
              {conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString() : "never"}
            </p>
            {conn.lastError ? (
              <p className="text-destructive">{conn.lastError}</p>
            ) : null}
            <p>
              Webhook URL:{" "}
              <code className="text-xs">
                /v1/webhooks/integrations/{conn.id}
              </code>
            </p>
            <div className="flex gap-2">
              <Button onClick={testFetch}>Test fetch</Button>
              <Button variant="secondary" onClick={syncNow}>
                Sync now
              </Button>
              <Button variant="outline" onClick={replay}>
                Replay dead letters
              </Button>
            </div>
            {testResult ? (
              <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                {testResult}
              </pre>
            ) : null}
            <div>
              <p className="font-medium">Unmatched identity links</p>
              <ul className="text-xs text-muted-foreground">
                {links.employees
                  .filter((l) => !l.employeeId)
                  .map((l) => (
                    <li key={l.id}>employee key {l.externalEmployeeKey}</li>
                  ))}
                {links.branches
                  .filter((l) => !l.branchId)
                  .map((l) => (
                    <li key={l.id}>branch key {l.externalBranchKey}</li>
                  ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "Authentication" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Secrets</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={saveAuth}>
              <p className="text-xs text-muted-foreground">
                Auth stored: {conn.hasAuth ? "yes" : "no"} · Webhook secret:{" "}
                {conn.hasWebhookSecret ? "yes" : "no"}
              </p>
              <div className="space-y-1">
                <Label>API key</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Leave blank to keep existing"
                />
              </div>
              <div className="space-y-1">
                <Label>Webhook HMAC secret</Label>
                <Input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                />
              </div>
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {tab === "Mapping" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Field mapping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-1 text-sm">
              {mappings.map((m) => (
                <li key={m.id}>
                  {m.sourceEntity}.{m.sourceField} → {m.targetEntity}.{m.targetField}{" "}
                  <span className="text-muted-foreground">({m.transformType})</span>
                </li>
              ))}
            </ul>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={saveMappings}>
              <Input
                placeholder="Source entity"
                value={newMap.sourceEntity}
                onChange={(e) =>
                  setNewMap((s) => ({ ...s, sourceEntity: e.target.value }))
                }
              />
              <Input
                placeholder="Source field"
                value={newMap.sourceField}
                onChange={(e) =>
                  setNewMap((s) => ({ ...s, sourceField: e.target.value }))
                }
              />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={newMap.targetEntity}
                onChange={(e) =>
                  setNewMap((s) => ({
                    ...s,
                    targetEntity: e.target.value,
                    targetField: canonical[e.target.value]?.[0] ?? "",
                  }))
                }
              >
                {Object.keys(canonical).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={newMap.targetField}
                onChange={(e) =>
                  setNewMap((s) => ({ ...s, targetField: e.target.value }))
                }
              >
                {(canonical[newMap.targetEntity] ?? []).map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <Button type="submit">Add mapping</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {tab === "Sync history" ? (
        <div className="space-y-2">
          {runs.map((run) => (
            <Card key={run.id}>
              <CardContent className="py-3 text-sm">
                <p className="font-medium">
                  {run.triggerType} · {run.status}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(run.startedAt).toLocaleString()} · received{" "}
                  {run.recordsReceived} · processed {run.recordsProcessed} · failed{" "}
                  {run.recordsFailed}
                </p>
                {run.errorSummary ? (
                  <p className="text-xs text-destructive">{run.errorSummary}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "Raw events" ? (
        <div className="space-y-2">
          {events.map((ev) => (
            <Card key={ev.id}>
              <CardContent className="py-3 text-sm">
                <p className="font-medium">
                  {ev.sourceEventType} · {ev.externalRecordId} · {ev.processingStatus}
                </p>
                {ev.errorDetails ? (
                  <p className="text-xs text-destructive">{ev.errorDetails}</p>
                ) : null}
                <pre className="mt-2 max-h-32 overflow-auto text-xs text-muted-foreground">
                  {JSON.stringify(ev.payloadJson, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "CSV" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CSV import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                value={sourceEntity}
                onChange={(e) => setSourceEntity(e.target.value)}
                placeholder="Source entity"
              />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={targetEntity}
                onChange={(e) => setTargetEntity(e.target.value)}
              >
                {Object.keys(canonical).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              className="min-h-32 w-full rounded-md border border-input bg-background p-3 text-sm"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
            <Button onClick={importCsv}>Import</Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
