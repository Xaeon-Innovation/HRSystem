import { Chip, StatusChip } from "@/components/elevora";
import type { Tone } from "@/lib/status-tone";
import { statusLabel, trendLabel } from "@/lib/kpis/format";
import type { KpiStatus, KpiTrend } from "@/lib/kpis/types";

const STATUS_TONE: Record<KpiStatus, Tone> = {
  exceeded: "ok",
  on_track: "ok",
  at_risk: "warn",
  below_target: "danger",
  missing: "neutral",
};

const TREND_TONE: Record<KpiTrend, string> = {
  up: "text-accent-strong",
  down: "text-danger",
  flat: "text-ink-muted",
  new: "text-ink-muted",
};

export function KpiStatusBadge({ status }: { status: KpiStatus }) {
  const label = statusLabel(status);
  return <Chip tone={STATUS_TONE[status]}>{label}</Chip>;
}

export function KpiOnTrackChip({
  onTrack,
}: {
  onTrack: boolean;
}) {
  return (
    <StatusChip
      status={onTrack ? "On track" : "Off track"}
      label={onTrack ? "On track" : "Off track"}
    />
  );
}

export function KpiTrendBadge({ trend }: { trend: KpiTrend }) {
  return (
    <span className={`text-xs font-medium ${TREND_TONE[trend]}`}>
      {trendLabel(trend)}
    </span>
  );
}
