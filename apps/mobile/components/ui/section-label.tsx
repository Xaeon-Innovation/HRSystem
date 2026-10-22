import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

/** Prototype `.sec` — uppercase muted section label with optional trailing link. */
export function SectionLabel({
  children,
  action,
  onAction,
  className = "",
}: {
  children: ReactNode;
  action?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <View
      className={`mb-2.5 mt-5 flex-row items-center justify-between px-0.5 ${className}`}
    >
      <Text className="text-[12px] font-semibold uppercase tracking-[0.07em] text-muted">
        {children}
      </Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text className="text-[12.5px] font-semibold text-text">{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
