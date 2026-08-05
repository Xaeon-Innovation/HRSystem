"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setSession, type AuthUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <Card className="w-full border-border/70 bg-white/80 backdrop-blur">
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">
            HR Track
          </p>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Password</Label>
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
              <Label htmlFor="slug">Tenant slug (optional)</Label>
              <Input
                id="slug"
                placeholder="cms"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <Button className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            Try admin@cms.local / Admin123! (slug: cms) or
            superadmin@hr.local / SuperAdmin123!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
