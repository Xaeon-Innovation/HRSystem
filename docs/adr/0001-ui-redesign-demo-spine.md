# UI redesign demo spine behind a feature flag

We are shipping a full redesign in waves. The redesign UI is **default-on** unless `NEXT_PUBLIC_UI_REDESIGN=0` or a per-browser `localStorage` override is `"0"`. Optional `NEXT_PUBLIC_UI_REDESIGN_TENANTS` allowlist still scopes who sees it when set. Hiring and Compensation are **persisted JSON modules** (tenant-scoped snapshots via API)-usable for ops workflows, but not full payroll/ATS depth. They are not Preview mocks.

**Status**: accepted

**Consequences**: Redesign is the default experience; set `NEXT_PUBLIC_UI_REDESIGN=0` (or localStorage `"0"`) to fall back to the legacy UI. Treat Hiring/Compensation as real persisted modules with limited depth, not disposable demos.
