"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { getUser, mediaUrl } from "@/lib/api";
import { prepareLogoDataUrl } from "@/lib/avatar-image";
import {
  BRAND_PRESETS,
  loadTenantBrand,
  persistTenantBrand,
  persistTenantLogo,
  removeTenantLogo,
  type BrandPresetId,
  type TenantBrand,
} from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { initialsOf } from "@/components/user-avatar";
import { t } from "@/i18n";

const MAX_BYTES = 12 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function BrandingSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const user = getUser();
  const tenantId = user?.tenantId;
  const [draft, setDraft] = useState<TenantBrand>(() =>
    loadTenantBrand(tenantId),
  );
  const [pendingLogo, setPendingLogo] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const previewSrc = pendingLogo
    ? pendingLogo
    : removeLogo
      ? null
      : mediaUrl(draft.logoUrl);
  const previewName = draft.brandingName.trim() || "HR Track";

  function resetFromStore() {
    setDraft(loadTenantBrand(tenantId));
    setPendingLogo(null);
    setRemoveLogo(false);
    setError(null);
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("Choose an image under 12 MB.");
      return;
    }
    try {
      const dataUrl = await prepareLogoDataUrl(file);
      setPendingLogo(dataUrl);
      setRemoveLogo(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that image");
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        if (next && tenantId) resetFromStore();
        onOpenChange(next);
      }}
    >
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("Branding")}</SheetTitle>
          <SheetDescription>
            {t("White-label for your tenant: display name, logo, and color preset. Saved for everyone in this organization.")}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="space-y-2">
            <Label htmlFor="brand-name">{t("Display name")}</Label>
            <Input
              id="brand-name"
              value={draft.brandingName}
              onChange={(e) =>
                setDraft((d) => ({ ...d, brandingName: e.target.value }))
              }
              placeholder={t("HR Track")}
              disabled={busy}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("Logo (optional)")}</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-sm font-semibold tracking-tight text-primary ring-1 ring-black/[0.06] dark:ring-white/10">
                {previewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewSrc}
                    alt=""
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span>{initialsOf(previewName)}</span>
                )}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  {previewSrc ? t("Change logo") : t("Upload logo")}
                </Button>
                {previewSrc ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={busy}
                    onClick={() => {
                      setPendingLogo(null);
                      setRemoveLogo(true);
                    }}
                  >
                    {t("Remove")}</Button>
                ) : null}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => void onFile(e)}
            />
            <p className="text-xs text-muted-foreground">
              {t("JPEG, PNG, WebP, or GIF, stored on this server, not a public URL.")}</p>
          </div>
          <div className="space-y-2">
            <Label>{t("Color preset")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(BRAND_PRESETS) as BrandPresetId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  disabled={busy}
                  onClick={() => setDraft((d) => ({ ...d, preset: id }))}
                  className={`min-h-10 rounded-lg border px-3 py-2 text-left text-sm ${
                    draft.preset === id
                      ? "border-primary bg-accent"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  <span className="font-medium">{t(BRAND_PRESETS[id].label)}</span>
                  <span
                    className="mt-2 block h-2 rounded-full"
                    style={{ background: `hsl(${BRAND_PRESETS[id].primary})` }}
                  />
                </button>
              ))}
            </div>
          </div>
          <Button
            className="w-full"
            disabled={!tenantId || busy}
            onClick={() => {
              if (!tenantId) return;
              setBusy(true);
              setError(null);
              const name = draft.brandingName.trim() || "HR Track";
              void (async () => {
                if (pendingLogo) {
                  await persistTenantLogo(tenantId, pendingLogo);
                } else if (removeLogo) {
                  await removeTenantLogo(tenantId);
                }
                await persistTenantBrand(tenantId, {
                  ...draft,
                  brandingName: name,
                });
              })()
                .then(() => onOpenChange(false))
                .catch((err) =>
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Could not save branding",
                  ),
                )
                .finally(() => setBusy(false));
            }}
          >
            {busy ? t("Saving…") : t("Save branding")}
          </Button>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
