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

type ClockStatusContextValue = {
  clockedIn: boolean;
  locationError: string | null;
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
  const [locationError, setLocationError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await api<{ clockedIn: boolean }>(
        "/v1/attendance/status",
      );
      setClockedIn(status.clockedIn);
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

  useLocationStream(clockedIn, {
    onError: (msg) => setLocationError(msg),
    onStatusChange: (next) => {
      if (!next) setClockedIn(false);
    },
  });

  const value = useMemo(
    () => ({
      clockedIn,
      locationError,
      setLocationError,
      refreshStatus,
      setClockedIn,
    }),
    [clockedIn, locationError, refreshStatus],
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
