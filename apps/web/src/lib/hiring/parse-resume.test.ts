import { describe, expect, it } from "vitest";
import { extractFieldsFromText, toParsedResume } from "./parse-resume";
import { fitScore } from "./fit-score";
import { HiringStore } from "./store";
import type { Candidate, JobOpening } from "./types";

const admin = { id: "emp-karim", name: "Karim Said", role: "tenant_admin" as const };

const SAMPLE_CV = `
Nadia Hassan
Senior Account Executive
nadia.hassan@mail.test
+971 50 123 4567

6 years of experience in consultative B2B sales.

Skills: CRM, Negotiation, Arabic, English, Discovery, Pipeline

Education
Bachelor of Business Administration, AUC
`;

describe("resume extraction", () => {
  it("pulls email, phone, name, years, and skills from CV text", () => {
    const result = extractFieldsFromText(SAMPLE_CV, ["crm", "arabic"]);
    expect(result.fields.email.toLowerCase()).toBe("nadia.hassan@mail.test");
    expect(result.fields.phone.replace(/\s/g, "")).toMatch(/971501234567|97150/);
    expect(result.fields.fullName.toLowerCase()).toContain("nadia");
    expect(result.fields.yearsOfExperience).toBe(6);
    expect(result.fields.skills.map((s) => s.toLowerCase())).toEqual(
      expect.arrayContaining(["crm", "arabic", "english", "negotiation"]),
    );
    expect(toParsedResume(result.fields).source).toBe("extracted");
  });

  it("warns when a file has no readable text", () => {
    const result = extractFieldsFromText("   ");
    expect(result.fields.fullName).toBe("");
    expect(result.warnings.some((w) => /manually/i.test(w))).toBe(true);
  });
});

describe("job-fit score", () => {
  it("scores skill overlap higher when requirements match", () => {
    const store = new HiringStore();
    store.resetDemo();
    const job = store.job("job-ae")!;
    const strong = store.candidate("cand-tarek")!;
    const weak: Candidate = {
      ...strong,
      id: "cand-weak-fit",
      skills: ["Driving"],
      yearsOfExperience: 0,
      parsedResume: { ...strong.parsedResume!, skills: ["Driving"] },
      screeningAnswers: [],
    };
    const high = fitScore(strong, job, store.scorecardsForCandidate(strong.id));
    const low = fitScore(weak, job, []);
    expect(high.score).not.toBeNull();
    expect(low.score).not.toBeNull();
    expect(high.score!).toBeGreaterThan(low.score!);
    expect(high.matchedSkills.length).toBeGreaterThan(0);
  });

  it("floors the score when a knockout screening answer failed", () => {
    const store = new HiringStore();
    store.resetDemo();
    const job = store.job("job-ae")!;
    const c = store.candidate("cand-tarek")!;
    const floored = fitScore(
      {
        ...c,
        screeningAnswers: [{ questionId: "sq-ae-1", answer: "no", knockoutFailed: true }],
      },
      job,
      store.scorecardsForCandidate(c.id),
    );
    expect(floored.knockout).toBe(true);
    expect(floored.score).toBe(12);
    expect(floored.band).toBe("weak");
  });

  it("returns no score for talent-pool candidates without a job", () => {
    const store = new HiringStore();
    store.resetDemo();
    const c = store.candidate("cand-salma")!;
    const result = fitScore(c, null, []);
    expect(result.score).toBeNull();
    expect(result.band).toBeNull();
  });
});

describe("remove and best-fit drafts", () => {
  it("unassigns people to the talent pool when a job is removed", () => {
    const store = new HiringStore();
    store.resetDemo();
    const before = store.candidate("cand-adel")!;
    expect(before.appliedJobId).toBe("job-driver");
    store.removeJob("job-driver", admin);
    expect(store.job("job-driver")).toBeUndefined();
    const adel = store.candidate("cand-adel")!;
    expect(adel).toBeTruthy();
    expect(adel.appliedJobId).toBeNull();
    expect(adel.status).toBe("talent_pool");
    expect(adel.appliedJobTitle).toBe("Talent pool");
  });

  it("hard-deletes a candidate and their best-fit draft", () => {
    const store = new HiringStore();
    store.resetDemo();
    expect(store.bestFitDrafts().some((d) => d.candidateId === "cand-adel")).toBe(true);
    store.removeCandidate("cand-adel", admin);
    expect(store.candidate("cand-adel")).toBeUndefined();
    expect(store.bestFitDrafts().some((d) => d.candidateId === "cand-adel")).toBe(false);
  });

  it("saves a best-fit draft and attaches the person to an open job", () => {
    const store = new HiringStore();
    store.resetDemo();
    const saved = store.saveBestFit("cand-yara", admin, "Call next quarter.");
    expect(saved.candidateId).toBe("cand-yara");
    expect(saved.note).toBe("Call next quarter.");
    const attached = store.attachBestFit(saved.id, "job-ae", admin);
    expect(attached.appliedJobId).toBe("job-ae");
    expect(attached.appliedJobTitle).toBe("Account Executive");
    expect(attached.currentStage).toBe("sourced");
    expect(attached.status).toBe("active");
  });
});

describe("job opening type smoke", () => {
  it("keeps JobOpening available for score tests", () => {
    const store = new HiringStore();
    store.resetDemo();
    const job: JobOpening = store.job("job-ae")!;
    expect(job.title).toBe("Account Executive");
  });
});
