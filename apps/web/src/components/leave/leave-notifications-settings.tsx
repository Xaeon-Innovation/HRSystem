"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaveNotificationSetting } from "@/lib/leave/types";

export function LeaveNotificationsSettings({
  settings,
  onChange,
}: {
  settings: LeaveNotificationSetting[];
  onChange: (event: LeaveNotificationSetting["event"], patch: Partial<LeaveNotificationSetting>) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Notifications & reminders</CardTitle>
        <p className="text-xs text-muted-foreground">
          Structure for submit, decide, remind, escalate, cancel, and balance updates. Delivery can plug into the existing alerts service later.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto px-0">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-y bg-secondary/50 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2">Event</th>
              <th className="px-3 py-2">Employee</th>
              <th className="px-3 py-2">Manager</th>
              <th className="px-3 py-2">Admin</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((s) => (
              <tr key={s.event} className="border-b last:border-0">
                <td className="px-4 py-2">
                  <p className="font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </td>
                {(["employee", "manager", "admin"] as const).map((role) => (
                  <td key={role} className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={s[role]}
                      onChange={(e) => onChange(s.event, { [role]: e.target.checked })}
                      aria-label={`${s.label} ${role}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
