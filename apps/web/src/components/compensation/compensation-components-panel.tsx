"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Banknote,
  Home,
  MinusCircle,
  Percent,
  Plane,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompEmptyState } from "@/components/compensation/compensation-states";
import { Chip, IconTile } from "@/components/elevora";
import {
  componentKindLabel,
  formatDate,
  formatMoney,
  SELECT_CLASS,
} from "@/lib/compensation/format";
import { isDeduction, isEarning } from "@/lib/compensation/calc";
import type { CompensationStore } from "@/lib/compensation/store";
import {
  COMPONENT_KINDS,
  type CompActor,
  type CompComponent,
  type CompEmployee,
  type ComponentKind,
} from "@/lib/compensation/types";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

function kindIcon(kind: ComponentKind) {
  switch (kind) {
    case "housing_allowance":
      return Home;
    case "transport_allowance":
      return Plane;
    case "overtime":
      return Percent;
    case "bonus":
    case "commission":
      return Banknote;
    default:
      return isDeduction(kind) ? MinusCircle : Wallet;
  }
}

export function CompensationComponentsPanel({
  components,
  employees,
  store,
  actor,
  isAdmin,
  onChanged,
  onOpenEmployee,
}: {
  components: CompComponent[];
  employees: CompEmployee[];
  store: CompensationStore;
  actor: CompActor;
  isAdmin: boolean;
  onChanged: () => void;
  onOpenEmployee: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [kind, setKind] = useState<ComponentKind>("housing_allowance");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("0");
  const [amountType, setAmountType] = useState<"fixed" | "percent_of_base">("fixed");
  const [error, setError] = useState<string | null>(null);
  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? id;

  const earnings = components.filter((c) => isEarning(c.kind) && c.kind !== "base_salary");
  const deductions = components.filter((c) => isDeduction(c.kind));

  const allowanceCards = useMemo(() => {
    const map = new Map<
      ComponentKind,
      { kind: ComponentKind; people: Set<string>; amount: number; count: number }
    >();
    for (const c of earnings) {
      const cur = map.get(c.kind) ?? {
        kind: c.kind,
        people: new Set<string>(),
        amount: 0,
        count: 0,
      };
      cur.people.add(c.employeeId);
      cur.count += 1;
      if (c.amountType === "fixed") cur.amount += c.amount;
      map.set(c.kind, cur);
    }
    return [...map.values()];
  }, [earnings]);

  function submit() {
    setError(null);
    try {
      store.addComponent(
        {
          employeeId,
          kind,
          label: label || componentKindLabel(kind),
          amount: Number(amount),
          amountType,
          recurring: true,
          effectiveFrom: new Date().toISOString().slice(0, 10),
          effectiveTo: null,
          note: "",
        },
        actor,
      );
      setOpen(false);
      setLabel("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add line");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted">
          {t("Recurring earnings and deductions that feed payroll inputs.")}
        </p>
        {isAdmin ? (
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t("Cancel") : t("Add line item")}
          </Button>
        ) : null}
      </div>

      {open ? (
        <Card className="border-line bg-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-ink">{t("New earning or deduction")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label={t("Employee")}>
              <select
                className={SELECT_CLASS}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("Kind")}>
              <select
                className={SELECT_CLASS}
                value={kind}
                onChange={(e) => setKind(e.target.value as ComponentKind)}
              >
                {COMPONENT_KINDS.filter((k) => k !== "base_salary").map((k) => (
                  <option key={k} value={k}>
                    {componentKindLabel(k)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("Label")}>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("Optional")} />
            </Field>
            <Field label={t("Amount")}>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label={t("Amount type")}>
              <select
                className={SELECT_CLASS}
                value={amountType}
                onChange={(e) => setAmountType(e.target.value as "fixed" | "percent_of_base")}
              >
                <option value="fixed">{t("Fixed monthly")}</option>
                <option value="percent_of_base">{t("% of base")}</option>
              </select>
            </Field>
            {error ? (
              <p className="text-sm text-danger sm:col-span-2">{error}</p>
            ) : null}
            <div className="sm:col-span-2">
              <Button size="sm" className="w-full sm:w-auto" onClick={submit}>
                {t("Save line")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {allowanceCards.length === 0 ? (
        <Card className="border-line bg-surface p-0">
          <CompEmptyState
            title={t("No allowances yet")}
            description={t("Add housing, transport, or other recurring earnings.")}
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
          {allowanceCards.map((card) => {
            const Icon = kindIcon(card.kind);
            return (
              <li key={card.kind}>
                <Card className="border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <IconTile tone="neutral">
                      <Icon className="h-3.5 w-3.5" />
                    </IconTile>
                    <Chip tone="neutral">
                      {card.people.size} {t("people")}
                    </Chip>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-ink">
                    {componentKindLabel(card.kind)}
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                    {formatMoney(card.amount)}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {card.count} {t("active lines")}
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <LineTable
          title={t("Allowances & earnings")}
          rows={earnings}
          nameOf={nameOf}
          onOpen={onOpenEmployee}
          isAdmin={isAdmin}
          onEnd={(id) => {
            store.endComponent(id, actor);
            onChanged();
          }}
        />
        <LineTable
          title={t("Deductions")}
          rows={deductions}
          nameOf={nameOf}
          onOpen={onOpenEmployee}
          isAdmin={isAdmin}
          onEnd={(id) => {
            store.endComponent(id, actor);
            onChanged();
          }}
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function LineTable({
  title,
  rows,
  nameOf,
  onOpen,
  isAdmin,
  onEnd,
}: {
  title: string;
  rows: CompComponent[];
  nameOf: (id: string) => string;
  onOpen: (id: string) => void;
  isAdmin: boolean;
  onEnd: (id: string) => void;
}) {
  return (
    <Card className="border-line bg-surface">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-ink">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {rows.length === 0 ? (
          <div className="px-4 pb-4">
            <CompEmptyState title={t("None")} description={t("No line items in this group.")} />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <button type="button" className="min-w-0 text-left" onClick={() => onOpen(row.employeeId)}>
                  <p className="text-sm font-medium text-ink">{row.label}</p>
                  <p className="text-xs text-ink-muted">
                    {nameOf(row.employeeId)} · {componentKindLabel(row.kind)} {t("· from")}{" "}
                    {formatDate(row.effectiveFrom)}
                    {row.effectiveTo ? ` – ${formatDate(row.effectiveTo)}` : ""}
                  </p>
                </button>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={cn(
                      "text-sm tabular-nums font-medium",
                      isDeduction(row.kind) ? "text-danger" : "text-ink",
                    )}
                  >
                    {row.amountType === "percent_of_base"
                      ? `${row.amount}%`
                      : formatMoney(row.amount)}
                  </span>
                  <Chip tone="neutral">{row.status}</Chip>
                  {isAdmin && row.status === "active" ? (
                    <Button size="sm" variant="ghost" onClick={() => onEnd(row.id)}>
                      {t("End")}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
