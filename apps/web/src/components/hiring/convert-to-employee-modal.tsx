"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { SELECT_CLASS } from "@/lib/hiring/format";
import type { Candidate, EmployeeConvertDraft, HiringBranch } from "@/lib/hiring/types";

export function ConvertToEmployeeModal({
  candidate,
  draft,
  branches,
  open,
  busy,
  error,
  onOpenChange,
  onConvert,
}: {
  candidate: Candidate | null;
  draft: EmployeeConvertDraft | null;
  branches: HiringBranch[];
  open: boolean;
  busy: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConvert: (draft: EmployeeConvertDraft) => void | Promise<void>;
}) {
  const [form, setForm] = useState<EmployeeConvertDraft>(
    draft ?? {
      name: "",
      email: "",
      phone: "",
      jobTitle: "",
      hireDate: "",
      nationalId: "",
      dateOfBirth: "",
      address: "",
      department: "",
      branchId: "",
    },
  );

  useEffect(() => {
    if (draft) setForm(draft);
  }, [draft, open]);

  function patch(p: Partial<EmployeeConvertDraft>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-foreground/30 backdrop-blur-[2px]" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[61] max-h-[min(90dvh,40rem)] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-card p-5 shadow-2xl">
          <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
            Convert to employee
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
            {candidate
              ? `Prefill ${candidate.fullName} into the employee roster. Required HR fields that were not on the candidate file still need to be completed.`
              : "Create an employee record from this hire."}
          </DialogPrimitive.Description>
          {error ? (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-950 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
              {error}
            </p>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(e) => patch({ email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => patch({ phone: e.target.value })} />
            </Field>
            <Field label="Job title">
              <Input value={form.jobTitle} onChange={(e) => patch({ jobTitle: e.target.value })} />
            </Field>
            <Field label="Join / hire date">
              <Input type="date" value={form.hireDate} onChange={(e) => patch({ hireDate: e.target.value })} />
            </Field>
            <Field label="Branch">
              <select
                className={SELECT_CLASS}
                value={form.branchId}
                onChange={(e) => patch({ branchId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="National ID">
              <Input value={form.nationalId} onChange={(e) => patch({ nationalId: e.target.value })} />
            </Field>
            <Field label="Date of birth">
              <Input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => patch({ dateOfBirth: e.target.value })}
              />
            </Field>
            <div className="space-y-1 sm:col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => patch({ address: e.target.value })} />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Resume attachments stay on the candidate file. Link them from the employee profile after
            the record exists.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={() => void onConvert(form)}>
              {busy ? "Creating…" : "Create employee"}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export async function createEmployeeFromDraft(draft: EmployeeConvertDraft) {
  return api<{ employee: { id: string; name: string }; temporaryPassword?: string }>("/v1/employees", {
    method: "POST",
    body: JSON.stringify({
      name: draft.name,
      email: draft.email,
      phone: draft.phone,
      role: "employee",
      jobTitle: draft.jobTitle,
      nationalId: draft.nationalId,
      dateOfBirth: draft.dateOfBirth,
      address: draft.address,
      hireDate: draft.hireDate,
      branchId: draft.branchId || null,
    }),
  });
}
