"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Employee = {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string | null;
  status: string;
  phone: string | null;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [csv, setCsv] = useState("name,email,role,jobTitle\n");
  const [error, setError] = useState<string | null>(null);

  async function load(search = q) {
    const data = await api<{ employees: Employee[] }>(
      `/v1/employees${search ? `?q=${encodeURIComponent(search)}` : ""}`,
    );
    setEmployees(data.employees);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function createEmployee(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/v1/employees", {
        method: "POST",
        body: JSON.stringify({ name, email, role: "employee" }),
      });
      setName("");
      setEmail("");
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Employees</h1>
        <p className="text-sm text-muted-foreground">
          Tenant-scoped roster and CSV onboarding
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
            <CardContent className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{emp.name}</p>
                <p className="text-xs text-muted-foreground">
                  {emp.email} · {emp.jobTitle ?? "—"} · {emp.role}
                </p>
              </div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {emp.status}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add employee</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={createEmployee}>
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
