import { storageDelete, storageGet, storageSet } from "./secure-storage";

/** Public policy hosted on the marketing site (store listing URL). */
export const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_URL ?? "https://elevora.xaeons.com/privacy";

const BG_DISCLOSURE_KEY = "elevora.bgLocationDisclosureAccepted";

/** Play / Apple: user accepted the in-app prominent disclosure. */
export async function hasAcceptedBgLocationDisclosure(): Promise<boolean> {
  return (await storageGet(BG_DISCLOSURE_KEY)) === "1";
}

export async function acceptBgLocationDisclosure(): Promise<void> {
  await storageSet(BG_DISCLOSURE_KEY, "1");
}

export async function clearBgLocationDisclosure(): Promise<void> {
  await storageDelete(BG_DISCLOSURE_KEY);
}

/** Copy used on the prominent disclosure screen (must stay accurate for stores). */
export const BG_LOCATION_DISCLOSURE = {
  title: "Allow Elevora to use your location all the time?",
  lead: "Elevora Field collects location data to verify you are on shift and to support field operations for your employer.",
  bullets: [
    "Location is used only while you are clocked in (on shift).",
    "On Android, a persistent notification (“On shift · tracking location”) stays visible while tracking runs.",
    "When you grant “Allow all the time” / Always, location may update even when the app is not open — only during an active shift.",
    "Continued use of GPS in the background can dramatically decrease battery life.",
  ],
  acceptLabel: "Continue",
  declineLabel: "Not now",
} as const;
