import { View, type ViewProps } from "react-native";

export function Card({ className = "", ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-card border border-line bg-surface p-4 ${className}`}
      {...props}
    />
  );
}
