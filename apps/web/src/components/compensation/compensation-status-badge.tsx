import { Chip, StatusChip } from "@/components/elevora";
import type { Tone } from "@/lib/status-tone";
import {
  bandPositionLabel,
  changeStatusLabel,
  compStatusLabel,
  variableStatusLabel,
} from "@/lib/compensation/format";
import type {
  BandPosition,
  ChangeRequestStatus,
  CompStatus,
  VariableStatus,
} from "@/lib/compensation/types";
import { t } from "@/i18n";

const BAND_TONE: Record<BandPosition, Tone> = {
  below: "warn",
  in_band: "ok",
  above: "danger",
};

export function CompStatusBadge({ status }: { status: CompStatus }) {
  const label = compStatusLabel(status);
  return <StatusChip status={label} label={label} />;
}

export function ChangeStatusBadge({ status }: { status: ChangeRequestStatus }) {
  const label = changeStatusLabel(status);
  return <StatusChip status={label} label={label} />;
}

export function VariableStatusBadge({ status }: { status: VariableStatus }) {
  const label = variableStatusLabel(status);
  return <StatusChip status={label} label={label} />;
}

export function BandBadge({ position }: { position: BandPosition | null }) {
  if (!position) {
    return <span className="text-xs text-ink-muted">{t("No band")}</span>;
  }
  return <Chip tone={BAND_TONE[position]}>{bandPositionLabel(position)}</Chip>;
}
