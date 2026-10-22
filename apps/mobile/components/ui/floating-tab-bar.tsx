import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/lib/theme";
import {
  IconCalendarClock,
  IconHouse,
  IconListChecks,
  IconMap,
  IconTreePalm,
} from "./icons";

const ICONS: Record<string, typeof IconHouse> = {
  index: IconHouse,
  map: IconMap,
  shifts: IconCalendarClock,
  tasks: IconListChecks,
  leave: IconTreePalm,
};

/** Prototype floating tab bar: 66px, radius 24, accent tick on active.
 * Props match Expo Router 58 `BottomTabBarProps` (navigateToTab + emitter). */
export function FloatingTabBar(props: {
  state: { index: number; routes: Array<{ key: string; name: string }> };
  descriptors: Record<string, { options: Record<string, unknown> }>;
  emitter: { emit: (e: Record<string, unknown>) => { defaultPrevented?: boolean } };
  navigateToTab: (routeKey: string) => void;
  insets: { bottom: number };
}) {
  const { state, descriptors, emitter, navigateToTab, insets } = props;
  const { colors } = useTheme();
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: Math.max(insets.bottom, 12) + 10,
      }}
    >
      <View
        className="h-[66px] flex-row items-center rounded-tabbar border border-line bg-surface px-1"
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options ?? {};
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : typeof options.title === "string"
                ? options.title
                : route.name;
          const Icon = ICONS[route.name] ?? IconHouse;
          const color = focused ? colors.text : colors.muted;
          const badge =
            typeof options.tabBarBadge === "number" || typeof options.tabBarBadge === "string"
              ? options.tabBarBadge
              : null;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={() => {
                const event = emitter.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event?.defaultPrevented) {
                  navigateToTab(route.key);
                }
              }}
              className="h-[54px] flex-1 items-center justify-center rounded-[18px]"
              style={{ alignItems: "center", justifyContent: "center" }}
            >
              {focused ? (
                <View className="absolute top-[2px] h-[3px] w-[22px] rounded-full bg-accent" />
              ) : null}
              <View>
                <Icon size={21} color={color} />
                {badge != null ? (
                  <View className="absolute -end-2 -top-1 min-w-4 items-center justify-center rounded-full bg-ink px-1">
                    <Text className="text-[9.5px] font-semibold text-ink-text">{badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                className={`mt-1 text-[10.5px] ${focused ? "font-semibold text-text" : "font-medium text-muted"}`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
