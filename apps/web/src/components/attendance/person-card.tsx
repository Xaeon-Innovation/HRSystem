"use client";

import { useMemo, useState } from "react";
import { LogIn, Pencil, RotateCw } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/status-tone";
import {
  attendanceDisplayStatus,
  formatClockTime,
  presenceModeLabel,
  sessionBarPercent,
  sessionNeedsFix,
  type AttendancePerson,
  type AttendanceSession,
} from "@/components/attendance/format";
import {
  AttendanceLocationMapSheet,
  type ClockMapPoint,
} from "@/components/attendance/location-map-sheet";
import {
  Chip,
  IconTile,
  PersonCell,
  SessionBar,
  type SessionBlock,
} from "@/components/elevora";

function hasCoords(lat?: number | null, lng?: number | null) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

function sessionsToBlocks(
  day: string,
  sessions: AttendanceSession[],
): SessionBlock[] {
  return sessions.map((s) => {
    const startPercent = sessionBarPercent(s.clockInAt, day);
    const endIso = s.clockOutAt ?? new Date().toISOString();
    const endPercent = Math.max(
      startPercent + 1,
      sessionBarPercent(endIso, day),
    );
    let tone: SessionBlock["tone"] = "accent";
    if (s.anomalyFlags?.includes("missed_clock_out")) tone = "warn";
    return {
      id: s.id,
      startPercent,
      widthPercent: Math.min(100 - startPercent, endPercent - startPercent),
      tone,
    };
  });
}

function AttendanceStatusChip({ status }: { status: string }) {
  const tone = statusTone(status);
  return (
    <Chip tone={tone} className="shrink-0">
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          tone === "ok" && "bg-accent",
          tone === "warn" && "bg-warn",
          tone === "danger" && "bg-danger",
          tone !== "ok" &&
            tone !== "warn" &&
            tone !== "danger" &&
            "bg-current opacity-70",
        )}
        aria-hidden
      />
      {t(status)}
    </Chip>
  );
}

function SessionLine({
  session,
  index,
  modeLabel,
  employeeName,
  isAdmin,
  onCorrect,
  onOpenMap,
}: {
  session: AttendanceSession;
  index: number;
  modeLabel: string;
  employeeName: string;
  isAdmin: boolean;
  onCorrect: (sessionId: string, note: string) => Promise<void>;
  onOpenMap: (point: ClockMapPoint) => void;
}) {
  const [fixOpen, setFixOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const needsFix = isAdmin && sessionNeedsFix(session);
  const inClickable = hasCoords(session.clockInLat, session.clockInLng);
  const outClickable = hasCoords(session.clockOutLat, session.clockOutLng);

  const range = (
    <span className="tabular-nums">
      {inClickable ? (
        <button
          type="button"
          className="underline decoration-dotted decoration-ink-muted underline-offset-4 hover:text-accent-strong"
          title={t("View on map")}
          onClick={() =>
            onOpenMap({
              kind: "in",
              at: session.clockInAt,
              lat: session.clockInLat!,
              lng: session.clockInLng!,
              employeeName,
            })
          }
        >
          {formatClockTime(session.clockInAt)}
        </button>
      ) : (
        formatClockTime(session.clockInAt)
      )}
      {" – "}
      {session.clockOutAt ? (
        outClickable ? (
          <button
            type="button"
            className="underline decoration-dotted decoration-ink-muted underline-offset-4 hover:text-accent-strong"
            title={t("View on map")}
            onClick={() =>
              onOpenMap({
                kind: "out",
                at: session.clockOutAt!,
                lat: session.clockOutLat!,
                lng: session.clockOutLng!,
                employeeName,
              })
            }
          >
            {formatClockTime(session.clockOutAt)}
          </button>
        ) : (
          formatClockTime(session.clockOutAt)
        )
      ) : (
        "…"
      )}
    </span>
  );

  return (
    <div className="space-y-2 border-b border-line py-2 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <IconTile tone="neutral" className="h-[26px] w-[26px] rounded-[7px]">
          {index === 0 ? (
            <LogIn className="h-3.5 w-3.5" />
          ) : (
            <RotateCw className="h-3.5 w-3.5" />
          )}
        </IconTile>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{range}</div>
          <div className="truncate text-xs text-ink-muted">
            {t("Session")} {index + 1} · {modeLabel}
          </div>
        </div>
        {needsFix ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 gap-1.5 rounded-full px-3"
            onClick={() => setFixOpen((v) => !v)}
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("Correct")}
          </Button>
        ) : null}
      </div>
      {fixOpen ? (
        <div className="flex flex-col gap-2 ps-[38px] sm:flex-row sm:items-center">
          <Input
            className="min-w-0 flex-1"
            placeholder={t("Correction note")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={busy}
          />
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void onCorrect(session.id, note || t("Admin correction"))
                .then(() => {
                  setFixOpen(false);
                  setNote("");
                })
                .finally(() => setBusy(false));
            }}
          >
            {t("Close shift")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function AttendancePersonCard({
  person,
  day,
  isAdmin,
  onCorrect,
}: {
  person: AttendancePerson;
  day: string;
  isAdmin: boolean;
  onCorrect: (sessionId: string, note: string) => Promise<void>;
}) {
  const status = attendanceDisplayStatus(person);
  const modeLabel = t(presenceModeLabel(person.presenceMode));
  const [mapPoint, setMapPoint] = useState<ClockMapPoint | null>(null);

  const sessionBlocks = useMemo(
    () => sessionsToBlocks(day, person.sessions),
    [day, person.sessions],
  );

  const orderedSessions = useMemo(
    () =>
      [...person.sessions].sort(
        (a, b) =>
          new Date(a.clockInAt).getTime() - new Date(b.clockInAt).getTime(),
      ),
    [person.sessions],
  );

  return (
    <>
      <Card className="h-full">
        <CardContent className="flex min-w-0 flex-col gap-3 p-5">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <PersonCell
              name={person.name}
              subtitle={modeLabel}
              avatar={
                <UserAvatar
                  name={person.name}
                  avatarUrl={person.avatarUrl}
                  size="md"
                />
              }
            />
            <AttendanceStatusChip status={status} />
          </div>

          {person.sessions.length > 0 ? (
            <SessionBar
              blocks={sessionBlocks}
              dayLabels={["06:00", "12:00", "18:00"]}
            />
          ) : null}

          <div className="min-w-0">
            {orderedSessions.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("No clock")}</p>
            ) : (
              orderedSessions.map((s, i) => (
                <SessionLine
                  key={s.id}
                  session={s}
                  index={i}
                  modeLabel={modeLabel}
                  employeeName={person.name}
                  isAdmin={isAdmin}
                  onCorrect={onCorrect}
                  onOpenMap={setMapPoint}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
      <AttendanceLocationMapSheet
        point={mapPoint}
        onOpenChange={(open) => {
          if (!open) setMapPoint(null);
        }}
      />
    </>
  );
}
