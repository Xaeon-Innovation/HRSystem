import { Redirect } from "expo-router";
import { View } from "react-native";
import { useSession } from "@/lib/session";

/** Splash → auth / unlock / onboarding / tabs. */
export default function Index() {
  const { hydrated, accessToken, unlocked, onboardingDone, workspace } =
    useSession();

  if (!hydrated) {
    return <View className="flex-1 bg-frame" />;
  }

  if (!accessToken) {
    return <Redirect href="/(auth)/workspace" />;
  }

  if (!unlocked) {
    return <Redirect href="/(auth)/unlock" />;
  }

  if (!onboardingDone) {
    return <Redirect href="/(onboarding)/permissions" />;
  }

  if (!workspace) {
    return <Redirect href="/(auth)/workspace" />;
  }

  return <Redirect href="/(tabs)" />;
}
