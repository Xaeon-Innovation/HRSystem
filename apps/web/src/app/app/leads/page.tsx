"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/i18n";

type Lead = {
  id: string;
  source: string;
  status: string;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  message: string | null;
  planCode: string | null;
  notes: string | null;
  createdAt: string;
  tenant: { id: string; name: string | null; slug: string | null } | null;
};

const STATUSES = ["new", "contacted", "qualified", "converted", "closed"] as const;
const SOURCES = ["demo", "signup_trial", "signup_paid", "enterprise"] as const;

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (source) params.set("source", source);
    params.set("limit", "100");
    const data = await api<{ leads: Lead[]; total: number }>(
      `/v1/leads?${params.toString()}`,
    );
    setLeads(data.leads);
    setTotal(data.total);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function saveLead(nextStatus?: string) {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/v1/leads/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: nextStatus ?? editing.status,
          notes: notes || null,
        }),
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("Leads")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Demo requests and self-serve signups")} ({total})
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t("Search name, company, email")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{t("All statuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="">{t("All sources")}</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button
          className="w-full sm:w-auto"
          variant="outline"
          onClick={() => load().catch((e) => setError(e.message))}
        >
          {t("Filter")}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="space-y-2">
        {leads.map((lead) => (
          <Card key={lead.id}>
            <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">
                  {lead.company}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({lead.source})
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {lead.name} · {lead.email}
                  {lead.phone ? ` · ${lead.phone}` : ""}
                  {lead.planCode ? ` · ${lead.planCode}` : ""}
                  {lead.tenant?.slug ? ` · tenant ${lead.tenant.slug}` : ""}
                </p>
                {lead.message ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {lead.message}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-xs uppercase">{lead.status}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setEditing(lead);
                    setNotes(lead.notes ?? "");
                  }}
                >
                  {t("Update")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No leads found.")}</p>
        ) : null}
      </div>

      {editing ? (
        <Card className="border-primary/30">
          <CardContent className="space-y-3 py-4">
            <p className="font-medium">
              {editing.company} — {editing.name}
            </p>
            <div className="space-y-1">
              <Label>{t("Status")}</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={editing.status}
                onChange={(e) =>
                  setEditing((l) =>
                    l ? { ...l, status: e.target.value } : l,
                  )
                }
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>{t("Notes")}</Label>
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="w-full sm:w-auto"
                disabled={busy}
                onClick={() => void saveLead()}
              >
                {t("Save")}
              </Button>
              {!editing.tenant ? (
                <Button
                  className="w-full sm:w-auto"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    const slug = editing.company
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "")
                      .slice(0, 40) || "enterprise";
                    const password = `Ent${Math.random().toString(36).slice(2, 10)}!`;
                    setBusy(true);
                    setError(null);
                    void api<{ tenant: { id: string } }>("/v1/tenants", {
                      method: "POST",
                      body: JSON.stringify({
                        name: editing.company,
                        slug: `${slug}-${Date.now().toString(36).slice(-4)}`,
                        adminEmail: editing.email,
                        adminName: editing.name,
                        adminPassword: password,
                        planCode: "enterprise",
                        leadId: editing.id,
                      }),
                    })
                      .then(async (res) => {
                        setEditing(null);
                        await load();
                        window.location.href = `/app/tenants/${res.tenant.id}`;
                      })
                      .catch((err) => {
                        setError(
                          err instanceof Error ? err.message : "Failed",
                        );
                        setBusy(false);
                      });
                  }}
                >
                  {t("Provision Enterprise")}
                </Button>
              ) : (
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <a href={`/app/tenants/${editing.tenant.id}`}>
                    {t("Open tenant")}
                  </a>
                </Button>
              )}
              <Button
                className="w-full sm:w-auto"
                variant="outline"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                {t("Cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
