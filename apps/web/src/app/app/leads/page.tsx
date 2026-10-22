"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Chip,
  EmptyState,
  Kanban,
  KanbanCard,
  KanbanColumn,
  Notice,
  PageHeader,
  PersonCell,
} from "@/components/elevora";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UserPlus } from "lucide-react";
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

const STATUS_LABEL: Record<(typeof STATUSES)[number], string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  closed: "Closed",
};

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

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(
      STATUSES.map((s) => [s, [] as Lead[]]),
    ) as Record<(typeof STATUSES)[number], Lead[]>;
    for (const lead of leads) {
      const key = (
        STATUSES.includes(lead.status as (typeof STATUSES)[number])
          ? lead.status
          : "new"
      ) as (typeof STATUSES)[number];
      map[key].push(lead);
    }
    return map;
  }, [leads]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Leads")}
        subtitle={`${t("Demo and signup leads")} · ${total}`}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t("Search name, company, email")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="h-10 rounded-sm border border-line-strong bg-surface px-3 text-sm text-ink"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{t("All statuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-sm border border-line-strong bg-surface px-3 text-sm text-ink"
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

      {error ? <Notice tone="warn">{error}</Notice> : null}

      {leads.length === 0 ? (
        <Card>
          <EmptyState
            icon={<UserPlus className="h-5 w-5" aria-hidden />}
            title={t("No leads found")}
          />
        </Card>
      ) : (
        <Kanban>
          {STATUSES.map((s) => (
            <KanbanColumn
              key={s}
              title={t(STATUS_LABEL[s])}
              count={byStatus[s].length}
            >
              {byStatus[s].map((lead) => (
                <KanbanCard key={lead.id}>
                  <PersonCell
                    name={lead.company || lead.name}
                    subtitle={[
                      lead.name,
                      lead.planCode,
                      lead.phone,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Chip>{lead.source}</Chip>
                    <span className="text-2xs text-ink-muted tabular">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => {
                      setEditing(lead);
                      setNotes(lead.notes ?? "");
                    }}
                  >
                    {t("Update")}
                  </Button>
                </KanbanCard>
              ))}
            </KanbanColumn>
          ))}
        </Kanban>
      )}

      <Sheet
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open && !busy) setEditing(null);
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editing?.company} — {editing?.name}
            </SheetTitle>
            <SheetDescription>{editing?.email}</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-3">
            {editing ? (
              <>
                <div className="space-y-1">
                  <Label>{t("Status")}</Label>
                  <select
                    className="h-10 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-ink"
                    value={editing.status}
                    onChange={(e) =>
                      setEditing((l) =>
                        l ? { ...l, status: e.target.value } : l,
                      )
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>{t("Notes")}</Label>
                  <textarea
                    className="min-h-24 w-full rounded-sm border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
                        const slug =
                          editing.company
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
                    <Button
                      asChild
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
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
              </>
            ) : null}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
