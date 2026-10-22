import type { MobileMe, MobileWorkspaceResponse } from "@hr/shared";
import { create } from "zustand";
import { storageDelete, storageGet, storageSet } from "./secure-storage";

const ACCESS_KEY = "elevora.accessToken";
const REFRESH_KEY = "elevora.refreshToken";
const WORKSPACE_KEY = "elevora.workspace";
const ME_KEY = "elevora.me";
const UNLOCKED_KEY = "elevora.unlocked";
const ONBOARDING_KEY = "elevora.onboardingDone";

type SessionState = {
  hydrated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  workspace: MobileWorkspaceResponse | null;
  me: MobileMe | null;
  unlocked: boolean;
  onboardingDone: boolean;
  hydrate: () => Promise<void>;
  setWorkspace: (workspace: MobileWorkspaceResponse | null) => Promise<void>;
  setTokens: (access: string, refresh: string) => Promise<void>;
  setMe: (me: MobileMe | null) => void;
  setUnlocked: (unlocked: boolean) => Promise<void>;
  setOnboardingDone: (done: boolean) => Promise<void>;
  clearSession: () => Promise<void>;
};

export const useSession = create<SessionState>((set, get) => ({
  hydrated: false,
  accessToken: null,
  refreshToken: null,
  workspace: null,
  me: null,
  unlocked: false,
  onboardingDone: false,

  hydrate: async () => {
    const [
      accessToken,
      refreshToken,
      workspaceRaw,
      meRaw,
      unlockedRaw,
      onboardingRaw,
    ] = await Promise.all([
      storageGet(ACCESS_KEY),
      storageGet(REFRESH_KEY),
      storageGet(WORKSPACE_KEY),
      storageGet(ME_KEY),
      storageGet(UNLOCKED_KEY),
      storageGet(ONBOARDING_KEY),
    ]);
    let workspace: MobileWorkspaceResponse | null = null;
    let me: MobileMe | null = null;
    if (workspaceRaw) {
      try {
        workspace = JSON.parse(workspaceRaw) as MobileWorkspaceResponse;
      } catch {
        workspace = null;
      }
    }
    if (meRaw) {
      try {
        me = JSON.parse(meRaw) as MobileMe;
      } catch {
        me = null;
      }
    }
    set({
      accessToken,
      refreshToken,
      workspace,
      me,
      unlocked: unlockedRaw === "1",
      onboardingDone: onboardingRaw === "1",
      hydrated: true,
    });
  },

  setWorkspace: async (workspace) => {
    if (workspace) await storageSet(WORKSPACE_KEY, JSON.stringify(workspace));
    else await storageDelete(WORKSPACE_KEY);
    set({ workspace });
  },

  setTokens: async (accessToken, refreshToken) => {
    await Promise.all([
      storageSet(ACCESS_KEY, accessToken),
      storageSet(REFRESH_KEY, refreshToken),
    ]);
    set({ accessToken, refreshToken });
  },

  setMe: (me) => {
    void (me
      ? storageSet(ME_KEY, JSON.stringify(me))
      : storageDelete(ME_KEY));
    set({ me });
  },

  setUnlocked: async (unlocked) => {
    if (unlocked) await storageSet(UNLOCKED_KEY, "1");
    else await storageDelete(UNLOCKED_KEY);
    set({ unlocked });
  },

  setOnboardingDone: async (done) => {
    if (done) await storageSet(ONBOARDING_KEY, "1");
    else await storageDelete(ONBOARDING_KEY);
    set({ onboardingDone: done });
  },

  clearSession: async () => {
    try {
      const { stopTracking } = require("./tracking") as typeof import("./tracking");
      await stopTracking();
    } catch {
      /* tracking optional at hydrate time */
    }
    await Promise.all([
      storageDelete(ACCESS_KEY),
      storageDelete(REFRESH_KEY),
      storageDelete(ME_KEY),
      storageDelete(UNLOCKED_KEY),
    ]);
    set({
      accessToken: null,
      refreshToken: null,
      me: null,
      unlocked: false,
    });
    void get().workspace;
  },
}));
