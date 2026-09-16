"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/lib/api";
import { useLocationStream } from "@/hooks/use-location-stream";
import type { LastKnownPosition } from "@/lib/offline-queue";

type AttendanceStatus = {
  clockedIn: boolean;
  liveTracking?: boolean;
  complianceTracking?: boolean;
  pingIntervalSec?: number;
};

type ClockStatusContextValue = {
  clockedIn: boolean;
  locationError: string | null;
  lastKnownPosition: LastKnownPosition | null;
  setLocationError: (msg: string | null) => void;
  refreshStatus: () => Promise<boolean>;
  setClockedIn: (value: boolean) => void;
};

const ClockStatusContext = createContext<ClockStatusContextValue | null>(null);

export function ClockStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [clockedIn, setClockedIn] = useState(false);
  const [liveTracking, setLiveTracking] = useState(false);
  const [complianceTracking, setComplianceTracking] = useState(false);
  const [pingIntervalSec, setPingIntervalSec] = useState<number | undefined>();
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastKnownPosition, setLastKnownPosition] =
    useState<LastKnownPosition | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await api<AttendanceStatus>("/v1/attendance/status");
      setClockedIn(status.clockedIn);
      setLiveTracking(status.liveTracking === true);
      setComplianceTracking(status.complianceTracking === true);
      if (typeof status.pingIntervalSec === "number") {
        setPingIntervalSec(status.pingIntervalSec);
      }
      return status.clockedIn;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    const onOnline = () => {
      void refreshStatus();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refreshStatus]);

  useLocationStream(clockedIn && (liveTracking || complianceTracking), {
    pingIntervalSec,
    onError: (msg) => setLocationError(msg),
    onFix: (pos) => setLastKnownPosition(pos),
    onStatusChange: (next) => {
      if (!next) setClockedIn(false);
    },
  });

  const value = useMemo(
    () => ({
      clockedIn,
      locationError,
      lastKnownPosition,
      setLocationError,
      refreshStatus,
      setClockedIn,
    }),
    [clockedIn, locationError, lastKnownPosition, refreshStatus],
  );

  return (
    <ClockStatusContext.Provider value={value}>
      {children}
    </ClockStatusContext.Provider>
  );
}

export function useClockStatus() {
  const ctx = useContext(ClockStatusContext);
  if (!ctx) {
    throw new Error("useClockStatus must be used within ClockStatusProvider");
  }
  return ctx;
}
