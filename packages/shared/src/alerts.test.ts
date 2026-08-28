import { describe, expect, it } from "vitest";
import {
  ALERT_CATALOG,
  ALERT_CATEGORIES,
  CUSTOM_ALERT_EXAMPLES,
  getCatalogAlert,
  interpolateAlertTemplate,
  metricsForSource,
} from "./alerts.js";

describe("alert catalog", () => {
  it("has unique event keys", () => {
    const keys = ALERT_CATALOG.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("covers every operational category", () => {
    const present = new Set(ALERT_CATALOG.map((e) => e.category));
    for (const category of ALERT_CATEGORIES.filter((c) => c !== "custom")) {
      expect(present.has(category)).toBe(true);
    }
  });

  it("looks up catalog events", () => {
    expect(getCatalogAlert("leave_request_submitted")?.name).toMatch(/leave request/i);
    expect(getCatalogAlert("missing")).toBeUndefined();
  });
});

describe("interpolateAlertTemplate", () => {
  it("fills dynamic fields and dashes missing ones", () => {
    expect(
      interpolateAlertTemplate(
        "{{employee_name}} has {{metric_value}} days ({{unknown}})",
        { employee_name: "Amina", metric_value: 2 },
      ),
    ).toBe("Amina has 2 days (—)");
  });
});

describe("custom examples", () => {
  it("use metrics that belong to their source", () => {
    for (const example of CUSTOM_ALERT_EXAMPLES) {
      expect(metricsForSource(example.source)).toContain(example.metric);
    }
  });
});
