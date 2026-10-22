import { Text, View } from "react-native";
import {
  AppHeader,
  Avatar,
  Button,
  Card,
  Chip,
  ClockButton,
  ClockRing,
  EmptyState,
  Hatch,
  IconTile,
  IconHouse,
  OfflineBanner,
  Screen,
  SyncPill,
  TextField,
} from "@/components/ui";
import { useAppI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

/** Hidden gallery: light / dark / RTL smoke check for the UI kit. */
export default function DevUiScreen() {
  const { theme, setThemeOverride, setAccent } = useTheme();
  const { locale, setLocale, t } = useAppI18n();

  return (
    <Screen>
      <Text className="mb-2 text-2xl font-semibold text-text">UI kit</Text>
      <Text className="mb-4 text-muted">
        Theme {theme} · locale {locale}
      </Text>

      <AppHeader
        name="Omar Khalid"
        greeting="Good morning, Omar"
        subtitle="Nile Logistics · Marina Hub"
      />

      <OfflineBanner queued={3} />
      <View className="mb-3 flex-row gap-2">
        <SyncPill label="Synced" tone="ok" />
        <SyncPill label="Offline · 3 queued" tone="pending" />
      </View>

      <Card className="mb-3 items-center py-4">
        <ClockRing progress={0.46}>
          <ClockButton mode="in" label={t("app.clock.in")} subtitle="Marina Hub" />
        </ClockRing>
      </Card>

      <Card className="mb-3 gap-2">
        <Text className="font-semibold text-text">Buttons</Text>
        <Button label={t("app.clock.in")} variant="accent" />
        <Button label="Ink" variant="ink" />
        <Button label="Line" variant="line" size="sm" />
      </Card>

      <Card className="mb-3 gap-2">
        <Text className="mb-1 font-semibold text-text">Chips · Avatar · Tile</Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <Chip label="On time" tone="ok" />
          <Chip label="Late" tone="warn" />
          <Chip label="Outside" tone="danger" />
          <Avatar name="Omar Khalid" presence="on" />
          <IconTile tone="tint">
            <IconHouse size={18} color="#1A2600" />
          </IconTile>
        </View>
      </Card>

      <Card className="mb-3 gap-2">
        <Text className="font-semibold text-text">Field</Text>
        <TextField label="Workspace" placeholder="nile-logistics" />
      </Card>

      <Card className="mb-3 overflow-hidden p-0">
        <Hatch tone="accent" className="h-16 w-full items-center justify-center">
          <Text className="font-semibold text-accent-ink">Hatch accent</Text>
        </Hatch>
      </Card>

      <Card className="mb-3">
        <EmptyState title="Nothing here yet" description="Queued work will show up after sync." />
      </Card>

      <Card className="gap-2">
        <Button
          label={theme === "dark" ? "Light mode" : "Dark mode"}
          variant="soft"
          onPress={() => setThemeOverride(theme === "dark" ? "light" : "dark")}
        />
        <Button
          label={locale === "ar" ? "English" : "العربية"}
          variant="line"
          onPress={() => setLocale(locale === "ar" ? "en" : "ar")}
        />
        <Button label="Teal accent" variant="accent" onPress={() => setAccent("teal")} />
      </Card>
    </Screen>
  );
}
