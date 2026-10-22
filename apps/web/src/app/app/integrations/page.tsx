"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Chip,
  EmptyState,
  IconTile,
  Notice,
  PageHeader,
  StatusChip,
} from "@/components/elevora";
import { ArrowRight, Handshake, Plug, Plus, Target, Webhook } from "lucide-react";
import { cn } from "@/lib/utils";
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

  const connectionIcon = (row: Connection) => {
    const preset = row.connectorConfig?.preset;
    if (preset === "hubspot_crm") return <Handshake className="h-5 w-5" aria-hidden />;
    if (preset === "creative_cms_goals") return <Target className="h-5 w-5" aria-hidden />;
    if (row.providerType === "webhook") return <Webhook className="h-5 w-5" aria-hidden />;
    return <Plug className="h-5 w-5" aria-hidden />;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Integrations")}
        subtitle={t(
          "Connect CMS, CRM, or ERP without API wiring. Pick a connector; we handle auth, endpoints, and mappings.",
        )}
        actions={
          <Button
            className="w-full sm:w-auto"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
          >
            <Plus className="h-4 w-4" aria-hidden />
            {showAdvanced
              ? t("Hide custom / advanced connection")
              : t("Custom connection")}
          </Button>
        }
      />

      {error ? <Notice tone="warn">{error}</Notice> : null}

      {showAdvanced ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("Custom REST connection")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={create}>
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
                  className="h-10 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-ink focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
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
                  className="h-10 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-ink focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
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

      <section aria-labelledby="integrations-connected" className="space-y-3">
        <h2
          id="integrations-connected"
          className="text-2xs font-semibold uppercase tracking-wider text-ink-muted"
        >
          {t("Connected")}
        </h2>
        {rows.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Plug className="h-5 w-5" aria-hidden />}
              title={t("No connections yet")}
              subtitle={t("Connect a pack below to get started.")}
            />
          </Card>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <Link
                key={row.id}
                href={`/app/integrations/${row.id}`}
                className="group block min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
              >
                <Card className="h-full p-5 transition-colors group-hover:border-line-strong">
                  <div className="flex items-start justify-between gap-2">
                    <IconTile tone="ink" size="lg">
                      {connectionIcon(row)}
                    </IconTile>
                    <StatusChip status={row.status} label={row.status} />
                  </div>
                  <h3 className="mt-3 truncate text-[15px] font-semibold text-ink">
                    {row.name}
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {packLabelForConnection(row, packs)} · {row.syncMode}
                  </p>
                  {row.lastError ? (
                    <p className="mt-2 line-clamp-2 text-xs text-danger">
                      {row.lastError}
                    </p>
                  ) : null}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-muted">
                    <span className="min-w-0 truncate">
                      {t("Last sync")}{" "}
                      {row.lastSyncAt
                        ? new Date(row.lastSyncAt).toLocaleString()
                        : t("never")}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 font-medium text-ink">
                      {t("Manage")}
                      <ArrowRight
                        className="h-3.5 w-3.5 rtl:-scale-x-100"
                        aria-hidden
                      />
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="integrations-catalog" className="space-y-3">
        <h2
          id="integrations-catalog"
          className="text-2xs font-semibold uppercase tracking-wider text-ink-muted"
        >
          {t("Catalog")}
        </h2>
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {readyPacks.map((pack) => {
            const isOpen = activePackId === pack.id;
            const busy = connecting && activePackId === pack.id;
            return (
              <Card
                key={pack.id}
                className={cn(
                  "min-w-0 p-5",
                  isOpen && pack.authStrategy !== "oauth2" && "sm:col-span-2 xl:col-span-3",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <IconTile tone="neutral" size="lg">
                    <Plug className="h-5 w-5" aria-hidden />
                  </IconTile>
                  {pack.authStrategy === "oauth2" || isOpen ? null : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openPackForm(pack)}
                    >
                      {t("Connect")}
                    </Button>
                  )}
                </div>
                <h3 className="mt-3 text-[15px] font-semibold text-ink">
                  {t(pack.label)}
                </h3>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {t(pack.description)}
                </p>

                {pack.authStrategy === "oauth2" ? (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
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
                      <p className="text-xs text-ink-muted">
                        {t(
                          "OAuth is not configured on this server yet. Ask your platform admin.",
                        )}
                      </p>
                    ) : null}
                  </div>
                ) : isOpen ? (
                  <form
                    className="mt-4 grid gap-3 sm:grid-cols-2"
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
                        className="text-xs text-ink-muted underline hover:text-ink"
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
                      <p className="text-xs text-ink-muted sm:col-span-2">
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
                ) : null}
              </Card>
            );
          })}

          {comingSoonPacks.map((pack) => (
            <Card key={pack.id} className="min-w-0 p-5 opacity-70">
              <div className="flex items-start justify-between gap-2">
                <IconTile tone="neutral" size="lg">
                  <Plug className="h-5 w-5" aria-hidden />
                </IconTile>
                <Chip>{t("Coming soon")}</Chip>
              </div>
              <h3 className="mt-3 text-[15px] font-semibold text-ink">
                {t(pack.label)}
              </h3>
              <p className="mt-0.5 text-xs text-ink-muted">
                {t(pack.description)}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-48 w-full animate-pulse rounded-lg bg-surface-2" />
      }
    >
      <IntegrationsPageInner />
    </Suspense>
  );
}
