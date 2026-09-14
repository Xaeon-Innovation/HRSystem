"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/i18n/provider";

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
    <div className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4 py-10 sm:py-14">
      <Card className="w-full">
        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Elevora
          </p>
          <CardTitle>{t("Request a demo")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t(
              "Tell us about your team, we will reach out at info@xaeons.com.",
            )}
          </p>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="font-medium text-foreground">
                {t("Thanks, we received your request.")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("Our team will contact you shortly.")}
              </p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name">{t("Your name")}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">{t("Company")}</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                  minLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("Work email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("Phone (optional)")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">{t("Message (optional)")}</Label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Button className="w-full" size="lg" disabled={loading}>
                {loading ? t("Sending…") : t("Request demo")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
