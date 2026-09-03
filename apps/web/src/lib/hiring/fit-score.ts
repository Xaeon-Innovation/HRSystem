import { tokenizeJobText } from "./parse-resume";
import type { Candidate, InterviewScorecard, JobOpening } from "./types";

export type FitBand = "strong" | "good" | "fair" | "weak";

export type FitScoreResult = {
  score: number | null;
  band: FitBand | null;
  matchedSkills: string[];
  missingSkills: string[];
  knockout: boolean;
  usedInterview: boolean;
};

const JOB_SKILL_STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "you",
  "will",
  "from",
  "this",
  "that",
  "have",
  "your",
  "our",
  "are",
  "who",
  "able",
  "least",
  "into",
  "after",
  "high",
  "keep",
  "must",
  "plus",
]);

export function fitScore(
  candidate: Candidate,
  job: JobOpening | null | undefined,
  scorecards: InterviewScorecard[] = [],
): FitScoreResult {
  if (!job) {
    return {
      score: null,
      band: null,
      matchedSkills: [],
      missingSkills: [],
      knockout: false,
      usedInterview: false,
    };
  }

  const knockout = candidate.screeningAnswers.some((a) => a.knockoutFailed);
  if (knockout) {
    return {
      score: 12,
      band: "weak",
      matchedSkills: [],
      missingSkills: jobSkillNeedles(job).slice(0, 6),
      knockout: true,
      usedInterview: false,
    };
  }

  const needed = jobSkillNeedles(job);
  const have = new Set(
    [
      ...candidate.skills,
      ...(candidate.parsedResume?.skills ?? []),
      ...tokenizeJobText(candidate.parsedResume?.summary),
    ].map((s) => s.toLowerCase()),
  );
  const matched = needed.filter((n) => [...have].some((h) => h.includes(n) || n.includes(h)));
  const missing = needed.filter((n) => !matched.includes(n));
  const skillRatio = needed.length ? matched.length / needed.length : candidate.skills.length ? 0.5 : 0.2;
  const skillPts = Math.round(skillRatio * 50);

  const targetYears = inferTargetYears(job);
  const years = candidate.yearsOfExperience || candidate.parsedResume?.yearsOfExperience || 0;
  let expPts = 25;
  if (years + 0.5 < targetYears.min) expPts = Math.round(25 * Math.max(0.2, years / Math.max(targetYears.min, 1)));
  else if (years > targetYears.max) expPts = 20;
  else expPts = 25;

  const hasScreening = candidate.screeningAnswers.length > 0;
  const screeningPts = hasScreening ? 15 : 0;

  const cards = scorecards.filter((s) => s.candidateId === candidate.id);
  let interviewPts = 0;
  let usedInterview = false;
  if (cards.length) {
    const avg =
      cards.reduce(
        (n, c) => n + (c.technicalScore + c.communicationScore + c.cultureFitScore) / 3,
        0,
      ) / cards.length;
    interviewPts = Math.round((avg / 5) * 10);
    usedInterview = true;
  }

  const available = 50 + 25 + (hasScreening ? 15 : 0) + (usedInterview ? 10 : 0);
  const raw = skillPts + expPts + screeningPts + interviewPts;
  const score = Math.max(8, Math.min(99, Math.round((raw / available) * 100)));

  return {
    score,
    band: bandFor(score),
    matchedSkills: matched.slice(0, 8).map(pretty),
    missingSkills: missing.slice(0, 6).map(pretty),
    knockout: false,
    usedInterview,
  };
}

export function bandFor(score: number): FitBand {
  if (score >= 80) return "strong";
  if (score >= 65) return "good";
  if (score >= 45) return "fair";
  return "weak";
}

export function fitLabel(band: FitBand | null): string {
  if (band === "strong") return "Strong";
  if (band === "good") return "Good";
  if (band === "fair") return "Fair";
  if (band === "weak") return "Weak";
  return "—";
}

function jobSkillNeedles(job: JobOpening): string[] {
  const tokens = tokenizeJobText(job.title, job.requirements, job.description, job.responsibilities);
  const extra = job.screeningQuestions.flatMap((q) => tokenizeJobText(q.prompt));
  const all = [...tokens, ...extra].filter((t) => t.length >= 4 && !JOB_SKILL_STOP.has(t) && !/^\d+$/.test(t));
  const uniq: string[] = [];
  for (const t of all) {
    if (!uniq.includes(t)) uniq.push(t);
    if (uniq.length >= 14) break;
  }
  return uniq;
}

function inferTargetYears(job: JobOpening): { min: number; max: number } {
  const blob = `${job.title} ${job.requirements}`.toLowerCase();
  const m = blob.match(/(\d+)\+?\s*(?:years?|yrs?)/);
  if (m) {
    const n = Number(m[1]);
    return { min: n, max: n + 4 };
  }
  if (/intern|junior|entry/.test(blob)) return { min: 0, max: 2 };
  if (/senior|lead|manager|head/.test(blob)) return { min: 5, max: 12 };
  if (/coordinator|specialist|executive/.test(blob)) return { min: 2, max: 6 };
  return { min: 1, max: 8 };
}

function pretty(skill: string): string {
  if (skill.length <= 3) return skill.toUpperCase();
  return skill.charAt(0).toUpperCase() + skill.slice(1);
}
