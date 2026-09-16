"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, setSession, type AuthUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      } else if (data.user.role === "super_admin") {
        router.push("/app");
      } else if (data.user.role === "tenant_admin") {
        router.push("/app");
      } else {
        router.push("/app/clock");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-2">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Elevora
        </p>
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
              placeholder="acme-field"
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
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("New to Elevora?")}{" "}
          <Link href="/signup" className="text-foreground underline">
            {t("Start free trial")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-4 py-10 sm:py-14">
      <Suspense fallback={<div className="h-64 w-full animate-pulse rounded-xl bg-muted/40" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
