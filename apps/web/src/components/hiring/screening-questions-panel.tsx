import type { Candidate, ScreeningQuestion } from "@/lib/hiring/types";
import { t } from "@/i18n";

export function ScreeningQuestionsPanel({
  questions,
  answers,
  assessmentStatus,
  assessmentScore,
}: {
  questions: ScreeningQuestion[];
  answers: Candidate["screeningAnswers"];
  assessmentStatus: Candidate["assessmentStatus"];
  assessmentScore: number | null;
}) {
  const byId = new Map(answers.map((a) => [a.questionId, a]));

  return (
    <div className="rounded-lg border p-3">
      <p className="text-sm font-medium">{t("Screening & assessment")}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("Assessment:")}{assessmentStatus.replace("_", " ")}
        {assessmentScore != null ? ` · score ${assessmentScore}` : t(" · score placeholder")}
      </p>
      {questions.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("No screening questions on this job.")}</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm">
          {questions.map((q) => {
            const a = byId.get(q.id);
            return (
              <li key={q.id}>
                <p>
                  {q.prompt}
                  {q.knockout ? (
                    <span className="ml-1 text-[10px] font-semibold uppercase text-rose-700">{t("knockout")}</span>
                  ) : null}
                </p>
                <p className={a?.knockoutFailed ? "text-rose-700" : "text-muted-foreground"}>
                  {a?.answer ?? t("Not answered")}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
