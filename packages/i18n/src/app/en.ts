/** Mobile `app.*` English strings (structured keys). Expand in Phase 3–9. */
export const appEn = {
  "app.tabs.today": "Today",
  "app.tabs.map": "Map",
  "app.tabs.shifts": "Shifts",
  "app.tabs.tasks": "Tasks",
  "app.tabs.leave": "Leave",
  "app.auth.workspaceTitle": "Find your workspace",
  "app.auth.signInTitle": "Sign in",
  "app.auth.unlockTitle": "Quick unlock",
  "app.clock.in": "Clock in",
  "app.clock.out": "Clock out",
  "app.clock.breakStart": "Start break",
  "app.clock.breakEnd": "End break",
  "app.today.shiftTitle": "Today's shift",
  "app.today.quickActions": "Quick actions",
  "app.today.requestLeave": "Request leave",
  "app.today.myTasks": "My tasks",
  "app.today.history": "History",
  "app.today.upNext": "Up next",
  "app.sync.pending": "Waiting to send",
  "app.offline.banner": "You're offline",
  "app.common.tryAgain": "Try again",
  "app.common.skip": "Skip",
} as const;

export type AppMessageKey = keyof typeof appEn;
