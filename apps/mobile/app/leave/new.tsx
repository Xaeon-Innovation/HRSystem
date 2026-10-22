import { router } from "expo-router";
import { goBack } from "@/lib/nav";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Card, Chip, Screen, TextField } from "@/components/ui";
import { useLeave } from "@/lib/hooks/use-leave";

const TYPES = [
  { id: "annual", label: "Annual" },
  { id: "sick", label: "Sick" },
  { id: "unpaid", label: "Unpaid" },
];

const LENGTHS = [
  { id: "full" as const, label: "Full day" },
  { id: "first_half" as const, label: "1st half" },
  { id: "second_half" as const, label: "2nd half" },
];

export default function LeaveNewScreen() {
  const { createLeave, busy, error } = useLeave();
  const [typeId, setTypeId] = useState("annual");
  const [partialDay, setPartialDay] =
    useState<(typeof LENGTHS)[number]["id"]>("full");
  const [urgency, setUrgency] = useState<"planned" | "emergency">("planned");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  const submit = async () => {
    const ok = await createLeave({
      typeId,
      startDate,
      endDate,
      partialDay,
      urgency,
      note: note.trim() || undefined,
    });
    if (ok) router.replace("/(tabs)/leave");
  };

  return (
    <Screen>
      <Text className="text-2xl font-semibold text-text">New leave</Text>
      <Text className="mt-2 text-[13px] text-muted">
        Saves to the outbox offline with label Waiting to send.
      </Text>

      <Text className="mb-2 mt-5 text-[13px] font-semibold text-text">Type</Text>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {TYPES.map((t) => (
          <Pressable key={t.id} onPress={() => setTypeId(t.id)}>
            <Chip label={t.label} tone={typeId === t.id ? "ink" : "line"} />
          </Pressable>
        ))}
      </View>

      <Text className="mb-2 text-[13px] font-semibold text-text">Length</Text>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {LENGTHS.map((l) => (
          <Pressable key={l.id} onPress={() => setPartialDay(l.id)}>
            <Chip label={l.label} tone={partialDay === l.id ? "ink" : "line"} />
          </Pressable>
        ))}
      </View>

      <Text className="mb-2 text-[13px] font-semibold text-text">Urgency</Text>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {(
          [
            ["planned", "Planned"],
            ["emergency", "Emergency"],
          ] as const
        ).map(([id, label]) => (
          <Pressable key={id} onPress={() => setUrgency(id)}>
            <Chip label={label} tone={urgency === id ? "ink" : "line"} />
          </Pressable>
        ))}
      </View>

      <Card className="gap-3">
        <TextField label="Start date" value={startDate} onChangeText={setStartDate} />
        <TextField label="End date" value={endDate} onChangeText={setEndDate} />
        <TextField
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
        />
        {error ? <Text className="text-[13px] text-danger">{error}</Text> : null}
      </Card>

      <View className="mt-5 gap-2">
        <Button
          label={busy ? "Saving…" : "Submit request"}
          variant="accent"
          disabled={busy}
          onPress={() => void submit()}
        />
        <Button label="Cancel" variant="soft" onPress={() => goBack()} />
      </View>
    </Screen>
  );
}
