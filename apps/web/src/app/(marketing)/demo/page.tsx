"use client";

import { FormEvent, useState } from "react";
import { Blocks, MapPinned, Users } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/elevora";
import { useT } from "@/i18n/provider";

const WALKS = [
  {
    icon: MapPinned,
    title: "Field ops walkthrough",
    sub: "Clock, live map and team today",
  },
  {
    icon: Users,
    title: "People ops walkthrough",
    sub: "Leave, hiring, KPIs and compensation",
  },
  {
    icon: Blocks,
    title: "Integrations",
    sub: "CMS Goals, HubSpot and custom REST",
  },
] as const;

export default function DemoPage() {
  const t = useT();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/v1/public/demo", {
        method: "POST",
        body: JSON.stringify({
          name,
          company,
          email,
          phone: phone || undefined,
          message: message || undefined,
        }),
      });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("Could not send demo request"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-12">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
            {t("Book a demo")}
          </p>
          <h1 className="mt-2.5 text-[clamp(32px,4vw,40px)] font-semibold leading-[1.05] tracking-[-0.035em] text-ink">
            {t("See Polara with your own team in mind.")}
          </h1>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-2">
            {t(
              "A 30-minute walkthrough of the modules that matter to you. We reply within one business day.",
            )}
          </p>
          <div className="mt-8 space-y-4">
            {WALKS.map(({ icon: Icon, title, sub }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-surface border border-line text-ink">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{t(title)}</p>
                  <p className="text-[11.5px] text-ink-muted">{t(sub)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface p-6 shadow-sm sm:p-7">
          {done ? (
            <div className="space-y-2">
              <p className="text-base font-semibold text-ink">
                {t("Thanks, we received your request.")}
              </p>
              <p className="text-sm text-ink-muted">
                {t("Our team will contact you shortly.")}
              </p>
            </div>
          ) : (
            <form className="space-y-3.5" onSubmit={onSubmit}>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t("Name")}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company">{t("Company")}</Label>
                  <Input
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    minLength={2}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("Email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t("Phone")}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">{t("Message")}</Label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder={t("Team size, modules you care about…")}
                  className="flex min-h-[96px] w-full rounded-sm border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                />
              </div>
              {error ? <Notice tone="warn">{error}</Notice> : null}
              <Button className="w-full" size="lg" disabled={loading}>
                {loading ? t("Sending…") : t("Request demo")}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
