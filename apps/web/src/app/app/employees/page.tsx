"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Site = {
  id: string;
  name: string;
  code: string;
  branchId: string;
};

type Branch = {
  id: string;
  name: string;
  code: string;
  status: string;
  sites: Site[];
};

type Employee = {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string | null;
  status: string;
  phone: string | null;
  branchId: string | null;
  siteId: string | null;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [org, setOrg] = useState<Branch[]>([]);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [branchId, setBranchId] = useState("");
  const [csv, setCsv] = useState("name,email,role,jobTitle\n");
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [siteBranchId, setSiteBranchId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load(search = q) {
    const [empData, branchData] = await Promise.all([
      api<{ employees: Employee[] }>(
        `/v1/employees${search ? `?q=${encodeURIComponent(search)}` : ""}`,
      ),
      api<{ branches: Branch[] }>("/v1/branches"),
    ]);
    setEmployees(empData.employees);
    setOrg(branchData.branches);
    if (!siteBranchId && branchData.branches[0]) {
      setSiteBranchId(branchData.branches[0].id);
    }
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  function branchNameOf(id: string | null) {
    if (!id) return "Unassigned";
    return org.find((b) => b.id === id)?.name ?? "—";
  }

  async function createEmployee(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/v1/employees", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          role: "employee",
          branchId: branchId || null,
        }),
      });
      setName("");
      setEmail("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function assignBranch(employeeId: string, nextBranchId: string) {
    try {
      await api(`/v1/employees/${employeeId}`, {
        method: "PATCH",
        body: JSON.stringify({
          branchId: nextBranchId || null,
          siteId: null,
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function importCsv() {
    try {
      await api("/v1/employees/import", {
        method: "POST",
        body: JSON.stringify({ csv }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    }
  }

  async function createBranch(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/v1/branches", {
        method: "POST",
        body: JSON.stringify({ name: branchName, code: branchCode }),
      });
      setBranchName("");
      setBranchCode("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function removeBranch(branch: Branch) {
    const ok = window.confirm(
      `Remove branch “${branch.name}”? Sites under it will be deleted and employees will be unassigned.`,
    );
    if (!ok) return;
    setError(null);
    try {
      await api(`/v1/branches/${branch.id}`, { method: "DELETE" });
      if (siteBranchId === branch.id) setSiteBranchId("");
      if (branchId === branch.id) setBranchId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove branch");
    }
  }

  async function createSite(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/v1/sites", {
        method: "POST",
        body: JSON.stringify({
          branchId: siteBranchId,
          name: siteName,
          code: siteCode,
        }),
      });
      setSiteName("");
      setSiteCode("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Employees</h1>
        <p className="text-sm text-muted-foreground">
          Tenant-scoped roster, branches, and CSV onboarding
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Input
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button onClick={() => load(q)}>Search</Button>
      </div>
      <div className="space-y-2">
        {employees.map((emp) => (
          <Card key={emp.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{emp.name}</p>
                <p className="text-xs text-muted-foreground">
                  {emp.email} · {emp.jobTitle ?? "—"} · {emp.role} ·{" "}
                  {branchNameOf(emp.branchId)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/app/analytics/employees/${emp.id}`}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Analytics
                </a>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={emp.branchId ?? ""}
                  onChange={(e) => assignBranch(emp.id, e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {org.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {emp.status}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add employee</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={createEmployee}>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Branch</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {org.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Create
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Branches & sites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm">
            {org.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <div>
                  <span className="font-medium">{b.name}</span>{" "}
                  <span className="text-muted-foreground">({b.code})</span>
                  {b.sites.length ? (
                    <span className="text-muted-foreground">
                      {" "}
                      — {b.sites.map((s) => s.name).join(", ")}
                    </span>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => removeBranch(b)}
                >
                  Remove
                </Button>
              </li>
            ))}
            {org.length === 0 ? (
              <li className="text-muted-foreground">No branches yet.</li>
            ) : null}
          </ul>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={createBranch}>
            <Input
              placeholder="Branch name"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              required
            />
            <Input
              placeholder="Code (cairo)"
              value={branchCode}
              onChange={(e) => setBranchCode(e.target.value)}
              required
            />
            <Button type="submit">Add branch</Button>
          </form>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={createSite}>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={siteBranchId}
              onChange={(e) => setSiteBranchId(e.target.value)}
              required
            >
              <option value="">Branch</option>
              {org.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Site name"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              required
            />
            <Input
              placeholder="Code"
              value={siteCode}
              onChange={(e) => setSiteCode(e.target.value)}
              required
            />
            <Button type="submit" variant="secondary">
              Add site
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CSV import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="min-h-28 w-full rounded-md border border-input bg-background p-3 text-sm"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          <Button onClick={importCsv}>Import CSV</Button>
        </CardContent>
      </Card>
    </div>
  );
}
