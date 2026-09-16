"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { API_URL, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n";

type EntityConfig = {
  sourceEntity: string;
  path: string;
  itemsPath?: string;
  idField?: string;
  eventType?: string;
};

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
    entities?: EntityConfig[];
    preset?: string;
    authStrategy?: string;
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
  "Endpoints",
  "Authentication",
  "Mapping",
  "Sync history",
  "Raw events",
  "CSV",
] as const;

type Tab = (typeof TABS)[number];

const IDENTITY_TARGETS = new Set(["employee_email", "employee_external_key", "employee_phone"]);

const emptyEntity = (): EntityConfig => ({
  sourceEntity: "job",
  path: "/jobs",
  itemsPath: "",
  idField: "id",
  eventType: "",
});

export default function IntegrationDetailPage() {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("Overview");
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
  const [authType, setAuthType] = useState("none");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyHeader, setApiKeyHeader] = useState("X-API-Key");
  const [bearerToken, setBearerToken] = useState("");
  const [basicUser, setBasicUser] = useState("");
  const [basicPass, setBasicPass] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testOk, setTestOk] = useState(false);
  const [csv, setCsv] = useState("id,employee_email,status,completed_at,amount\n");
  const [sourceEntity, setSourceEntity] = useState("task");
  const [targetEntity, setTargetEntity] = useState("canonical_task_event");
  const [entities, setEntities] = useState<EntityConfig[]>([emptyEntity()]);
  const [baseUrl, setBaseUrl] = useState("");
  const [pollInterval, setPollInterval] = useState("15");
  const [syncMode, setSyncMode] = useState("polling");
  const [saving, setSaving] = useState(false);
  const [newMap, setNewMap] = useState({
    sourceEntity: "job",
    sourceField: "id",
    targetEntity: "canonical_job_event",
    targetField: "external_record_id",
  });
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [mappingSaving, setMappingSaving] = useState(false);
  const [advancedCustomize, setAdvancedCustomize] = useState(false);
  const [cmsPhone, setCmsPhone] = useState("");
  const [cmsPassword, setCmsPassword] = useState("");

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
    setAuthType(c.connection.authType || "none");
    setSyncMode(c.connection.syncMode || "polling");
    setBaseUrl(c.connection.baseUrl ?? "");
    setPollInterval(String(c.connection.pollIntervalMinutes ?? 15));
    const ents = c.connection.connectorConfig?.entities ?? [];
    setEntities(
      ents.length
        ? ents.map((ent) => ({
            sourceEntity: ent.sourceEntity,
            path: ent.path,
            itemsPath: ent.itemsPath ?? "",
            idField: ent.idField ?? "id",
            eventType: ent.eventType ?? "",
          }))
        : [emptyEntity()],
    );
    if (ents[0]?.sourceEntity) {
      setNewMap((s) => ({ ...s, sourceEntity: ents[0].sourceEntity }));
      setSourceEntity(ents[0].sourceEntity);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [params.id]);

  const hasIdentityMapping = useMemo(
    () => mappings.some((m) => IDENTITY_TARGETS.has(m.targetField)),
    [mappings],
  );

  const deadLetterCount = useMemo(
    () => events.filter((ev) => ev.processingStatus === "dead_letter").length,
    [events],
  );

  const checklist = useMemo(() => {
    if (!conn) return [];
    const entityCount = conn.connectorConfig?.entities?.length ?? 0;
    const needsEndpoints =
      conn.syncMode === "polling" || conn.syncMode === "hybrid";
    const endpointsDone = needsEndpoints
      ? entityCount > 0
      : true;
    const authDone = conn.hasAuth || conn.authType === "none";
    const mappingsDone = mappings.length > 0;
    const syncedOrTested = Boolean(conn.lastSyncAt) || testOk;
    return [
      {
        id: "baseUrl",
        label: t("Base URL"),
        done: Boolean(conn.baseUrl),
        tab: "Overview" as Tab,
        hint: t("Set the HTTPS API root on the Endpoints tab and save."),
      },
      {
        id: "endpoints",
        label: t("Endpoints"),
        done: endpointsDone,
        tab: "Endpoints" as Tab,
        hint: needsEndpoints
          ? "Add at least one resource path (e.g. /jobs) so polling knows what to fetch."
          : "Webhook / manual mode, endpoints optional.",
      },
      {
        id: "auth",
        label: t("Authentication"),
        done: authDone,
        tab: "Authentication" as Tab,
        hint: conn.authType === "none" && !conn.hasAuth
          ? "Public APIs can stay on None. Otherwise add API key, Bearer, or Basic."
          : "Credentials stored.",
      },
      {
        id: "mappings",
        label: t("Field mappings"),
        done: mappingsDone && hasIdentityMapping,
        tab: "Mapping" as Tab,
        hint: !mappingsDone
          ? "Without mappings, synced records become dead letters."
          : !hasIdentityMapping
            ? "Map employee_email or employee_external_key so analytics can attribute records."
            : "Mappings ready.",
      },
      {
        id: "tested",
        label: t("Tested or synced"),
        done: syncedOrTested,
        tab: "Overview" as Tab,
        hint: t("Use Test fetch, then Sync now."),
      },
      {
        id: "active",
        label: t("Active"),
        done: conn.status === "active",
        tab: "Overview" as Tab,
        hint: t("Activate when endpoints and mappings look correct."),
      },
    ];
  }, [conn, mappings.length, hasIdentityMapping, testOk]);

  const progress = useMemo(() => {
    const doneCount = checklist.filter((s) => s.done).length;
    const total = checklist.length;
    const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);
    return {
      doneCount,
      total,
      pct,
      allDone: total > 0 && doneCount === total,
    };
  }, [checklist]);

  const webhookUrl = `${API_URL.replace(/\/$/, "")}/v1/webhooks/integrations/${params.id}`;

  async function patchConnection(body: Record<string, unknown>) {
    await api(`/v1/integrations/connections/${params.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    await load();
  }

  async function saveAuth(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const authConfig: Record<string, string> = {};
      if (authType === "api_key" && apiKey) {
        authConfig.apiKey = apiKey;
        authConfig.apiKeyHeader = apiKeyHeader || "X-API-Key";
      }
      if (authType === "bearer" && bearerToken) {
        authConfig.bearerToken = bearerToken;
      }
      if (authType === "basic" && basicUser && basicPass) {
        authConfig.username = basicUser;
        authConfig.password = basicPass;
      }
      const payload: Record<string, unknown> = { authType };
      if (Object.keys(authConfig).length) payload.authConfig = authConfig;
      if (webhookSecret) payload.webhookSecret = webhookSecret;
      await patchConnection(payload);
      setApiKey("");
      setBearerToken("");
      setBasicPass("");
      setWebhookSecret("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveEndpoints(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const cleaned = entities
        .filter((ent) => ent.sourceEntity.trim() && ent.path.trim())
        .map((ent) => ({
          sourceEntity: ent.sourceEntity.trim(),
          path: ent.path.trim(),
          ...(ent.itemsPath?.trim() ? { itemsPath: ent.itemsPath.trim() } : {}),
          ...(ent.idField?.trim() ? { idField: ent.idField.trim() } : {}),
          ...(ent.eventType?.trim() ? { eventType: ent.eventType.trim() } : {}),
        }));
      const interval = Number(pollInterval);
      const trimmedBase = baseUrl.trim();
      await patchConnection({
        baseUrl: trimmedBase || null,
        syncMode,
        pollIntervalMinutes:
          Number.isFinite(interval) && interval >= 5 ? interval : 15,
        connectorConfig: {
          ...(conn?.connectorConfig?.preset
            ? {
                preset: conn.connectorConfig.preset,
                authStrategy: conn.connectorConfig.authStrategy,
              }
            : {}),
          entities: cleaned,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(status: "active" | "paused" | "draft") {
    setError(null);
    try {
      await patchConnection({ status });
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
      setTestOk(Boolean(res.ok));
      setTestResult(res.ok ? JSON.stringify(res.sample, null, 2) : res.error ?? "Failed");
    } catch (err) {
      setTestOk(false);
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

  async function persistMappings(next: Array<{
    sourceEntity: string;
    sourceField: string;
    targetEntity: string;
    targetField: string;
    transformType?: string;
    isRequired?: boolean;
  }>) {
    await api(`/v1/integrations/connections/${params.id}/mappings`, {
      method: "POST",
      body: JSON.stringify({
        mappings: next.map((m) => ({
          sourceEntity: m.sourceEntity,
          sourceField: m.sourceField,
          targetEntity: m.targetEntity,
          targetField: m.targetField,
          transformType: m.transformType ?? "direct",
          isRequired: m.isRequired ?? false,
        })),
      }),
    });
    await load();
  }

  async function saveMappings(e: FormEvent) {
    e.preventDefault();
    setMappingSaving(true);
    setError(null);
    try {
      const payload = {
        sourceEntity: newMap.sourceEntity,
        sourceField: newMap.sourceField,
        targetEntity: newMap.targetEntity,
        targetField: newMap.targetField,
        transformType: "direct",
        isRequired: false,
      };
      if (editingMappingId) {
        await persistMappings(
          mappings.map((m) =>
            m.id === editingMappingId
              ? { ...payload, transformType: m.transformType, isRequired: m.isRequired }
              : {
                  sourceEntity: m.sourceEntity,
                  sourceField: m.sourceField,
                  targetEntity: m.targetEntity,
                  targetField: m.targetField,
                  transformType: m.transformType,
                  isRequired: m.isRequired,
                },
          ),
        );
        setEditingMappingId(null);
      } else {
        await persistMappings([
          ...mappings.map((m) => ({
            sourceEntity: m.sourceEntity,
            sourceField: m.sourceField,
            targetEntity: m.targetEntity,
            targetField: m.targetField,
            transformType: m.transformType,
            isRequired: m.isRequired,
          })),
          payload,
        ]);
      }
      setNewMap((s) => ({
        ...s,
        sourceField: "id",
        targetField: canonical[s.targetEntity]?.[0] ?? "external_record_id",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setMappingSaving(false);
    }
  }

  async function removeMapping(id: string) {
    setMappingSaving(true);
    setError(null);
    try {
      if (editingMappingId === id) {
        setEditingMappingId(null);
      }
      await persistMappings(
        mappings
          .filter((m) => m.id !== id)
          .map((m) => ({
            sourceEntity: m.sourceEntity,
            sourceField: m.sourceField,
            targetEntity: m.targetEntity,
            targetField: m.targetField,
            transformType: m.transformType,
            isRequired: m.isRequired,
          })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setMappingSaving(false);
    }
  }

  function startEditMapping(m: Mapping) {
    setEditingMappingId(m.id);
    setNewMap({
      sourceEntity: m.sourceEntity,
      sourceField: m.sourceField,
      targetEntity: m.targetEntity,
      targetField: m.targetField,
    });
  }

  function cancelEditMapping() {
    setEditingMappingId(null);
    const firstEntity =
      conn?.connectorConfig?.entities?.[0]?.sourceEntity ?? "job";
    setNewMap({
      sourceEntity: firstEntity,
      sourceField: "id",
      targetEntity: "canonical_job_event",
      targetField: canonical.canonical_job_event?.[0] ?? "external_record_id",
    });
  }

  async function saveCmsCredentials(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await patchConnection({
        authType: "bearer",
        authConfig: {
          username: cmsPhone.trim(),
          ...(cmsPassword ? { password: cmsPassword } : {}),
        },
      });
      setCmsPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update CMS login");
    } finally {
      setSaving(false);
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
    return <p className="text-muted-foreground">{error ?? t("Loading…")}</p>;
  }

  const configuredEntities = conn.connectorConfig?.entities ?? [];
  const isCmsGoalsPreset =
    conn.connectorConfig?.preset === "creative_cms_goals" ||
    conn.connectorConfig?.authStrategy === "cms_jwt";
  const isHubSpotPreset =
    conn.connectorConfig?.preset === "hubspot_crm" ||
    (conn.connectorConfig?.authStrategy === "oauth2" &&
      conn.providerType === "crm");
  const sourceEntityOptions = configuredEntities.map((e) => e.sourceEntity);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/integrations" className="text-sm text-muted-foreground hover:underline">
          {t("← Integrations")}</Link>
        <h1 className="text-2xl font-semibold">{conn.name}</h1>
        <p className="text-sm text-muted-foreground">
          {isCmsGoalsPreset
            ? t("CMS Goals")
            : isHubSpotPreset
              ? t("HubSpot CRM")
              : conn.providerType}{" "}
          · {conn.syncMode} · {conn.status}
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {isCmsGoalsPreset ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
          {t("Connected to CMS Goals, tokens refresh automatically. Use")}{" "}
          <strong>{t("Sync now")}</strong> {t("to pull the latest goals. Open Authentication only if the CMS password changes.")}</p>
      ) : null}
      {isHubSpotPreset ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
          {t("Connected to HubSpot CRM, tokens refresh automatically. Use")}{" "}
          <strong>{t("Sync now")}</strong>{" "}
          {t("to pull the latest deals. Reconnect OAuth if access expires.")}
        </p>
      ) : null}
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

      {tab === t("Overview") ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("Setup progress")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-foreground">
                    {progress.doneCount} of {progress.total} {t("complete")}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {progress.pct}%
                  </span>
                </div>
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={progress.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t("Setup progress")}
                >
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
                    style={{ width: `${progress.pct}%` }}
                  />
                </div>
                {progress.allDone ? (
                  <p className="text-sm text-emerald-700">
                    {t("Setup complete, you can sync and use Analytics.")}</p>
                ) : null}
              </div>
              <ul className="space-y-2 text-sm">
                {checklist.map((step) => (
                  <li
                    key={step.id}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border px-3 py-2.5 transition-colors sm:flex-row sm:items-center sm:justify-between",
                      step.done
                        ? "border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/40"
                        : "border-amber-200/60 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/40",
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-2.5">
                      {step.done ? (
                        <CheckCircle2
                          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                          aria-hidden
                        />
                      ) : (
                        <CircleAlert
                          className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
                          aria-hidden
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{step.label}</p>
                        {!step.done ? (
                          <p className="text-xs text-muted-foreground">{step.hint}</p>
                        ) : null}
                      </div>
                    </div>
                    {!step.done ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 self-start sm:self-center"
                        onClick={() => setTab(step.tab)}
                      >
                        {t("Go to")}{step.tab}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {deadLetterCount > 0 ? (
                <p className="text-sm text-destructive">
                  {deadLetterCount} {t("record(s) could not be processed")}{isCmsGoalsPreset
                    ? t(". Open Mapping (advanced) or check that HR employees use the CMS UUID as external ID.")
                    : t(". Usually missing field mappings or a mismatched source entity, fix under Mapping, then Replay.")}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 py-4 text-sm">
              <p>
                {t("Base URL:")}{conn.baseUrl ?? "-"}{" "}
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                  onClick={() => setTab("Endpoints")}
                >
                  {t("Edit")}</button>
              </p>
              <div>
                <p className="font-medium">{t("Configured endpoints")}</p>
                {configuredEntities.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("None yet, add paths on the Endpoints tab before Sync.")}</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                    {configuredEntities.map((ent) => (
                      <li key={`${ent.sourceEntity}-${ent.path}`}>
                        {ent.sourceEntity}: {ent.path}
                        {ent.itemsPath ? ` (items: ${ent.itemsPath})` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p>
                {t("Last sync:")}{" "}
                {conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString() : "never"}
              </p>
              {conn.lastError ? (
                <p className="text-destructive">{conn.lastError}</p>
              ) : null}
              <p>
                {t("Webhook URL:")}{" "}
                <code className="break-all text-xs">{webhookUrl}</code>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={testFetch}>{t("Test fetch")}</Button>
                <Button variant="secondary" onClick={syncNow}>
                  {t("Sync now")}</Button>
                <Button variant="outline" onClick={replay}>
                  {t("Replay dead letters")}</Button>
                {conn.status === "active" ? (
                  <Button variant="outline" onClick={() => setStatus("paused")}>
                    {t("Pause")}</Button>
                ) : (
                  <Button onClick={() => setStatus("active")}>{t("Activate")}</Button>
                )}
              </div>
              {testResult ? (
                <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {testResult}
                </pre>
              ) : null}
              <div>
                <p className="font-medium">{t("Unmatched identity links")}</p>
                <ul className="text-xs text-muted-foreground">
                  {links.employees
                    .filter((l) => !l.employeeId)
                    .map((l) => (
                      <li key={l.id}>{t("employee key")}{l.externalEmployeeKey}</li>
                    ))}
                  {links.branches
                    .filter((l) => !l.branchId)
                    .map((l) => (
                      <li key={l.id}>{t("branch key")}{l.externalBranchKey}</li>
                    ))}
                  {links.employees.every((l) => l.employeeId) &&
                  links.branches.every((l) => l.branchId) ? (
                    <li>{t("None")}</li>
                  ) : null}
                </ul>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isCmsGoalsPreset
                    ? t("Unmatched keys mean HR employees are missing the CMS UUID as external ID.")
                    : t("Prefer mapping employee_email so records match HR employees automatically. Unmatched keys will not appear in Analytics.")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === t("Endpoints") ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("API endpoints")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            { (isCmsGoalsPreset || isHubSpotPreset) && !advancedCustomize ? (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  {isHubSpotPreset
                    ? t("Endpoints are preconfigured for HubSpot CRM. You normally do not need to change them.")
                    : t("Endpoints are preconfigured for CMS Goals. You normally do not need to change them.")}</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {configuredEntities.map((ent) => (
                    <li key={`${ent.sourceEntity}-${ent.path}`}>
                      <span className="font-medium text-foreground">
                        {ent.sourceEntity}
                      </span>
                      : {ent.path}
                      {ent.itemsPath ? ` · items ${ent.itemsPath}` : ""}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  {t("Base URL:")}{conn.baseUrl ?? "-"} {t("· Poll every")}{" "}
                  {conn.pollIntervalMinutes ?? 15} {t("minutes")}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAdvancedCustomize(true)}
                >
                  {t("Customize (advanced)")}</Button>
              </div>
            ) : (
            <form className="space-y-4" onSubmit={saveEndpoints}>
              {isCmsGoalsPreset ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-amber-700">
                    {t("Advanced mode, changes can break the CMS Goals sync.")}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdvancedCustomize(false)}
                  >
                    {t("Done")}</Button>
                </div>
              ) : null}
              <p className="text-sm text-muted-foreground">
                {t("Base URL is the API root. Add one row per JSON collection the platform should poll, for example source entity")}<code>{t("job")}</code>{t(", path")}{" "}
                <code>/api/jobs</code>{t(", and")}<code>itemsPath</code>{" "}
                <code>{t("data")}</code> {t("if the array is nested under")}{" "}
                <code>{`{ "data": [ ... ] }`}</code>.
              </p>
              <div className="space-y-1">
                <Label>{t("Base URL")}</Label>
                <Input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.example.com/api/v1"
                />
                <p className="text-xs text-muted-foreground">
                  {t("HTTPS API root only, resource paths below are appended to this.")}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t("Sync mode")}</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={syncMode}
                    onChange={(e) => setSyncMode(e.target.value)}
                  >
                    <option value="polling">{t("Polling")}</option>
                    <option value="webhook">{t("Webhook")}</option>
                    <option value="manual">{t("Manual / CSV")}</option>
                    <option value="hybrid">{t("Hybrid")}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>{t("Poll interval (minutes)")}</Label>
                  <Input
                    type="number"
                    min={5}
                    max={1440}
                    value={pollInterval}
                    onChange={(e) => setPollInterval(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{t("Minimum 5 minutes.")}</p>
                </div>
              </div>
              <div className="space-y-3">
                {entities.map((ent, idx) => (
                  <div
                    key={idx}
                    className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-2"
                  >
                    <div className="space-y-1">
                      <Label>{t("Source entity")}</Label>
                      <Input
                        value={ent.sourceEntity}
                        onChange={(e) =>
                          setEntities((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, sourceEntity: e.target.value } : r,
                            ),
                          )
                        }
                        placeholder={t("job")}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("Path")}</Label>
                      <Input
                        value={ent.path}
                        onChange={(e) =>
                          setEntities((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, path: e.target.value } : r,
                            ),
                          )
                        }
                        placeholder="/jobs"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("Items path (optional)")}</Label>
                      <Input
                        value={ent.itemsPath ?? ""}
                        onChange={(e) =>
                          setEntities((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, itemsPath: e.target.value } : r,
                            ),
                          )
                        }
                        placeholder={t("data.items")}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("ID field")}</Label>
                      <Input
                        value={ent.idField ?? "id"}
                        onChange={(e) =>
                          setEntities((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, idField: e.target.value } : r,
                            ),
                          )
                        }
                        placeholder="id"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label>{t("Event type override (optional)")}</Label>
                      <Input
                        value={ent.eventType ?? ""}
                        onChange={(e) =>
                          setEntities((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, eventType: e.target.value } : r,
                            ),
                          )
                        }
                        placeholder={t("Defaults to source entity")}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEntities((rows) => rows.filter((_, i) => i !== idx))
                        }
                        disabled={entities.length <= 1}
                      >
                        {t("Remove row")}</Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEntities((rows) => [...rows, emptyEntity()])}
                >
                  {t("Add endpoint")}</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? t("Saving…") : t("Save endpoints")}
                </Button>
              </div>
            </form>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === t("Authentication") ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isCmsGoalsPreset
                ? t("CMS service account")
                : isHubSpotPreset
                  ? t("HubSpot OAuth")
                  : t("Secrets")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isCmsGoalsPreset ? (
              <form className="grid gap-3" onSubmit={saveCmsCredentials}>
                <p className="text-sm text-muted-foreground">
                  {t("Tokens refresh automatically. Update phone/password only if the CMS service account changes or sync starts failing.")}</p>
                <div className="space-y-1">
                  <Label>{t("Phone")}</Label>
                  <Input
                    value={cmsPhone}
                    onChange={(e) => setCmsPhone(e.target.value)}
                    placeholder={t("+9715XXXXXXXX")}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("Password")}</Label>
                  <Input
                    type="password"
                    value={cmsPassword}
                    onChange={(e) => setCmsPassword(e.target.value)}
                    placeholder={t("Enter to update stored password")}
                    required
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? t("Saving…") : t("Update CMS login")}
                </Button>
              </form>
            ) : isHubSpotPreset ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t(
                    "Tokens refresh automatically. To reconnect, start Connect HubSpot CRM again from Integrations.",
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Auth stored:")}
                  {conn.hasAuth ? "yes" : "no"}
                </p>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href="/app/integrations">{t("Back to Integrations")}</Link>
                </Button>
              </div>
            ) : (
            <form className="grid gap-3" onSubmit={saveAuth}>
              <p className="text-xs text-muted-foreground">
                {t("Auth stored:")}{conn.hasAuth ? "yes" : "no"} {t("· Webhook secret:")}{" "}
                {conn.hasWebhookSecret ? "yes" : "no"}{t(". Saving credentials does not activate the connection, use Activate on Overview when ready.")}</p>
              <div className="space-y-1">
                <Label>{t("Auth type")}</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={authType}
                  onChange={(e) => setAuthType(e.target.value)}
                >
                  <option value="none">{t("None (public API)")}</option>
                  <option value="api_key">{t("API key")}</option>
                  <option value="bearer">{t("Bearer token")}</option>
                  <option value="basic">{t("Basic username / password")}</option>
                </select>
              </div>
              {authType === "api_key" ? (
                <>
                  <div className="space-y-1">
                    <Label>{t("API key")}</Label>
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={t("Leave blank to keep existing")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("API key header")}</Label>
                    <Input
                      value={apiKeyHeader}
                      onChange={(e) => setApiKeyHeader(e.target.value)}
                      placeholder={t("X-API-Key")}
                    />
                  </div>
                </>
              ) : null}
              {authType === "bearer" ? (
                <div className="space-y-1">
                  <Label>{t("Bearer token")}</Label>
                  <Input
                    type="password"
                    value={bearerToken}
                    onChange={(e) => setBearerToken(e.target.value)}
                    placeholder={t("Leave blank to keep existing")}
                  />
                </div>
              ) : null}
              {authType === "basic" ? (
                <>
                  <div className="space-y-1">
                    <Label>{t("Username")}</Label>
                    <Input
                      value={basicUser}
                      onChange={(e) => setBasicUser(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("Password")}</Label>
                    <Input
                      type="password"
                      value={basicPass}
                      onChange={(e) => setBasicPass(e.target.value)}
                      placeholder={t("Leave blank to keep existing")}
                    />
                  </div>
                </>
              ) : null}
              <div className="space-y-1">
                <Label>{t("Webhook HMAC secret (optional)")}</Label>
                <Input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("Webhook URL:")}<code className="break-all">{webhookUrl}</code>
              </p>
              <Button type="submit" disabled={saving}>
                {saving ? t("Saving…") : t("Save authentication")}
              </Button>
            </form>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === t("Mapping") ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Field mapping")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCmsGoalsPreset && !advancedCustomize ? (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  {t("Field mappings are preconfigured for CMS goals → job events. You normally do not need to change them.")}</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {mappings.map((m) => (
                    <li key={m.id}>
                      {m.sourceEntity}.{m.sourceField} → {m.targetEntity}.
                      {m.targetField}
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAdvancedCustomize(true)}
                >
                  {t("Customize (advanced)")}</Button>
              </div>
            ) : (
            <>
            <div className="space-y-2 text-sm text-muted-foreground">
              {isCmsGoalsPreset ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-amber-700">
                    {t("Advanced mapping editor, incorrect changes can break sync.")}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdvancedCustomize(false)}
                  >
                    {t("Done")}</Button>
                </div>
              ) : null}
              <p>
                <strong className="text-foreground">sourceEntity</strong> {t("must match an Endpoints source entity")}{sourceEntityOptions.length
                  ? ` (${sourceEntityOptions.join(", ")})`
                  : t(" (configure Endpoints first)")}{" "}
                {t("or the webhook event type. Mismatches become dead letters.")}</p>
              <p>
                {t("Always map an identity field to")}{" "}
                <code>employee_email</code> or <code>employee_external_key</code>{" "}
                {t("so Analytics can attribute work to HR employees.")}</p>
              {!hasIdentityMapping && mappings.length > 0 ? (
                <p className="text-destructive">
                  {t("No employee identity mapping yet, analytics will skip unmatched records.")}</p>
              ) : null}
            </div>
            {mappings.length === 0 ? (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                {t("Without mappings, synced records become dead letters. Add at least")}{" "}
                <code>{t("id → external_record_id")}</code> {t("and an employee identity field.")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {mappings.map((m) => (
                  <li
                    key={m.id}
                    className={cn(
                      "flex flex-col gap-2 rounded-md border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between",
                      editingMappingId === m.id && "border-amber-300 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/40",
                    )}
                  >
                    <div>
                      <p className="font-medium">
                        {m.sourceEntity}.{m.sourceField} → {m.targetEntity}.
                        {m.targetField}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.transformType}
                        {editingMappingId === m.id ? t(" · editing below") : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={mappingSaving}
                        onClick={() => startEditMapping(m)}
                      >
                        {t("Edit")}</Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={mappingSaving}
                        onClick={() => removeMapping(m.id)}
                      >
                        {t("Remove")}</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <form className="grid gap-3 md:grid-cols-2" onSubmit={saveMappings}>
              {editingMappingId ? (
                <p className="md:col-span-2 text-sm text-amber-700">
                  {t("Editing an existing mapping, save to update it, or cancel.")}</p>
              ) : null}
              {sourceEntityOptions.length > 0 ? (
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={newMap.sourceEntity}
                  onChange={(e) =>
                    setNewMap((s) => ({ ...s, sourceEntity: e.target.value }))
                  }
                >
                  {sourceEntityOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  placeholder={t("Source entity")}
                  value={newMap.sourceEntity}
                  onChange={(e) =>
                    setNewMap((s) => ({ ...s, sourceEntity: e.target.value }))
                  }
                />
              )}
              <Input
                placeholder={t("Source field")}
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
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button type="submit" disabled={mappingSaving}>
                  {mappingSaving
                    ? t("Saving…")
                    : editingMappingId
                      ? t("Save changes")
                      : t("Add mapping")}
                </Button>
                {editingMappingId ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={mappingSaving}
                    onClick={cancelEditMapping}
                  >
                    {t("Cancel")}</Button>
                ) : null}
              </div>
            </form>
            </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === t("Sync history") ? (
        <div className="space-y-2">
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No sync runs yet.")}</p>
          ) : null}
          {runs.map((run) => (
            <Card key={run.id}>
              <CardContent className="py-3 text-sm">
                <p className="font-medium">
                  {run.triggerType} · {run.status}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(run.startedAt).toLocaleString()} {t("· received")}{" "}
                  {run.recordsReceived} {t("· processed")}{run.recordsProcessed} {t("· failed")}{" "}
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

      {tab === t("Raw events") ? (
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No raw events yet.")}</p>
          ) : null}
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

      {tab === t("CSV") ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("CSV import")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("Use the same source entity name as your mappings. Import still requires field mappings for that entity.")}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                value={sourceEntity}
                onChange={(e) => setSourceEntity(e.target.value)}
                placeholder={t("Source entity")}
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
            <Button onClick={importCsv}>{t("Import")}</Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
