import { ScrollView, View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({
  children,
  scroll = true,
  className = "",
  ...props
}: ViewProps & { scroll?: boolean; className?: string }) {
  const body = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-[18px] pb-[110px] pt-1"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1 px-[18px] pb-[110px] pt-1">{children}</View>
  );

  return (
    <SafeAreaView className={`flex-1 bg-frame ${className}`} {...props}>
      {body}
    </SafeAreaView>
  );
}
