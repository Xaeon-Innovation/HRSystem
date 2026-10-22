"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  ChevronRight,
  CreditCard,
  MapPinned,
  Palmtree,
  ImageUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardSub, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrandingSheet } from "@/components/branding-sheet";
import { IconTile, Notice, PageHeader } from "@/components/elevora";
import { getUser } from "@/lib/api";
import {
  BRAND_PRESETS,
  applyBrandToDocument,
  fetchTenantBrand,
  loadTenantBrand,
  persistTenantBrand,
  type BrandPresetId,
  type TenantBrand,
} from "@/lib/branding";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

const LINKS = [
  {
    href: "/app/settings/org",
    title: t("Org setup"),
    description: t("Job roles, branches, sites"),
    icon: Building2,
  },
  {
    href: "/app/map",
    title: t("Live map appearance"),
    description: t("Edited on the map page"),
    icon: MapPinned,
  },
  {
    href: "/app/billing",
    title: t("Billing"),
    description: t("Plan and seats"),
    icon: CreditCard,
  },
  {
    href: "/app/leave/policies",
    title: t("Leave policies"),
    description: t("Leave types and rules"),
    icon: Palmtree,
  },
] as const;

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [brandOpen, setBrandOpen] = useState(false);
  const user = getUser();
  const tenantId = user?.tenantId ?? null;
  const isAdmin =
    user?.role === "tenant_admin" ||
    (user?.role === "super_admin" && Boolean(user.tenantId));

  const [brand, setBrand] = useState<TenantBrand>(() =>
    loadTenantBrand(tenantId),
  );
  const [presetDraft, setPresetDraft] = useState<BrandPresetId>(brand.preset);
  const [brandBusy, setBrandBusy] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [brandMessage, setBrandMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    if (searchParams.get("branding") === "1") setBrandOpen(true);
  }, [isAdmin, searchParams]);

  useEffect(() => {
    if (!isAdmin || !tenantId) return;
    void fetchTenantBrand(tenantId).then((next) => {
      setBrand(next);
      setPresetDraft(next.preset);
    });
  }, [isAdmin, tenantId]);

  function previewPreset(id: BrandPresetId) {
    setPresetDraft(id);
    applyBrandToDocument({ ...brand, preset: id });
  }

  function revertPresetPreview() {
    setPresetDraft(brand.preset);
    applyBrandToDocument(brand);
  }

  async function savePreset() {
    if (!tenantId) return;
    setBrandBusy(true);
    setBrandError(null);
    setBrandMessage(null);
    try {
      const next = await persistTenantBrand(tenantId, {
        ...brand,
        preset: presetDraft,
      });
      setBrand(next);
      setPresetDraft(next.preset);
      applyBrandToDocument(next);
      setBrandMessage(t("Accent color saved."));
    } catch (err) {
      setBrandError(err instanceof Error ? err.message : t("Could not save"));
      revertPresetPreview();
    } finally {
      setBrandBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Settings")}
        subtitle={t("Workspace, branding and map appearance.")}
      />

      <div className="grid gap-3.5 lg:grid-cols-12">
        {isAdmin ? (
          <Card className="min-w-0 lg:col-span-7">
            <CardHeader>
              <CardTitle>{t("Branding")}</CardTitle>
              <CardSub>
                {t("Applied across the workspace and mobile app")}
              </CardSub>
            </CardHeader>
            <CardContent className="space-y-4">
              {brandError ? <Notice tone="warn">{brandError}</Notice> : null}
              {brandMessage ? (
                <Notice tone="accent">{brandMessage}</Notice>
              ) : null}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <button
                  type="button"
                  onClick={() => setBrandOpen(true)}
                  className="inline-grid h-[72px] w-[72px] shrink-0 place-items-center rounded-[18px] border border-dashed border-line-strong bg-surface-2 text-ink-muted transition-colors hover:bg-surface-3"
                  aria-label={t("Name & logo…")}
                >
                  <ImageUp className="h-6 w-6" aria-hidden />
                </button>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-medium text-ink-muted">
                    {t("Display name")}
                  </p>
                  <p className="truncate text-sm font-semibold text-ink">
                    {brand.brandingName || t("Not set")}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full sm:w-auto"
                    onClick={() => setBrandOpen(true)}
                  >
                    {t("Name & logo…")}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-ink-muted">
                  {t("Color preset")}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {(Object.keys(BRAND_PRESETS) as BrandPresetId[]).map((id) => (
                    <button
                      key={id}
                      type="button"
                      disabled={brandBusy}
                      onClick={() => previewPreset(id)}
                      aria-label={t(BRAND_PRESETS[id].label)}
                      aria-pressed={presetDraft === id}
                      className={cn(
                        "h-9 w-9 rounded-full border-2 transition-transform",
                        presetDraft === id
                          ? "scale-110 border-ink"
                          : "border-transparent hover:scale-105",
                      )}
                      style={{
                        background: `hsl(${BRAND_PRESETS[id].swatch})`,
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={
                    brandBusy || !tenantId || presetDraft === brand.preset
                  }
                  onClick={() => void savePreset()}
                >
                  {brandBusy ? t("Saving…") : t("Save branding")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={brandBusy || presetDraft === brand.preset}
                  onClick={revertPresetPreview}
                >
                  {t("Reset preview")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div
          className={cn(
            "flex min-w-0 flex-col gap-3.5",
            isAdmin ? "lg:col-span-5" : "lg:col-span-12",
          )}
        >
          {LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm transition-colors hover:bg-surface-2"
              >
                <IconTile tone="neutral">
                  <Icon className="h-4 w-4" aria-hidden />
                </IconTile>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-2xs text-ink-muted">
                    {item.description}
                  </p>
                </div>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-ink-muted rtl:-scale-x-100"
                  aria-hidden
                />
              </Link>
            );
          })}
        </div>
      </div>

      <BrandingSheet
        open={brandOpen}
        onOpenChange={(open) => {
          setBrandOpen(open);
          if (!open && tenantId) {
            const next = loadTenantBrand(tenantId);
            setBrand(next);
            setPresetDraft(next.preset);
            applyBrandToDocument(next);
          }
        }}
      />
    </div>
  );
}
