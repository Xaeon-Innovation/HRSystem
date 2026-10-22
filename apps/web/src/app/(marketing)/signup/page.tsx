"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isSeatQuoteCode } from "@hr/shared";
import { api, setSession, type AuthUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarketingAuthShell } from "@/components/marketing/auth-shell";
import { Notice, Segmented } from "@/components/elevora";
import { useT } from "@/i18n/provider";

const BILLABLE_PLANS = new Set(["field", "people", "ops", "scale"]);
const TEAM_SIZES = ["1–25", "26–100", "101–500", "500+"] as const;

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
  const [teamSize, setTeamSize] = useState<string>("26–100");
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
    <div>
      <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-ink">
        {isPaidIntent ? t("Start your plan") : t("Start your free trial")}
      </h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        {isPaidIntent
          ? t(
              "Create your organization, then complete checkout to activate your plan.",
            )
          : t("14 days, every module. No card needed.")}
      </p>
      {isPaidIntent && planCode ? (
        <p className="mt-2 text-2xs text-ink-muted">
          {t("Selected plan")}: {planCode}
          {seats != null ? ` · ${seats} ${t("seats")}` : ""}
        </p>
      ) : null}

      <form className="mt-6 space-y-3.5" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="adminName">{t("Your name")}</Label>
            <Input
              id="adminName"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org">{t("Company")}</Label>
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
        </div>
        <div className="space-y-1.5">
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
        </div>
        <div className="space-y-1.5">
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
        <div className="space-y-1.5">
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
        </div>
        <div className="space-y-1.5">
          <Label>{t("Team size")}</Label>
          <Segmented
            className="w-full"
            value={teamSize}
            onChange={setTeamSize}
            options={TEAM_SIZES.map((s) => ({ value: s, label: s }))}
          />
        </div>
        <label className="flex items-start gap-3 text-xs text-ink-muted">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-line-strong"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
          />
          <span>
            {t("By continuing you agree to the")}{" "}
            <Link href="/terms" className="underline">
              {t("Terms")}
            </Link>{" "}
            {t("and")}{" "}
            <Link href="/privacy" className="underline">
              {t("Privacy policy")}
            </Link>
            .
          </span>
        </label>
        {error ? <Notice tone="warn">{error}</Notice> : null}
        <Button className="w-full" size="lg" disabled={loading}>
          {loading
            ? t("Creating workspace…")
            : isPaidIntent
              ? t("Continue to checkout")
              : t("Create workspace")}
        </Button>
      </form>

      <p className="mt-5 text-sm text-ink-muted">
        {t("Already have an account?")}{" "}
        <Link href="/login" className="font-semibold text-ink">
          {t("Log in")}
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  const t = useT();
  return (
    <MarketingAuthShell
      claimTitle={t("Live in an afternoon.")}
      claimSub={t("Branches, roster and shifts. Then your team clocks in.")}
    >
      <Suspense
        fallback={
          <div className="h-64 w-full animate-pulse rounded-lg bg-surface-2" />
        }
      >
        <SignupForm />
      </Suspense>
    </MarketingAuthShell>
  );
}
