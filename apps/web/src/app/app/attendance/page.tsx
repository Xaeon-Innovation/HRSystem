"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, Users } from "lucide-react";
import { api, getUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { AttendanceDayStrip } from "@/components/attendance/day-strip";
import { AttendancePersonCard } from "@/components/attendance/person-card";
import {
  toIsoDate,
  type AttendancePerson,
} from "@/components/attendance/format";
import { t } from "@/i18n";
import { EmptyState, PageHeader } from "@/components/elevora";

export default function AttendancePage() {
  const [day, setDay] = useState(() => toIsoDate(new Date()));
  const [people, setPeople] = useState<AttendancePerson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const user = typeof window !== "undefined" ? getUser() : null;
  const isAdmin = user?.role === "tenant_admin";

  const load = useCallback(async (forDay: string) => {
    setError(null);
    const data = await api<{ day: string; people: AttendancePerson[] }>(
      `/v1/attendance/day?date=${encodeURIComponent(forDay)}`,
    );
    setDay(data.day);
    setPeople(data.people ?? []);
  }, []);

  useEffect(() => {
    setPeople(null);
    void load(day).catch((e) => {
      setError(e instanceof Error ? e.message : t("Failed"));
      setPeople([]);
    });
    // Only reload when day changes; load is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  async function correct(sessionId: string, note: string) {
    await api(`/v1/attendance/${sessionId}/correct`, {
      method: "PATCH",
      body: JSON.stringify({
        note,
        clockOutAt: new Date().toISOString(),
      }),
    });
    await load(day);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? t("Attendance") : t("History")}
        subtitle={
          isAdmin
            ? t("Who worked, session by session.")
            : t("Your sessions, day by day.")
        }
        actions={
          isAdmin ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/app/attendance/hours">
                <FileSpreadsheet className="h-4 w-4" />
                {t("Hours report")}
              </Link>
            </Button>
          ) : undefined
        }
      />

      <Card className="overflow-hidden p-3 sm:p-4">
        <AttendanceDayStrip day={day} onChange={setDay} />
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {people === null ? (
        <PageSkeleton dense />
      ) : people.length === 0 ? (
        <Card className="overflow-hidden p-0">
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title={t("No one on this day.")}
            subtitle={t("Try another date or check who is scheduled.")}
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
          {people.map((p) => (
            <li key={p.employeeId} className="min-w-0">
              <AttendancePersonCard
                person={p}
                day={day}
                isAdmin={isAdmin}
                onCorrect={correct}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
