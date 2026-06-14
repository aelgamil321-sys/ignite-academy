import { useEffect, useState } from "react";
import { Award, Loader2, Medal, Star, Trophy } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";
import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import { useI18n, type TKey } from "@/lib/i18n";
import { gradeDisplayName } from "@/lib/grade-utils";
import { islamicGroupLabel } from "@/lib/student-academics";
import { fetchHallOfFame, type HallOfFameData, type HallOfFameStudent } from "@/lib/hall-of-fame";
import type { Lang } from "@/lib/i18n-config";
import { cn } from "@/lib/utils";

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function StudentCard({
  student,
  lang,
  tr,
  featured = false,
}: {
  student: HallOfFameStudent;
  lang: Lang;
  tr: (key: TKey) => string;
  featured?: boolean;
}) {
  const gradeLabel = student.grade
    ? gradeDisplayName(student.grade, lang)
    : tr("not_set");

  return (
    <article
      className={cn(
        "flex flex-col items-center rounded-2xl border border-border bg-card p-4 text-center shadow-[var(--shadow-soft)] sm:p-5",
        featured && "border-primary/40 bg-gradient-to-b from-primary/10 to-card",
      )}
    >
      <StudentProfileAvatar
        profilePhotoPath={student.profilePhotoPath}
        alt={student.arabicName}
        className={cn("h-20 w-20 rounded-2xl sm:h-24 sm:w-24", featured && "h-28 w-28 sm:h-32 sm:w-32")}
      />
      <h3 className="mt-3 font-display text-lg font-semibold text-foreground leading-snug">
        {student.arabicName}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">{gradeLabel}</p>
      <p className="text-xs font-medium text-primary">
        {islamicGroupLabel(student.islamicGroup, lang)}
      </p>
      <div className="mt-4 grid w-full grid-cols-2 gap-2">
        <MetricPill
          label={tr("hof_avg_score_label")}
          value={`${student.averageScorePct}%`}
        />
        <MetricPill
          label={tr("hof_certificates_label")}
          value={String(student.certificatesEarned)}
        />
      </div>
    </article>
  );
}

export function HallOfFamePage() {
  const { tr, lang } = useI18n();
  const [data, setData] = useState<HallOfFameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const result = await fetchHallOfFame();
        if (active) setData(result);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : tr("hof_error"));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [tr]);

  const isEmpty =
    !loading &&
    !error &&
    data &&
    data.topStudents.length === 0 &&
    !data.studentOfMonth &&
    data.gradeChampions.length === 0;

  function gradeChampionLabel(gradeSlug: string): string {
    const grade = gradeDisplayName(gradeSlug, lang);
    if (lang === "ar") return `${tr("grade_champion_suffix")} ${grade}`;
    return `${grade} ${tr("grade_champion_suffix")}`;
  }

  return (
    <PageShell
      eyebrow={tr("nav_hall_of_fame")}
      title={tr("hof_title")}
      lead={tr("hof_lead")}
      crumbs={[{ label: tr("nav_hall_of_fame") }]}
    >
      {loading ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">{tr("hof_loading")}</p>
        </div>
      ) : error ? (
        <EmptyState icon={Trophy} title={tr("hof_error")} description={error} />
      ) : isEmpty ? (
        <EmptyState icon={Trophy} title={tr("hof_empty_title")} description={tr("hof_empty_desc")} />
      ) : (
        <div className="space-y-14">
          {data?.studentOfMonth ? (
            <section>
              <div className="mb-6 flex items-center gap-2">
                <Star className="h-5 w-5 text-gold" />
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  {tr("hof_student_of_month")}
                </h2>
              </div>
              <div className="overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-gold/10 p-6 shadow-[var(--shadow-elegant)] sm:p-8">
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
                  <StudentProfileAvatar
                    profilePhotoPath={data.studentOfMonth.profilePhotoPath}
                    alt={data.studentOfMonth.arabicName}
                    className="h-32 w-32 rounded-3xl sm:h-40 sm:w-40"
                  />
                  <div className="flex-1 text-center sm:text-start">
                    <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gold">
                      <Award className="h-3.5 w-3.5" />
                      {tr("hof_achievement_badge")}
                    </div>
                    <h3 className="mt-4 font-display text-3xl font-semibold text-foreground">
                      {data.studentOfMonth.arabicName}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {data.studentOfMonth.grade
                        ? gradeDisplayName(data.studentOfMonth.grade, lang)
                        : tr("not_set")}
                      {" · "}
                      {islamicGroupLabel(data.studentOfMonth.islamicGroup, lang)}
                    </p>
                    <div className="mt-5 grid max-w-md grid-cols-2 gap-3 sm:grid-cols-2">
                      <MetricPill
                        label={tr("hof_avg_score_label")}
                        value={`${data.studentOfMonth.averageScorePct}%`}
                      />
                      <MetricPill
                        label={tr("hof_certificates_label")}
                        value={String(data.studentOfMonth.certificatesEarned)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {data && data.gradeChampions.length > 0 ? (
            <section>
              <div className="mb-6 flex items-center gap-2">
                <Medal className="h-5 w-5 text-primary" />
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  {tr("hof_grade_champions")}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.gradeChampions.map((champion) => (
                  <article
                    key={champion.gradeSlug}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]"
                  >
                    <StudentProfileAvatar
                      profilePhotoPath={champion.profilePhotoPath}
                      alt={champion.arabicName}
                      className="h-16 w-16 shrink-0 rounded-2xl"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {gradeChampionLabel(champion.gradeSlug)}
                      </p>
                      <h3 className="mt-1 truncate font-display text-lg font-semibold text-foreground">
                        {champion.arabicName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {champion.averageScorePct}%
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {data && data.topStudents.length > 0 ? (
            <section>
              <div className="mb-6 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-gold" />
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  {tr("hof_top_students")}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {data.topStudents.map((student, index) => (
                  <StudentCard key={index} student={student} lang={lang} tr={tr} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </PageShell>
  );
}
