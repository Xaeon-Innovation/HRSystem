import { Linking, Pressable, Text, View } from "react-native";
import {
  IconChevronRight,
  IconLocate,
  IconX,
  Screen,
} from "@/components/ui";
import { goBack } from "@/lib/nav";
import { PRIVACY_POLICY_URL } from "@/lib/privacy";
import { useTheme } from "@/lib/theme";

const SECTIONS = [
  {
    title: "What we collect on this device",
    body: "Sign-in tokens on this device, clock and break events, task deliverables you attach, and location points while you are on shift.",
  },
  {
    title: "When location is used",
    body: "When In Use: clock-in checks against your work zone. Always / all-the-time: only for mobile-presence field staff, and only while clocked in. Tracking stops when you clock out or sign out.",
  },
  {
    title: "Background tracking",
    body: "If you allow background location, Elevora may update your position while the app is not open during an active shift. Android shows a persistent “On shift · tracking location” notification. Background GPS can use more battery.",
  },
  {
    title: "Who can see your data",
    body: "Your employer’s admins and the roles they grant in Elevora. Xaeon accesses tenant data only for support with permission.",
  },
  {
    title: "Accounts & deletion",
    body: "Elevora Field does not let you create an account. Your employer invites you. To delete your account or personal data, contact your HR / admin; they can remove you from the workspace. Privacy questions: privacy@xaeons.com.",
  },
] as const;

export default function PrivacyScreen() {
  const { colors } = useTheme();

  return (
    <Screen>
      <View className="mb-1 flex-row items-center gap-2.5 pb-3.5 pt-1.5">
        <Text className="flex-1 text-2xl font-semibold tracking-tight text-text">
          Location & privacy
        </Text>
        <Pressable
          onPress={() => goBack()}
          className="h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-line bg-surface"
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          <IconX size={18} color={colors.text} />
        </Pressable>
      </View>

      <View className="mb-3 flex-row items-start gap-3 rounded-[20px] border border-line bg-surface p-3.5">
        <IconLocate size={20} color="#6FA01B" />
        <Text className="min-w-0 flex-1 text-[13px] leading-snug text-muted">
          We only track location while you are on shift for your employer’s
          field operations.
        </Text>
      </View>

      <View className="gap-4">
        {SECTIONS.map((s) => (
          <View key={s.title}>
            <Text className="text-[15px] font-semibold text-text">{s.title}</Text>
            <Text className="mt-1.5 text-[13px] leading-relaxed text-muted">
              {s.body}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
        className="mt-6 flex-row items-center gap-2 rounded-[20px] border border-line bg-surface px-3.5 py-3.5"
        style={{ flexDirection: "row", alignItems: "center" }}
      >
        <Text className="flex-1 text-[14px] font-medium text-text">
          Full privacy policy
        </Text>
        <IconChevronRight size={18} color={colors.faint} />
      </Pressable>
      <Text className="mt-2 text-center text-[11px] text-muted">
        {PRIVACY_POLICY_URL}
      </Text>
    </Screen>
  );
}
