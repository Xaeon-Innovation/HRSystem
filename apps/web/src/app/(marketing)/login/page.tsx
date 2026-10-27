"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Info } from "lucide-react";
import { api, setSession, type AuthUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarketingAuthShell } from "@/components/marketing/auth-shell";
import { Notice } from "@/components/elevora";
import { useT } from "@/i18n/provider";

function LoginForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const slug = searchParams.get("slug");
    if (slug) setTenantSlug(slug);
  }, [searchParams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
      }>("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          tenantSlug: tenantSlug || undefined,
        }),
      });
      setSession(data.accessToken, data.refreshToken, data.user);
      const next = searchParams.get("next");
      if (next?.startsWith("/app")) {
        router.push(next);
      } else if (data.user.role === "employee") {
        router.push("/app/clock");
      } else {
        router.push("/app");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-ink">
        {t("Welcome back")}
      </h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        {t("Log in to your workspace.")}
      </p>

      <form className="mt-6 space-y-3.5" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("Email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("Password")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">{t("Tenant slug (optional)")}</Label>
          <Input
            id="slug"
            placeholder="acme-field"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
          />
        </div>
        {error ? <Notice tone="warn">{t(error)}</Notice> : null}
        <Button className="w-full" size="lg" disabled={loading}>
          {loading ? t("Signing in…") : t("Log in")}
        </Button>
        <Notice tone="neutral" className="flex items-start gap-2 text-2xs">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t("Google and Microsoft sign-in are coming soon.")}</span>
        </Notice>
      </form>

      <p className="mt-5 text-sm text-ink-muted">
        {t("New to Polara?")}{" "}
        <Link href="/signup" className="font-semibold text-ink">
          {t("Start a free trial")}
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  const t = useT();
  return (
    <MarketingAuthShell
      claimTitle={t("38 of 52 clocked in.")}
      claimSub={t("Know where your team is before your coffee.")}
    >
      <Suspense
        fallback={
          <div className="h-64 w-full animate-pulse rounded-lg bg-surface-2" />
        }
      >
        <LoginForm />
      </Suspense>
    </MarketingAuthShell>
  );
}
