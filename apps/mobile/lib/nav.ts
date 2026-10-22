import { router, type Href } from "expo-router";

/** Safe back: avoids GO_BACK warning when the stack is empty (refresh / deep link). */
export function goBack(fallback: Href = "/(tabs)") {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
