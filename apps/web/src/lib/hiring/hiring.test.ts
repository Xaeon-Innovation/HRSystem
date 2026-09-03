import { describe, expect, it } from "vitest";
import { HiringStore } from "./store";
import { timeToFillDays, timeToHireDays } from "./reports";

const admin = { id: "emp-karim", name: "Karim Said", role: "tenant_admin" as const };

describe("HiringStore workflow", () => {
  it("preserves stage history and duration when a candidate moves", () => {
    const store = new HiringStore();
    const before = store.candidate("cand-nadia")!;
    expect(before.currentStage).toBe("sourced");
    store.moveCandidate("cand-nadia", "resume_reviewed", admin, "CV looks solid");
    const after = store.candidate("cand-nadia")!;
    expect(after.currentStage).toBe("resume_reviewed");
    expect(after.stageHistory.some((h) => h.stage === "sourced" && h.leftAt)).toBe(true);
    expect(after.stageHistory.some((h) => h.stage === "resume_reviewed" && !h.leftAt)).toBe(true);
  });

  it("keeps rejected candidates in the talent pool when opted in", () => {
    const store = new HiringStore();
    store.rejectCandidate("cand-yara", admin, true, "Not ready this cycle");
    const c = store.candidate("cand-yara")!;
    expect(c.currentStage).toBe("rejected");
    expect(c.status).toBe("talent_pool");
    expect(c.keepInTalentPool).toBe(true);
  });

  it("moves the candidate to offer_accepted when an offer is accepted", () => {
    const store = new HiringStore();
    store.setOfferStatus("off-samir", "accepted", admin);
    expect(store.candidate("cand-samir")?.currentStage).toBe("offer_accepted");
  });

  it("links a hired candidate to an employee record on convert", () => {
    const store = new HiringStore();
    store.markConverted("cand-farah", "emp-farah-new", admin);
    const c = store.candidate("cand-farah")!;
    expect(c.currentStage).toBe("hired");
    expect(c.convertedEmployeeId).toBe("emp-farah-new");
    expect(c.convertedAt).toBeTruthy();
    const job = store.job("job-ops")!;
    expect(job.filledCount).toBeGreaterThanOrEqual(1);
  });

  it("blocks interviewers from creating jobs", () => {
    const store = new HiringStore();
    const interviewer = {
      id: "emp-maya",
      name: "Maya Soliman",
      role: "employee" as const,
      employeeId: "emp-maya",
    };
    expect(store.canAccess(interviewer)).toBe(true);
    expect(() =>
      store.createJob(
        {
          title: "Should fail",
          department: "Sales",
          branchId: "br-downtown",
          location: "Downtown",
          employmentType: "full_time",
          openingsCount: 1,
          hiringManagerId: "emp-karim",
          recruiterOwnerId: "emp-karim",
          priority: "low",
          status: "draft",
          openedAt: "2026-08-29",
          targetHireDate: "",
          salaryRangeMin: "",
          salaryRangeMax: "",
          description: "",
          requirements: "",
          responsibilities: "",
          screeningQuestions: [],
        },
        interviewer,
      ),
    ).toThrow(/Only HR/);
  });

  it("computes time to hire from pipeline entry to offer acceptance", () => {
    const store = new HiringStore();
    const lina = store.candidate("cand-lina")!;
    const days = timeToHireDays(lina, store.offers());
    expect(days).toBeGreaterThan(0);
  });

  it("computes time to fill from requisition open date to offer acceptance", () => {
    const store = new HiringStore();
    const job = store.job("job-ops")!;
    const days = timeToFillDays(job, store.offers(), store.candidates());
    expect(days).toBeGreaterThan(0);
  });

  it("flags duplicate emails", () => {
    const store = new HiringStore();
    const dups = store.duplicateIds();
    expect(dups.has("cand-nadia")).toBe(true);
    expect(dups.has("cand-nadia-dup")).toBe(true);
  });
});
