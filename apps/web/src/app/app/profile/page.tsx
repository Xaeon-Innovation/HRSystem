"use client";

import { ChangeEvent, useRef, useState } from "react";
import {
  api,
  getUser,
  updateSessionUser,
  type AuthUser,
} from "@/lib/api";
import { AvatarCropDialog } from "@/components/avatar-crop-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/user-avatar";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Notice, PageHeader } from "@/components/elevora";
import { Crop } from "lucide-react";
import { t } from "@/i18n";

const MAX_BYTES = 12 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const ROLE_LABEL: Record<AuthUser["role"], string> = {
  super_admin: "Platform admin",
  tenant_admin: "Admin",
  employee: "Employee",
};

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(() =>
    typeof window === "undefined" ? null : getUser(),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function applyUser(next: AuthUser) {
    updateSessionUser(next);
    setUser(next);
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError(t("Choose a photo under 12 MB."));
      setMessage(null);
      return;
    }
    setError(null);
    setMessage(null);
    setCropFile(file);
  }

  async function onCropConfirm(imageBase64: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api<{ user: AuthUser }>("/v1/auth/me/avatar", {
        method: "POST",
        body: JSON.stringify({ imageBase64 }),
      });
      applyUser(res.user);
      setCropFile(null);
      setMessage(t("Profile photo updated."));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Could not upload photo"));
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api<{ user: AuthUser }>("/v1/auth/me/avatar", {
        method: "DELETE",
      });
      applyUser(res.user);
      setMessage(t("Profile photo removed."));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Could not remove photo"));
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return <PageSkeleton dense />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Profile")}
        subtitle={t("Your account and language.")}
      />

      {message ? <Notice tone="accent">{t(message)}</Notice> : null}
      {error ? <Notice tone="warn">{t(error)}</Notice> : null}

      <div className="grid gap-3.5 lg:grid-cols-12">
        <Card className="min-w-0 lg:col-span-7">
          <CardContent className="space-y-5 pt-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <UserAvatar
                name={user.name}
                avatarUrl={user.avatarUrl}
                size="xl"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold text-ink">
                  {user.name}
                </p>
                <p className="truncate text-sm text-ink-muted">
                  {t(ROLE_LABEL[user.role])} · {user.email}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={busy}
                    onClick={() => inputRef.current?.click()}
                  >
                    <Crop className="h-3.5 w-3.5" aria-hidden />
                    {busy
                      ? t("Saving…")
                      : t("Upload and crop")}
                  </Button>
                  {user.avatarUrl ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="w-full sm:w-auto"
                      disabled={busy}
                      onClick={() => void removePhoto()}
                    >
                      {t("Remove")}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={onFile}
            />

            <div className="border-t border-line" />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("Name")}</Label>
                <Input value={user.name} disabled readOnly />
              </div>
              <div className="space-y-1">
                <Label>{t("Email")}</Label>
                <Input
                  value={user.email}
                  disabled
                  readOnly
                  className="opacity-60"
                />
              </div>
            </div>
            <p className="text-xs text-ink-muted">
              {t("JPEG, PNG, WebP, or GIF. Crop after you pick a photo.")}
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-5">
          <CardHeader>
            <CardTitle>{t("Preferences")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("Language")}</Label>
              <LanguageToggle className="w-full" />
            </div>
            <div className="space-y-2">
              <Label>{t("Theme")}</Label>
              <ThemeToggle className="w-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      <AvatarCropDialog
        open={Boolean(cropFile)}
        file={cropFile}
        busy={busy}
        onOpenChange={(open) => {
          if (!open && !busy) setCropFile(null);
        }}
        onConfirm={onCropConfirm}
      />
    </div>
  );
}
