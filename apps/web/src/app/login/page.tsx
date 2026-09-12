"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setSession, type AuthUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { t } from "@/i18n";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      if (data.user.role === "super_admin") router.push("/app/tenants");
      else if (data.user.role === "tenant_admin") router.push("/app");
      else router.push("/app/clock");
    } catch (err) {
        setError(err instanceof Error ? err.message : t("Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md items-center px-4">
      <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
        <LanguageToggle showLabels={false} />
        <ThemeToggle />
      </div>
      <Card className="w-full">
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {t("HR Track")}</p>
          <CardTitle>{t("Sign in")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">{t("Email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("Password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">{t("Tenant slug (optional)")}</Label>
              <Input
                id="slug"
                placeholder="cms"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive">{t(error)}</p>
            ) : null}
            <Button className="w-full" size="lg" disabled={loading}>
              {loading ? t("Signing in…") : t("Sign in")}
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {t("Integrations & Analytics")}
            </span>{" "}
            {t(
              "are on the tenant admin account, not the platform super admin.",
            )}</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>
              {t("Tenant admin:")} <code>admin@cms.local</code> / Admin123! ·{" "}
              {t("slug")} <code>cms</code>
            </li>
            <li>
              {t("Platform super admin:")} <code>superadmin@hr.local</code> /
              SuperAdmin123! · {t("no slug (Tenants / Plans only)")}
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
