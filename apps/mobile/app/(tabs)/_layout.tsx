import { Tabs } from "expo-router";
import { FloatingTabBar } from "@/components/ui";
import { countActiveTasks, useTasks } from "@/lib/hooks/use-tasks";
import { useAppI18n } from "@/lib/i18n";

export default function TabsLayout() {
  const { t } = useAppI18n();
  const { items } = useTasks();
  const openCount = countActiveTasks(items);

  return (
    <Tabs
      // Expo Router 58 tabBar props differ slightly from RN Navigation's type.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tabBar={(props) => <FloatingTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("app.tabs.today") }} />
      <Tabs.Screen name="map" options={{ title: t("app.tabs.map") }} />
      <Tabs.Screen name="shifts" options={{ title: t("app.tabs.shifts") }} />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t("app.tabs.tasks"),
          tabBarBadge: openCount > 0 ? openCount : undefined,
        }}
      />
      <Tabs.Screen name="leave" options={{ title: t("app.tabs.leave") }} />
    </Tabs>
  );
}
