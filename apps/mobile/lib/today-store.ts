import { create } from "zustand";
import type { MobileMe } from "@hr/shared";

export type ClockState = "off" | "on" | "break";

export type ZoneStatus = {
  inside: boolean;
  distanceM: number;
} | null;

type TodayStore = {
  clockState: ClockState;
  sessionJson: Record<string, unknown> | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  lastLocationLabel: string | null;
  trackingActive: boolean;
  zoneStatus: ZoneStatus;
  /** True when on-shift tracking needs the store-compliant Always disclosure. */
  needsBgDisclosure: boolean;
  setClockState: (s: ClockState) => void;
  setSessionJson: (s: Record<string, unknown> | null) => void;
  setLoading: (v: boolean) => void;
  setSyncing: (v: boolean) => void;
  setError: (e: string | null) => void;
  setLastLocationLabel: (s: string | null) => void;
  setTrackingActive: (v: boolean) => void;
  setZoneStatus: (s: ZoneStatus) => void;
  setNeedsBgDisclosure: (v: boolean) => void;
  me: MobileMe | null;
  setMeLocal: (me: MobileMe | null) => void;
};

export const useTodayStore = create<TodayStore>((set) => ({
  clockState: "off",
  sessionJson: null,
  loading: true,
  syncing: false,
  error: null,
  lastLocationLabel: null,
  trackingActive: false,
  zoneStatus: null,
  needsBgDisclosure: false,
  me: null,
  setClockState: (clockState) => set({ clockState }),
  setSessionJson: (sessionJson) => set({ sessionJson }),
  setLoading: (loading) => set({ loading }),
  setSyncing: (syncing) => set({ syncing }),
  setError: (error) => set({ error }),
  setLastLocationLabel: (lastLocationLabel) => set({ lastLocationLabel }),
  setTrackingActive: (trackingActive) => set({ trackingActive }),
  setZoneStatus: (zoneStatus) => set({ zoneStatus }),
  setNeedsBgDisclosure: (needsBgDisclosure) => set({ needsBgDisclosure }),
  setMeLocal: (me) => set({ me }),
}));
