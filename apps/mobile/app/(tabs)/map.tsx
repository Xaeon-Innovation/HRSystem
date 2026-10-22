import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ElevoraMap } from "@/components/map/elevora-map";
import {
  Avatar,
  Chip,
  IconLayers,
  IconLocate,
  IconSearch,
  Segmented,
} from "@/components/ui";
import { formatDistanceM } from "@/lib/format";
import { metersBetween } from "@/lib/geo-check";
import { captureLocation } from "@/lib/location";
import { listRoutePoints } from "@/lib/location-batch";
import {
  FALLBACK_STYLE,
  fetchMapRegions,
  type TeamMember,
} from "@/lib/map/api";
import type { MapMarker } from "@/lib/map/geojson";
import { subscribeTeamFeed, type TeamFeedStatus } from "@/lib/map/team-feed";
import { useSession } from "@/lib/session";
import { useTodayStore } from "@/lib/today-store";

type Mode = "me" | "team";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const me = useSession((s) => s.me);
  const trackingActive = useTodayStore((s) => s.trackingActive);
  const zoneStatus = useTodayStore((s) => s.zoneStatus);
  const [mode, setMode] = useState<Mode>("me");
  const [styleURL, setStyleURL] = useState(FALLBACK_STYLE);
  const [you, setYou] = useState<{ lat: number; lng: number } | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [feedStatus, setFeedStatus] = useState<TeamFeedStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<Array<{ lat: number; lng: number }>>([]);
  const [follow, setFollow] = useState(0);

  const zone = me?.zones[0]
    ? {
        lat: me.zones[0].lat,
        lng: me.zones[0].lng,
        radiusMeters: me.zones[0].radiusMeters,
      }
    : null;

  const center =
    you ?? (zone ? { lat: zone.lat, lng: zone.lng } : { lat: 25.08, lng: 55.14 });

  const farFromZone =
    you && zone ? metersBetween(you, zone) > zone.radiusMeters * 4 : false;

  useEffect(() => {
    setStyleURL(FALLBACK_STYLE);
    void (async () => {
      try {
        const regions = await fetchMapRegions();
        const candidate = regions.styles.light;
        if (
          candidate &&
          candidate.includes("openfreemap.org") &&
          !candidate.includes("/styles/dark")
        ) {
          setStyleURL(candidate);
        }
      } catch {
        setStyleURL(FALLBACK_STYLE);
      }
    })();
  }, []);

  useEffect(() => {
    let alive = true;
    const ping = async () => {
      try {
        const fix = await captureLocation();
        if (alive) setYou({ lat: fix.lat, lng: fix.lng });
      } catch {
        /* keep prior */
      }
    };
    void ping();
    const id = setInterval(() => void ping(), 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [follow]);

  useEffect(() => {
    if (mode !== "team") return;
    return subscribeTeamFeed((next, status) => {
      setMembers(next);
      setFeedStatus(status);
      setError(
        status === "offline" ? "Team feed offline — showing last poll" : null,
      );
    });
  }, [mode]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const pts = await listRoutePoints(300);
      if (alive) setRoute(pts);
    };
    void load();
    const id = setInterval(() => void load(), 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [trackingActive]);

  const routeKm = useMemo(() => {
    if (route.length < 2) return 0;
    let m = 0;
    for (let i = 1; i < route.length; i++) {
      m += metersBetween(route[i - 1]!, route[i]!);
    }
    return m / 1000;
  }, [route]);

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = [];
    if (you) {
      list.push({
        id: "you",
        lat: you.lat,
        lng: you.lng,
        kind: "you",
        label: "You",
      });
    }
    if (mode === "team") {
      for (const m of members) {
        if (m.lat == null || m.lng == null) continue;
        list.push({
          id: m.employeeId,
          lat: m.lat,
          lng: m.lng,
          kind: m.isClockedIn ? "team-on" : "team-seen",
          label: m.name,
        });
      }
    }
    return list;
  }, [you, mode, members]);

  const canTeam =
    me?.entitlements.liveMap ||
    me?.role === "tenant_admin" ||
    (me?.managerOf ?? 0) > 0;

  const zoneTitle = zoneStatus
    ? zoneStatus.inside
      ? `Inside ${me?.zones[0]?.label ?? "zone"}`
      : `Outside ${me?.zones[0]?.label ?? "zone"}`
    : me?.zones[0]?.label ?? "Work zone";

  const zoneSub = zoneStatus
    ? `${formatDistanceM(zoneStatus.distanceM)} from center`
    : you
      ? `${you.lat.toFixed(4)}, ${you.lng.toFixed(4)}`
      : "Waiting for GPS";

  return (
    <View className="flex-1 bg-frame">
      <ElevoraMap
        styleURL={styleURL}
        center={center}
        zoom={farFromZone ? 12 : 15}
        fitZone={mode === "me" && Boolean(zone) && !farFromZone}
        zone={mode === "me" ? zone : null}
        route={mode === "me" ? route : []}
        markers={markers}
        bleed
      />

      {/* Top search + layers */}
      <View
        className="absolute start-3.5 end-3.5 flex-row items-center gap-2"
        style={{ top: insets.top + 8 }}
      >
        <View className="h-[46px] flex-1 flex-row items-center gap-2 rounded-2xl bg-surface px-3.5 shadow-md">
          <IconSearch size={18} color="#8E8E89" />
          <Text className="text-[13.5px] text-muted">
            {mode === "team" ? "Search team" : "Search places or tasks"}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/offline-maps")}
          className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-surface shadow-md"
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          <IconLayers size={18} color="#121212" />
        </Pressable>
      </View>

      {/* Side locate */}
      <View
        className="absolute end-3.5"
        style={{ top: insets.top + 70 }}
      >
        <Pressable
          onPress={() => setFollow((n) => n + 1)}
          className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-surface shadow-md"
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          <IconLocate size={18} color="#121212" />
        </Pressable>
      </View>

      {/* Bottom card — above floating tab bar */}
      <View
        className="absolute start-3 end-3 rounded-[24px] bg-surface p-3.5 shadow-lg"
        style={{ bottom: Math.max(insets.bottom, 12) + 88 }}
      >
        {canTeam ? (
          <Segmented
            options={[
              { id: "me", label: "Me" },
              { id: "team", label: "My team" },
            ]}
            value={mode}
            onChange={(id) => setMode(id)}
            className="mb-3"
          />
        ) : null}

        {error ? (
          <Text className="mb-2 text-[12px] text-danger">{error}</Text>
        ) : null}

        {mode === "team" ? (
          <>
            <View className="mb-2 flex-row flex-wrap gap-1.5">
              <Chip
                label={`${members.filter((m) => m.isClockedIn).length} on shift`}
                tone="ok"
              />
              <Chip
                label={
                  feedStatus === "live"
                    ? "Live"
                    : feedStatus === "polling"
                      ? "Polling"
                      : "Last seen"
                }
                tone={feedStatus === "live" ? "ok" : "warn"}
              />
            </View>
            {members.length === 0 ? (
              <Text className="text-[12px] text-muted">
                No reports yet — managers see direct reports.
              </Text>
            ) : (
              members.slice(0, 4).map((m, i) => (
                <View
                  key={m.employeeId}
                  className={`flex-row items-center gap-3 ${
                    i > 0 ? "mt-2.5 border-t border-line pt-2.5" : ""
                  }`}
                >
                  <Avatar
                    name={m.name}
                    size={32}
                    presence={m.isClockedIn ? "on" : "off"}
                  />
                  <View className="min-w-0 flex-1">
                    <Text
                      className="text-[14px] font-semibold text-text"
                      numberOfLines={1}
                    >
                      {m.name}
                    </Text>
                    <Text className="text-[12px] text-muted" numberOfLines={1}>
                      {m.isClockedIn
                        ? "On shift"
                        : m.updatedAt
                          ? `Last seen ${new Date(m.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : "No fix"}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <View className="flex-row items-center gap-2.5">
              <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-accent-tint">
                <IconLocate size={18} color="#6FA01B" />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-[14px] font-semibold text-text">
                  {zoneTitle}
                </Text>
                <Text className="mt-0.5 text-[12px] text-muted">{zoneSub}</Text>
              </View>
              <Chip
                label={trackingActive ? "Live" : "Idle"}
                tone={trackingActive ? "ok" : "warn"}
              />
            </View>
            <View className="my-3.5 h-px bg-line" />
            <View className="flex-row">
              <View className="flex-1 items-center">
                <Text className="text-[15px] font-semibold tabular-nums text-text">
                  {routeKm.toFixed(1)} km
                </Text>
                <Text className="text-[11px] text-muted">Today&apos;s route</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-[15px] font-semibold tabular-nums text-text">
                  {route.length}
                </Text>
                <Text className="text-[11px] text-muted">Points</Text>
              </View>
              <View className="flex-1 items-center">
                <Pressable onPress={() => router.push("/offline-maps")}>
                  <Text className="text-[15px] font-semibold tabular-nums text-text">
                    Packs
                  </Text>
                  <Text className="text-center text-[11px] text-muted">
                    Offline
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
