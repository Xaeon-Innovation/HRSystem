import { describe, expect, it } from "vitest";
import {
  cleanFeatureOverrides,
  resolveEffectiveFeatures,
  sanitizePlanFeatures,
} from "./plan-features.js";
import { expandLegacyFeatureRecord, derivePackFlags } from "./modules.js";

describe("expandLegacyFeatureRecord", () => {
  it("expands fieldOps and peopleOps into modules", () => {
    expect(
      expandLegacyFeatureRecord({
        fieldOps: true,
        peopleOps: false,
        analytics: true,
      }),
    ).toMatchObject({
      liveMap: true,
      teamToday: true,
      leave: false,
      hiring: false,
      kpis: false,
      compensation: false,
      analytics: true,
    });
  });

  it("does not overwrite explicit module keys", () => {
    expect(
      expandLegacyFeatureRecord({
        fieldOps: true,
        liveMap: false,
      }),
    ).toMatchObject({ liveMap: false, teamToday: true });
  });
});

describe("resolveEffectiveFeatures", () => {
  it("inherits plan values when overrides are absent", () => {
    expect(
      resolveEffectiveFeatures(
        { liveMap: true, leave: false, analytics: true },
        null,
      ),
    ).toEqual({ liveMap: true, leave: false, analytics: true });
  });

  it("expands legacy packs then applies overrides", () => {
    expect(
      resolveEffectiveFeatures(
        { fieldOps: false, peopleOps: true },
        { hiring: false },
      ),
    ).toMatchObject({
      liveMap: false,
      teamToday: false,
      leave: true,
      hiring: false,
      kpis: true,
      compensation: true,
    });
  });

  it("grants a feature when override is true", () => {
    expect(
      resolveEffectiveFeatures(
        { liveMap: false, integrations: false },
        { integrations: true },
      ),
    ).toEqual({ liveMap: false, integrations: true });
  });

  it("preserves numeric plan limits", () => {
    expect(
      resolveEffectiveFeatures(
        { liveMap: true, pingIntervalSec: 20, locationRetentionDays: 60 },
        { liveMap: false },
      ),
    ).toEqual({
      liveMap: false,
      pingIntervalSec: 20,
      locationRetentionDays: 60,
    });
  });
});

describe("sanitizePlanFeatures", () => {
  it("keeps known boolean and limit keys only", () => {
    expect(
      sanitizePlanFeatures({
        leave: true,
        unknown: true,
        pingIntervalSec: 15,
        trialDays: 14,
        junk: "x",
      } as Record<string, boolean | number | string>),
    ).toEqual({
      leave: true,
      pingIntervalSec: 15,
      trialDays: 14,
    });
  });

  it("expands legacy packs on sanitize", () => {
    expect(
      sanitizePlanFeatures({
        fieldOps: true,
        peopleOps: true,
      }),
    ).toMatchObject({
      liveMap: true,
      teamToday: true,
      leave: true,
      hiring: true,
    });
  });
});

describe("cleanFeatureOverrides", () => {
  it("drops null/undefined inherit values", () => {
    expect(
      cleanFeatureOverrides({
        liveMap: true,
        leave: null,
        analytics: undefined,
        integrations: false,
      }),
    ).toEqual({ liveMap: true, integrations: false });
  });
});

describe("derivePackFlags", () => {
  it("derives packs from modules", () => {
    expect(
      derivePackFlags({ liveMap: true, leave: true, analytics: false }),
    ).toEqual({
      fieldOps: true,
      peopleOps: true,
      analytics: false,
      integrations: false,
    });
  });
});
