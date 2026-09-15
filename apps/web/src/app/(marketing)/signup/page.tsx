"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isSeatQuoteCode } from "@hr/shared";
import { api, setSession, type AuthUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/i18n/provider";

const BILLABLE_PLANS = new Set(["field", "people", "ops", "scale"]);

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function SignupForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan")?.toLowerCase() ?? null;
  const seatsParam = searchParams.get("seats");
  const planCode =
    planParam && BILLABLE_PLANS.has(planParam) ? planParam : null;
  const seats =
    planCode && isSeatQuoteCode(planCode) && seatsParam
      ? Number(seatsParam)
      : undefined;
  const isPaidIntent = Boolean(planCode);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const derivedSlug = useMemo(() => slugify(name), [name]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!acceptTerms) {
      setError(t("Please accept the Terms of Service and Privacy Policy."));
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name,
        slug: slug || derivedSlug,
        adminName,
        adminEmail,
        adminPassword,
        acceptTerms: true,
      };
      if (planCode) {
        body.planCode = planCode;
        if (
          isSeatQuoteCode(planCode) &&
          seats != null &&
          Number.isFinite(seats)
        ) {
          body.seats = seats;
        }
      }
      const data = await api<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
      }>("/v1/public/signup", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setSession(data.accessToken, data.refreshToken, data.user);
      if (planCode) {
        const qs = new URLSearchParams({ checkout: planCode });
        if (
          isSeatQuoteCode(planCode) &&
          seats != null &&
          Number.isFinite(seats)
        ) {
          qs.set("seats", String(seats));
        }
        router.push(`/app/billing?${qs.toString()}`);
      } else {
        router.push("/app");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("Could not create your workspace"),
      );
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
        <CardTitle>
          {isPaidIntent ? t("Start your plan") : t("Start your free trial")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isPaidIntent
            ? t(
                "Create your organization, then complete checkout to activate your plan.",
              )
            : t("Create your organization and get 14 days of full access.")}
        </p>
        {isPaidIntent && planCode ? (
          <p className="text-xs text-muted-foreground">
            {t("Selected plan")}: {planCode}
            {seats != null ? ` · ${seats} ${t("seats")}` : ""}
          </p>
        ) : null}
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="org">{t("Organization name")}</Label>
            <Input
              id="org"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              required
              minLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">{t("Organization slug")}</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                );
              }}
              required
              minLength={2}
              pattern="[a-z0-9-]+"
              placeholder="acme-field"
            />
            <p className="text-xs text-muted-foreground">
              {t("Used at sign-in. Lowercase letters, numbers, and hyphens.")}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminName">{t("Your name")}</Label>
            <Input
              id="adminName"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("Work email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("Password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              {t("At least 8 characters.")}
            </p>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            <span className="text-muted-foreground">
              {t("I agree to the")}{" "}
              <Link href="/terms" className="text-foreground underline">
                {t("Terms of Service")}
              </Link>{" "}
              {t("and")}{" "}
              <Link href="/privacy" className="text-foreground underline">
                {t("Privacy Policy")}
              </Link>
              .
            </span>
          </label>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button className="w-full" size="lg" disabled={loading}>
            {loading
              ? t("Creating workspace…")
              : isPaidIntent
                ? t("Continue to checkout")
                : t("Start free trial")}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("Already have an account?")}{" "}
          <Link href="/login" className="text-foreground underline">
            {t("Sign in")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4 py-10 sm:py-14">
      <Suspense
        fallback={
          <div className="h-64 w-full animate-pulse rounded-xl bg-muted/40" />
        }
      >
        <SignupForm />
      </Suspense>
    </div>
  );
}
