import type { MobileOutboxEvent } from "@hr/shared";

/** Server ordering key — one lane per aggregate. */
export function aggregateKeyFor(
  event: MobileOutboxEvent,
  userId: string,
): string {
  switch (event.type) {
    case "clock.in":
    case "clock.out":
    case "break.start":
    case "break.end":
    case "overtime.stay":
    case "overtime.decline":
    case "zone.exit":
    case "zone.enter":
      return `clock:${userId}`;
    case "leave.create":
    case "leave.cancel":
    case "leave.resubmit":
    case "leave.decide":
      return "leave";
    case "task.status":
    case "task.comment":
    case "task.deliverable.link":
    case "task.deliverable.file":
    case "task.review":
      return `task:${event.payload.taskId}`;
    case "notification.read":
      return `notification:${event.payload.notificationId}`;
    case "notification.readAll":
      return "notification:all";
    default:
      return "misc";
  }
}
