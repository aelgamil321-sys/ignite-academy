import { CheckCircle2, Clock, XCircle } from "lucide-react";
import {useI18n, L } from "@/lib/i18n";
import type { QuizQuestion } from "@/lib/curriculum";
import {
  gradeLabelForPercentage,
  type QuizSubmissionAnswerItem,
  type SavedQuizSubmission,
} from "@/lib/lesson-quiz";
import { canIssueCertificate } from "@/lib/certificate";
import { CertificateButton } from "@/components/certificate-modal";
import type { Bi } from "@/lib/curriculum";
import { TranslatedContentShell } from "@/components/translation-loading-indicator";


export function LessonQuizResults({
  submission,
  questions,
  gradeName,
  lessonTitle,
}: {
  submission: SavedQuizSubmission;
  questions: QuizQuestion[];
  gradeName: Bi;
  lessonTitle: Bi;
}) {
  const { tr, lang, bi } = useI18n();
  const pending = submission.status === "pending_review";
  const finalScore = submission.final_score ?? submission.auto_score + submission.essay_score;
  const percentage = submission.percentage ?? 0;
  const gradeLabel = gradeLabelForPercentage(percentage, lang);
  const showCertificate = canIssueCertificate(submission, questions);

  const answerByIndex = new Map<number, QuizSubmissionAnswerItem>();
  for (const a of submission.answers) {
    answerByIndex.set(a.questionIndex, a);
  }

  const typeLabel = (type: QuizQuestion["type"]) => {
    if (type === "true_false") return lang === "ar" ? "صح / خطأ" : "True / False";
    if (type === "essay") return lang === "ar" ? "سؤال مقالي" : "Essay";
    return lang === "ar" ? "اختيار من متعدد" : "Multiple choice";
  };

  return (
    <div className="space-y-6 scroll-mt-28 outline-none" id="lesson-result" tabIndex={-1}>
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
        <h3 className="font-display text-lg text-foreground">
          {L("Quiz Results", "نتيجة الاختبار")[lang]}
        </h3>

        {pending ? (
          <div className="text-sm text-amber-700 font-medium inline-flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            {L("Your answer is pending teacher review", "الإجابة قيد مراجعة المعلم")[lang]}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4" />
              {L("Your answer has been reviewed", "تمت مراجعة إجابتك")[lang]}
            </div>
            <div className="font-display text-xl text-foreground">
              {L("Final score", "الدرجة النهائية")[lang]}:{" "}
              <span className="text-primary">
                {finalScore}/{submission.total_points}
              </span>
              <span className="text-muted-foreground text-base ms-2">({percentage}%)</span>
            </div>
            <div className="text-sm font-semibold text-primary">
              {L("Grade", "التقدير")[lang]}: {gradeLabel}
            </div>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-3 text-sm pt-1">
          <div>
            <span className="text-muted-foreground">{L("Auto score", "الدرجة التلقائية")[lang]}: </span>
            <span className="font-semibold">{submission.auto_score}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{L("Essay score", "درجة المقالي")[lang]}: </span>
            <span className="font-semibold">{submission.essay_score}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{L("Status", "الحالة")[lang]}: </span>
            <span
              className={`font-semibold ${pending ? "text-amber-700" : "text-primary"}`}
            >
              {pending
                ? L("Pending review", "قيد المراجعة")[lang]
                : L("Reviewed", "تمت المراجعة")[lang]}
            </span>
          </div>
        </div>

        {showCertificate && (
          <div className="pt-2">
            <CertificateButton
              submission={submission}
              gradeName={gradeName}
              lessonTitle={lessonTitle}
              lang={lang}
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => {
          const saved = answerByIndex.get(i);
          const isEssay = q.type === "essay";

          return (
            <div key={i} className="rounded-xl border border-border bg-background p-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-[0.18em] text-primary">
                  {tr("question")} {i + 1}
                </span>
                <span className="text-[10px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                  {typeLabel(q.type)}
                </span>
                <span className="text-[10px] rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-primary">
                  {q.points} {lang === "ar" ? "نقطة" : q.points === 1 ? "pt" : "pts"}
                </span>
              </div>

              <TranslatedContentShell>
              <div className="font-medium text-foreground">{bi(q.q, { fieldName: `quiz_q_${i}`, contentType: "quiz_question" }) || q.q.en || q.q.ar}</div>
              </TranslatedContentShell>

              {isEssay && saved?.type === "essay" ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {L("Your answer", "إجابتك")[lang]}
                    </div>
                    <div className="rounded-lg border border-border bg-card px-3 py-2 whitespace-pre-wrap">
                      {saved.essayText || L("(empty)", "(فارغ)")[lang]}
                    </div>
                  </div>

                  {saved.status === "reviewed" ? (
                    <>
                      <div className="inline-flex items-center gap-2 text-primary font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        {L("Reviewed", "تمت المراجعة")[lang]}
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {L("Teacher score", "درجة المعلّم")[lang]}:{" "}
                        </span>
                        <span className="font-semibold">
                          {saved.earned}/{saved.points}
                        </span>
                      </div>
                      {saved.teacherFeedback &&
                        (saved.teacherFeedback.en.trim() || saved.teacherFeedback.ar.trim()) && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">
                              {L("Teacher feedback", "ملاحظات المعلّم")[lang]}
                            </div>
                            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 whitespace-pre-wrap">
                              {bi(saved.teacherFeedback, { fieldName: `quiz_feedback_${i}`, contentType: "quiz_feedback" }) ||
                                saved.teacherFeedback.en ||
                                saved.teacherFeedback.ar}
                            </div>
                          </div>
                        )}
                    </>
                  ) : (
                    <div className="inline-flex items-center gap-2 text-amber-700 font-medium">
                      <Clock className="h-4 w-4" />
                      {L("Your answer is pending teacher review", "الإجابة قيد مراجعة المعلم")[lang]}
                    </div>
                  )}
                </div>
              ) : saved && saved.type !== "essay" ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      {L("Your answer", "إجابتك")[lang]}:{" "}
                    </span>
                    <span className="font-medium">
                      {bi(q.options[saved.selectedIndex] ?? { en: "", ar: "" }, { fieldName: `quiz_q_${i}_selected`, contentType: "quiz_option" })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {L("Correct answer", "الإجابة الصحيحة")[lang]}:{" "}
                    </span>
                    <span className="font-medium">
                      {bi(q.options[saved.correctIndex] ?? { en: "", ar: "" }, { fieldName: `quiz_q_${i}_correct`, contentType: "quiz_option" })}
                    </span>
                  </div>
                  <div
                    className={`inline-flex items-center gap-2 font-medium ${saved.earned > 0 ? "text-primary" : "text-destructive"}`}
                  >
                    {saved.earned > 0 ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {saved.earned > 0 ? tr("correct") : tr("incorrect")}
                    <span className="text-muted-foreground font-normal">
                      ({saved.earned}/{saved.points})
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
