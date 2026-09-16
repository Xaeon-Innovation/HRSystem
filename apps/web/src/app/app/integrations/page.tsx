"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n";

type Connection = {
  id: string;
  name: string;
  providerType: string;
  status: string;
  syncMode: string;
  lastSyncAt: string | null;
  lastError: string | null;
  connectorConfig?: { preset?: string; authStrategy?: string };
};

type CatalogPack = {
  id: string;
  type: string;
  label: string;
  description: string;
  implemented: boolean;
  comingSoon?: boolean;
  authStrategy: string;
  authFields: Array<{
    name: "username" | "password" | "apiKey";
    label: string;
    inputType: string;
    placeholder?: string;
    required?: boolean;
  }>;
  defaultBaseUrl: string | null;
  preset?: string;
  oauthConfigured?: boolean;
};

const FALLBACK_PACKS: CatalogPack[] = [
  {
    id: "creative_cms_goals",
    type: "cms",
    label: "CMS Goals",
    description:
      "Connect your CMS so employee goals flow into Analytics. Enter a service account; we handle login, tokens, endpoints, and field mappings.",
    implemented: true,
    authStrategy: "cms_jwt",
    authFields: [
      {
        name: "username",
        label: "Service account phone",
        inputType: "tel",
        placeholder: "+9715XXXXXXXX",
        required: true,
      },
      {
        name: "password",
        label: "Password",
        inputType: "password",
        required: true,
      },
    ],
    defaultBaseUrl: "https://api.creativeintelligent.ae/api/v1",
    preset: "creative_cms_goals",
  },
];

function packLabelForConnection(row: Connection, packs: CatalogPack[]): string {
  const preset = row.connectorConfig?.preset;
  const pack = packs.find((p) => p.id === preset || p.preset === preset);
  if (pack) return t(pack.label);
  if (preset === "creative_cms_goals") return t("CMS Goals");
  if (preset === "hubspot_crm") return t("HubSpot CRM");
  return row.providerType;
}

function IntegrationsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<Connection[]>([]);
  const [packs, setPacks] = useState<CatalogPack[]>(FALLBACK_PACKS);
  const [name, setName] = useState("");
  const [providerType, setProviderType] = useState("custom_api");
  const [syncMode, setSyncMode] = useState("polling");
  const [baseUrl, setBaseUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [activePackId, setActivePackId] = useState<string | null>(null);
  const [credFields, setCredFields] = useState<Record<string, string>>({});
  const [packBaseUrl, setPackBaseUrl] = useState("");
  const [packAdvanced, setPackAdvanced] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const oauthError = searchParams.get("oauthError");

  async function load() {
    const [connData, catalog] = await Promise.all([
      api<{ connections: Connection[] }>("/v1/integrations/connections"),
      api<{ packs?: CatalogPack[] }>("/v1/integrations/catalog").catch(
        () => ({ packs: undefined }),
      ),
    ]);
    setRows(connData.connections);
    if (catalog.packs?.length) setPacks(catalog.packs);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (oauthError) setError(decodeURIComponent(oauthError));
  }, [oauthError]);

  const readyPacks = useMemo(
    () => packs.filter((p) => p.implemented && !p.comingSoon),
    [packs],
  );
  const comingSoonPacks = useMemo(
    () => packs.filter((p) => p.comingSoon || !p.implemented),
    [packs],
  );

  async function connectCredentialPack(e: FormEvent, pack: CatalogPack) {
    e.preventDefault();
    setConnecting(true);
    setActivePackId(pack.id);
    setError(null);
    try {
      const res = await api<{ connection: Connection }>(
        "/v1/integrations/connections",
        {
          method: "POST",
          body: JSON.stringify({
            name: pack.label,
            providerType: pack.type,
            preset: pack.preset ?? pack.id,
            baseUrl:
              packBaseUrl.trim() || pack.defaultBaseUrl || undefined,
            authConfig: {
              username: credFields.username?.trim(),
              password: credFields.password,
              apiKey: credFields.apiKey,
            },
          }),
        },
      );
      router.push(`/app/integrations/${res.connection.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setConnecting(false);
      setActivePackId(null);
    }
  }

  async function connectOAuthPack(pack: CatalogPack) {
    setConnecting(true);
    setActivePackId(pack.id);
    setError(null);
    try {
      const res = await api<{ authorizeUrl: string; connection: Connection }>(
        "/v1/integrations/oauth/start",
        {
          method: "POST",
          body: JSON.stringify({
            preset: pack.preset ?? pack.id,
            name: pack.label,
          }),
        },
      );
      window.location.href = res.authorizeUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start OAuth");
      setConnecting(false);
      setActivePackId(null);
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

  function openPackForm(pack: CatalogPack) {
    setActivePackId(pack.id);
    setCredFields({});
    setPackBaseUrl(pack.defaultBaseUrl ?? "");
    setPackAdvanced(false);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("Integrations")}</h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "Connect CMS, CRM, or ERP without API wiring. Pick a connector; we handle auth, endpoints, and mappings.",
          )}
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {readyPacks.map((pack) => {
          const isOpen = activePackId === pack.id;
          const busy = connecting && activePackId === pack.id;
          return (
            <Card
              key={pack.id}
              className="border-emerald-200/70 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/30"
            >
              <CardHeader>
                <CardTitle className="text-base">{t(pack.label)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t(pack.description)}
                </p>
                {pack.authStrategy === "oauth2" ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      className="w-full sm:w-auto"
                      disabled={busy || pack.oauthConfigured === false}
                      onClick={() => connectOAuthPack(pack)}
                    >
                      {busy
                        ? t("Connecting…")
                        : t("Connect {name}", { name: pack.label })}
                    </Button>
                    {pack.oauthConfigured === false ? (
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "OAuth is not configured on this server yet. Ask your platform admin.",
                        )}
                      </p>
                    ) : null}
                  </div>
                ) : isOpen ? (
                  <form
                    className="grid gap-3 sm:grid-cols-2"
                    onSubmit={(e) => connectCredentialPack(e, pack)}
                  >
                    {pack.authFields.map((field) => (
                      <div key={field.name} className="space-y-1">
                        <Label>{t(field.label)}</Label>
                        <Input
                          type={
                            field.inputType === "password"
                              ? "password"
                              : field.inputType === "tel"
                                ? "tel"
                                : "text"
                          }
                          value={credFields[field.name] ?? ""}
                          onChange={(e) =>
                            setCredFields((prev) => ({
                              ...prev,
                              [field.name]: e.target.value,
                            }))
                          }
                          placeholder={
                            field.placeholder
                              ? t(field.placeholder)
                              : undefined
                          }
                          required={field.required !== false}
                          autoComplete={
                            field.name === "password"
                              ? "current-password"
                              : "username"
                          }
                        />
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline hover:text-foreground"
                        onClick={() => setPackAdvanced((v) => !v)}
                      >
                        {packAdvanced
                          ? t("Hide advanced")
                          : t("Advanced (base URL)")}
                      </button>
                    </div>
                    {packAdvanced ? (
                      <div className="space-y-1 sm:col-span-2">
                        <Label>{t("Base URL")}</Label>
                        <Input
                          type="url"
                          value={packBaseUrl}
                          onChange={(e) => setPackBaseUrl(e.target.value)}
                        />
                      </div>
                    ) : null}
                    {pack.id === "creative_cms_goals" ? (
                      <p className="sm:col-span-2 text-xs text-muted-foreground">
                        {t(
                          "For Analytics attribution, HR employees should use the same CMS employee UUID as their external ID.",
                        )}
                      </p>
                    ) : null}
                    <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
                      <Button
                        type="submit"
                        className="w-full sm:w-auto"
                        disabled={busy}
                      >
                        {busy
                          ? t("Connecting…")
                          : t("Connect {name}", { name: pack.label })}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        disabled={busy}
                        onClick={() => setActivePackId(null)}
                      >
                        {t("Cancel")}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => openPackForm(pack)}
                  >
                    {t("Connect {name}", { name: pack.label })}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}

        {comingSoonPacks.map((pack) => (
          <Card key={pack.id} className="opacity-80">
            <CardHeader>
              <CardTitle className="text-base">{t(pack.label)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t(pack.description)}
              </p>
              <Button className="w-full sm:w-auto" disabled>
                {t("Coming soon")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("Your connections")}
        </h2>
        {rows.map((row) => (
          <Link key={row.id} href={`/app/integrations/${row.id}`}>
            <Card>
              <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {packLabelForConnection(row, packs)} · {row.syncMode}{" "}
                    {t("· last sync")}{" "}
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
            {t("No connections yet. Connect a pack above.")}
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
            ? t("Hide custom / advanced connection")
            : t("Custom REST / advanced connection")}
        </button>
      </div>

      {showAdvanced ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("Custom REST connection")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={create}
            >
              <div className="space-y-1">
                <Label>{t("Name")}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>{t("Provider")}</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={providerType}
                  onChange={(e) => setProviderType(e.target.value)}
                >
                  <option value="custom_api">{t("Custom REST API")}</option>
                  <option value="webhook">{t("Webhook")}</option>
                  <option value="csv">{t("CSV import")}</option>
                  <option value="crm">{t("CRM (via Custom REST)")}</option>
                  <option value="erp">{t("ERP (via Custom REST)")}</option>
                </select>
              </div>
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
                <Label>{t("Base URL")}</Label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.example.com"
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={creating}
                >
                  {creating ? t("Creating…") : t("Create and continue")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-48 w-full animate-pulse rounded-xl bg-muted/40" />
      }
    >
      <IntegrationsPageInner />
    </Suspense>
  );
}
