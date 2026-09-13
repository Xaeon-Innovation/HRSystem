"use client";

import { useEffect, useState } from "react";
import { Copy, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { t } from "@/i18n";

type Credentials = {
  email: string;
  password: string | null;
};

function generateLoginPassword() {
  return `Temp${Math.random().toString(36).slice(2, 10)}!`;
}

export function LoginCredentialsPanel({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<"email" | "password" | null>(null);
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCreds(null);
    setLoadError(null);
    setFormError(null);
    setNextPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    void api<Credentials>(`/v1/employees/${employeeId}/credentials`)
      .then((res) => {
        if (!cancelled) setCreds(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : t("Couldn’t load sign-in credentials"),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  async function copy(kind: "email" | "password", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied((cur) => (cur === kind ? null : cur)), 1600);
    } catch {
      setFormError(t("Couldn’t copy to clipboard"));
    }
  }

  function requestChange() {
    setFormError(null);
    if (nextPassword.length < 8) {
      setFormError(t("Password must be at least 8 characters"));
      return;
    }
    if (nextPassword !== confirmPassword) {
      setFormError(t("Passwords do not match."));
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmChange() {
    setPending(true);
    setFormError(null);
    try {
      const res = await api<Credentials>(`/v1/employees/${employeeId}/password`, {
        method: "POST",
        body: JSON.stringify({ password: nextPassword }),
      });
      setCreds(res);
      setShowPassword(true);
      setNextPassword("");
      setConfirmPassword("");
      setConfirmOpen(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : t("Couldn’t update password"),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="rounded-lg border bg-secondary/30 p-3"
      aria-label={`${t("Sign-in credentials")} — ${employeeName}`}
    >
      <p className="text-sm font-medium">{t("Sign-in credentials")}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("This is the email and password they use to sign in.")}</p>

      {loadError ? (
        <p className="mt-3 text-sm text-destructive">{loadError}</p>
      ) : !creds ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("Loading…")}</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>{t("Login email")}</Label>
            <div className="flex gap-2">
              <Input readOnly value={creds.email} className="min-w-0" />
              <Button
                type="button"
                variant="outline"
                className="h-10 w-10 shrink-0 px-0"
                aria-label={t("Copy email")}
                onClick={() => void copy("email", creds.email)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {copied === "email" ? (
              <p className="text-xs text-emerald-700">{t("Copied")}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label>{t("Login password")}</Label>
            {creds.password ? (
              <>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    type={showPassword ? "text" : "password"}
                    value={creds.password}
                    className="min-w-0"
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-10 shrink-0 px-0"
                    aria-label={
                      showPassword ? t("Hide password") : t("Show password")
                    }
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-10 shrink-0 px-0"
                    aria-label={t("Copy password")}
                    onClick={() => void copy("password", creds.password ?? "")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {copied === "password" ? (
                  <p className="text-xs text-emerald-700">{t("Copied")}</p>
                ) : null}
              </>
            ) : (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                {t(
                  "No stored password. Set a new one so you can look it up later.",
                )}</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`new-password-${employeeId}`}>{t("New password")}</Label>
          <Input
            id={`new-password-${employeeId}`}
            type="text"
            value={nextPassword}
            autoComplete="new-password"
            onChange={(e) => setNextPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`confirm-password-${employeeId}`}>
            {t("Confirm new password")}</Label>
          <Input
            id={`confirm-password-${employeeId}`}
            type="password"
            value={confirmPassword}
            autoComplete="new-password"
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              const generated = generateLoginPassword();
              setNextPassword(generated);
              setConfirmPassword(generated);
              setFormError(null);
            }}
          >
            {t("Generate a password")}</Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={requestChange}
          >
            {t("Set password")}</Button>
        </div>
      </div>
      {formError ? (
        <p className="mt-2 text-sm text-destructive">{formError}</p>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Set a new sign-in password for this person?"
        description="They will use this password the next time they sign in."
        confirmLabel="Set password"
        busy={pending}
        onConfirm={() => void confirmChange()}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirmOpen(false);
        }}
      />
    </div>
  );
}
