import { useEffect, useMemo, useState } from "react";
import { Award, Loader2, Medal, Star, Trophy } from "lucide-react";
import { StudentOrPublicPage } from "@/components/student-or-public-page";
import { EmptyState } from "@/components/empty-state";
import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import { grades } from "@/lib/curriculum";
import { gradeDisplayName, normalizeGradeSlug } from "@/lib/grade-utils";
import {
  fetchAdminHallOfFame,
  type AdminHallOfFameData,
  type AdminHallOfFameGradeChampion,
  type AdminHallOfFameStudent,
} from "@/lib/admin-hall-of-fame";
import {
  fetchHallOfFame,
  type HallOfFameData,
  type HallOfFameGradeChampion,
  type HallOfFameStudent,
} from "@/lib/hall-of-fame";
import { ISLAMIC_GROUPS, islamicGroupLabel, STUDENT_SECTIONS, sectionLabel } from "@/lib/student-academics";
import { useI18n, L, type TKey } from "@/lib/i18n";
import { isRtlLang, type Lang } from "@/lib/i18n-config";
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
        alt={student.displayName}
        className={cn("h-20 w-20 rounded-2xl sm:h-24 sm:w-24", featured && "h-28 w-28 sm:h-32 sm:w-32")}
      />
      <h3 className="mt-3 font-display text-lg font-semibold text-foreground leading-snug">
        {student.displayName}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">{gradeLabel}</p>
      <p className="text-xs font-medium text-primary">
        {islamicGroupLabel(student.islamicGroup, lang)}
      </p>
      <div className="mt-4 grid w-full grid-cols-2 gap-2">
        <MetricPill label={tr("hof_avg_score_label")} value={`${student.averageScorePct}%`} />
        <MetricPill
          label={tr("hof_certificates_label")}
          value={String(student.certificatesEarned)}
        />
      </div>
    </article>
  );
}

function adminStudentToPublic(student: AdminHallOfFameStudent): HallOfFameStudent {
  return {
    displayName: student.displayName,
    arabicName: student.arabicName,
    grade: student.grade,
    islamicGroup: student.islamicGroup,
    profilePhotoPath: student.profilePhotoPath,
    averageScorePct: student.averageScorePct,
    certificatesEarned: student.certificatesEarned,
  };
}

function matchesAdminHonorFilters(
  student: AdminHallOfFameStudent,
  gradeFilter: string,
  sectionFilter: string,
  islamicFilter: string,
): boolean {
  if (gradeFilter && normalizeGradeSlug(student.grade ?? "") !== normalizeGradeSlug(gradeFilter)) {
    return false;
  }
  if (sectionFilter && student.section !== sectionFilter) {
    return false;
  }
  if (islamicFilter && student.islamicGroup !== islamicFilter) {
    return false;
  }
  return true;
}

function matchesAdminChampionFilters(
  champion: AdminHallOfFameGradeChampion,
  gradeFilter: string,
  sectionFilter: string,
  islamicFilter: string,
): boolean {
  if (gradeFilter && champion.gradeSlug !== normalizeGradeSlug(gradeFilter)) {
    return false;
  }
  if (sectionFilter && champion.section !== sectionFilter) {
    return false;
  }
  if (islamicFilter && champion.islamicGroup !== islamicFilter) {
    return false;
  }
  return true;
}

function matchesHonorFilters(
  student: HallOfFameStudent,
  gradeFilter: string,
  islamicFilter: string,
): boolean {
  if (gradeFilter && normalizeGradeSlug(student.grade ?? "") !== normalizeGradeSlug(gradeFilter)) {
    return false;
  }
  if (islamicFilter && student.islamicGroup !== islamicFilter) {
    return false;
  }
  return true;
}

function matchesChampionFilters(
  champion: HallOfFameGradeChampion,
  gradeFilter: string,
  islamicFilter: string,
): boolean {
  if (gradeFilter && champion.gradeSlug !== normalizeGradeSlug(gradeFilter)) {
    return false;
  }
  if (islamicFilter && champion.islamicGroup !== islamicFilter) {
    return false;
  }
  return true;
}

export function HallOfFameContent({ variant = "public" }: { variant?: "public" | "admin" }) {
  const { tr, lang } = useI18n();
  const [publicData, setPublicData] = useState<HallOfFameData | null>(null);
  const [adminData, setAdminData] = useState<AdminHallOfFameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [islamicFilter, setIslamicFilter] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        if (variant === "admin") {
          const result = await fetchAdminHallOfFame();
          if (active) setAdminData(result);
        } else {
          const result = await fetchHallOfFame();
          if (active) setPublicData(result);
        }
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
  }, [tr, variant]);

  const filtered = useMemo(() => {
    if (variant === "admin" && adminData) {
      const topStudents = adminData.topStudents
        .filter((s) => matchesAdminHonorFilters(s, gradeFilter, sectionFilter, islamicFilter))
        .map((s) => ({ key: s.userId, student: adminStudentToPublic(s) }));
      const studentOfMonth =
        adminData.studentOfMonth &&
        matchesAdminHonorFilters(adminData.studentOfMonth, gradeFilter, sectionFilter, islamicFilter)
          ? adminStudentToPublic(adminData.studentOfMonth)
          : null;
      const gradeChampions = adminData.gradeChampions
        .filter((c) => matchesAdminChampionFilters(c, gradeFilter, sectionFilter, islamicFilter))
        .map((c) => ({ ...adminStudentToPublic(c), gradeSlug: c.gradeSlug }));
      return { topStudents, studentOfMonth, gradeChampions };
    }
    if (!publicData) return null;
    return {
      topStudents: publicData.topStudents
        .filter((s) => matchesHonorFilters(s, gradeFilter, islamicFilter))
        .map((s, index) => ({ key: String(index), student: s })),
      studentOfMonth:
        publicData.studentOfMonth && matchesHonorFilters(publicData.studentOfMonth, gradeFilter, islamicFilter)
          ? publicData.studentOfMonth
          : null,
      gradeChampions: publicData.gradeChampions.filter((c) =>
        matchesChampionFilters(c, gradeFilter, islamicFilter),
      ),
    };
  }, [variant, adminData, publicData, gradeFilter, sectionFilter, islamicFilter]);

  const isEmpty =
    !loading &&
    !error &&
    filtered &&
    filtered.topStudents.length === 0 &&
    !filtered.studentOfMonth &&
    filtered.gradeChampions.length === 0;

  function gradeChampionLabel(gradeSlug: string): string {
    const grade = gradeDisplayName(gradeSlug, lang);
    if (isRtlLang(lang)) return `${tr("grade_champion_suffix")} ${grade}`;
    return `${grade} ${tr("grade_champion_suffix")}`;
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">{tr("hof_loading")}</p>
      </div>
    );
  }

  if (error) {
    return <EmptyState icon={Trophy} title={tr("hof_error")} description={error} />;
  }

  return (
    <div className="space-y-8">
      {variant === "admin" ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <h2 className="font-display text-lg text-foreground mb-3">
            {tr("admin_hof_filters_title")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="text-xs font-medium text-muted-foreground">{L("Grade", "الصف")[lang]}</span>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">{L("All", "الكل")[lang]}</option>
                {grades.map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {gradeDisplayName(g.slug, lang)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                {tr("admin_hof_section_filter")}
              </span>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">{L("All", "الكل")[lang]}</option>
                {STUDENT_SECTIONS.map((section) => (
                  <option key={section} value={section}>
                    {sectionLabel(section, lang)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                {L("Islamic Group", "المجموعة الإسلامية")[lang]}
              </span>
              <select
                value={islamicFilter}
                onChange={(e) => setIslamicFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">{L("All", "الكل")[lang]}</option>
                {ISLAMIC_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {islamicGroupLabel(group, lang)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      ) : null}

      {isEmpty ? (
        <EmptyState icon={Trophy} title={tr("hof_empty_title")} description={tr("hof_empty_desc")} />
      ) : filtered ? (
        <div className="space-y-14">
          {filtered.studentOfMonth ? (
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
                    profilePhotoPath={filtered.studentOfMonth.profilePhotoPath}
                    alt={filtered.studentOfMonth.displayName}
                    className="h-32 w-32 rounded-3xl sm:h-40 sm:w-40"
                  />
                  <div className="flex-1 text-center sm:text-start">
                    <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gold">
                      <Award className="h-3.5 w-3.5" />
                      {tr("hof_achievement_badge")}
                    </div>
                    <h3 className="mt-4 font-display text-3xl font-semibold text-foreground">
                      {filtered.studentOfMonth.displayName}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {filtered.studentOfMonth.grade
                        ? gradeDisplayName(filtered.studentOfMonth.grade, lang)
                        : tr("not_set")}
                      {" · "}
                      {islamicGroupLabel(filtered.studentOfMonth.islamicGroup, lang)}
                    </p>
                    <div className="mt-5 grid max-w-md grid-cols-2 gap-3 sm:grid-cols-2">
                      <MetricPill
                        label={tr("hof_avg_score_label")}
                        value={`${filtered.studentOfMonth.averageScorePct}%`}
                      />
                      <MetricPill
                        label={tr("hof_certificates_label")}
                        value={String(filtered.studentOfMonth.certificatesEarned)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {filtered.gradeChampions.length > 0 ? (
            <section>
              <div className="mb-6 flex items-center gap-2">
                <Medal className="h-5 w-5 text-primary" />
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  {tr("hof_grade_champions")}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.gradeChampions.map((champion) => (
                  <article
                    key={champion.gradeSlug}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]"
                  >
                    <StudentProfileAvatar
                      profilePhotoPath={champion.profilePhotoPath}
                      alt={champion.displayName}
                      className="h-16 w-16 shrink-0 rounded-2xl"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {gradeChampionLabel(champion.gradeSlug)}
                      </p>
                      <h3 className="mt-1 truncate font-display text-lg font-semibold text-foreground">
                        {champion.displayName}
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

          {filtered.topStudents.length > 0 ? (
            <section>
              <div className="mb-6 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-gold" />
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  {tr("hof_top_students")}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.topStudents.map((entry) => (
                  <StudentCard key={entry.key} student={entry.student} lang={lang} tr={tr} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function HallOfFamePage() {
  const { tr } = useI18n();

  return (
    <StudentOrPublicPage
      eyebrow={tr("nav_hall_of_fame")}
      title={tr("hof_title")}
      lead={tr("hof_lead")}
      crumbs={[{ label: tr("nav_hall_of_fame") }]}
    >
      <HallOfFameContent variant="public" />
    </StudentOrPublicPage>
  );
}
