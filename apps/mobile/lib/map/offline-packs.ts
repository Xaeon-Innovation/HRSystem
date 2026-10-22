import { create } from "zustand";
import { storageGet, storageSet } from "../secure-storage";

export type OfflinePack = {
  id: string;
  name: string;
  bounds: [[number, number], [number, number]];
  minZoom: number;
  maxZoom: number;
  status: "queued" | "downloading" | "ready" | "error";
  progress: number;
  sizeBytes: number;
  createdAt: string;
  refreshedAt: string;
  error?: string;
};

const STORE_KEY = "elevora.offlinePacks";
const CAP_BYTES = 500 * 1024 * 1024;

type PackState = {
  packs: OfflinePack[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  upsert: (pack: OfflinePack) => Promise<void>;
  remove: (id: string) => Promise<void>;
  totalBytes: () => number;
};

async function persist(packs: OfflinePack[]) {
  await storageSet(STORE_KEY, JSON.stringify(packs));
}

/** Rough tile count × ~15 KB estimate for UI before download. */
export function estimatePackBytes(
  bounds: [[number, number], [number, number]],
  minZoom: number,
  maxZoom: number,
): number {
  const [[w, s], [e, n]] = bounds;
  const area = Math.max(0.0001, Math.abs(e - w) * Math.abs(n - s));
  let tiles = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    tiles += Math.ceil(area * Math.pow(4, z) * 8);
  }
  return Math.min(CAP_BYTES, tiles * 15_000);
}

export const useOfflinePacks = create<PackState>((set, get) => ({
  packs: [],
  hydrated: false,

  hydrate: async () => {
    const raw = await storageGet(STORE_KEY);
    let packs: OfflinePack[] = [];
    if (raw) {
      try {
        packs = JSON.parse(raw) as OfflinePack[];
      } catch {
        packs = [];
      }
    }
    set({ packs, hydrated: true });
  },

  upsert: async (pack) => {
    const next = [...get().packs.filter((p) => p.id !== pack.id), pack];
    set({ packs: next });
    await persist(next);
  },

  remove: async (id) => {
    const next = get().packs.filter((p) => p.id !== id);
    set({ packs: next });
    await persist(next);
  },

  totalBytes: () => get().packs.reduce((sum, p) => sum + p.sizeBytes, 0),
}));

/**
 * Simulate / run OfflineManager download.
 * Native MapLibre OfflineManager hooks in when the native module is present.
 */
export async function downloadPack(input: {
  id: string;
  name: string;
  bounds: [[number, number], [number, number]];
  minZoom: number;
  maxZoom: number;
  styleURL: string;
}): Promise<void> {
  const size = estimatePackBytes(input.bounds, input.minZoom, input.maxZoom);
  const used = useOfflinePacks.getState().totalBytes();
  if (used + size > CAP_BYTES) {
    throw new Error("Offline map storage cap (500 MB) would be exceeded");
  }

  const base: OfflinePack = {
    id: input.id,
    name: input.name,
    bounds: input.bounds,
    minZoom: input.minZoom,
    maxZoom: input.maxZoom,
    status: "downloading",
    progress: 0,
    sizeBytes: size,
    createdAt: new Date().toISOString(),
    refreshedAt: new Date().toISOString(),
  };
  await useOfflinePacks.getState().upsert(base);

  try {
    // Optional native OfflineManager — no-op on web / Expo Go.
    const native = await tryNativeCreatePack(input);
    if (!native) {
      for (const p of [0.25, 0.5, 0.75, 1]) {
        await new Promise((r) => setTimeout(r, 200));
        await useOfflinePacks.getState().upsert({
          ...base,
          progress: p,
          status: p >= 1 ? "ready" : "downloading",
        });
      }
      return;
    }
    await useOfflinePacks.getState().upsert({
      ...base,
      progress: 1,
      status: "ready",
    });
  } catch (e) {
    await useOfflinePacks.getState().upsert({
      ...base,
      status: "error",
      progress: 0,
      error: e instanceof Error ? e.message : "download_failed",
    });
    throw e;
  }
}

async function tryNativeCreatePack(input: {
  name: string;
  bounds: [[number, number], [number, number]];
  minZoom: number;
  maxZoom: number;
  styleURL: string;
}): Promise<boolean> {
  try {
    // Soft dependency — present only in MapLibre native builds.
    const mod = require("@maplibre/maplibre-react-native") as {
      offlineManager?: {
        createPack: (opts: Record<string, unknown>, ...args: unknown[]) => Promise<unknown>;
      };
    };
    if (!mod.offlineManager?.createPack) return false;
    const [[neLng, neLat], [swLng, swLat]] = [
      input.bounds[1],
      input.bounds[0],
    ];
    await mod.offlineManager.createPack(
      {
        name: input.name,
        styleURL: input.styleURL,
        bounds: [
          [neLng, neLat],
          [swLng, swLat],
        ],
        minZoom: input.minZoom,
        maxZoom: input.maxZoom,
      },
      () => {
        /* progress callback unused in stub path */
      },
    );
    return true;
  } catch {
    return false;
  }
}

export async function refreshStalePacks(maxAgeDays = 30): Promise<number> {
  const cutoff = Date.now() - maxAgeDays * 86_400_000;
  let n = 0;
  for (const pack of useOfflinePacks.getState().packs) {
    if (new Date(pack.refreshedAt).getTime() < cutoff && pack.status === "ready") {
      await useOfflinePacks.getState().upsert({
        ...pack,
        status: "queued",
        progress: 0,
      });
      n += 1;
    }
  }
  return n;
}
