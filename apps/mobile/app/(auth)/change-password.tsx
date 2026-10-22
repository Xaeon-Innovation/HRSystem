import { router } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui";
import { ApiError, changePassword } from "@/lib/api";

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSave = async () => {
    setError(null);
    setBusy(true);
    try {
      await changePassword({ currentPassword, newPassword });
      router.replace("/(onboarding)/permissions");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not change password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-frame px-5 pt-16">
      <Text className="text-2xl font-semibold text-text">Change password</Text>
      <Text className="mt-2 text-[13px] text-muted">
        Your admin requires a new password before you continue.
      </Text>
      <TextInput
        className="mt-6 h-[52px] rounded-2xl border border-line bg-surface px-4 text-text"
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrent}
        placeholder="Current password"
        placeholderTextColor="#8E8E89"
      />
      <TextInput
        className="mt-3 h-[52px] rounded-2xl border border-line bg-surface px-4 text-text"
        secureTextEntry
        value={newPassword}
        onChangeText={setNew}
        placeholder="New password (min 8)"
        placeholderTextColor="#8E8E89"
      />
      {error ? (
        <Text className="mt-3 text-[13px] text-danger">{error}</Text>
      ) : null}
      <Button
        className="mt-4"
        label="Save and continue"
        variant="ink"
        disabled={busy || newPassword.length < 8}
        onPress={() => void onSave()}
      />
    </View>
  );
}
