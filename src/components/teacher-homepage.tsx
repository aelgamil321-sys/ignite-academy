import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ChartBar,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  Plus,
  School,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero.jpg";
import patternImg from "@/assets/pattern.jpg";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AskMrAhmed } from "@/components/ask-mr-ahmed";
import { useI18n } from "@/lib/i18n";
import { gradeDisplayName } from "@/lib/grade-utils";
import { STAGE_CARD_CONFIG, STAGE_CARD_IMAGES } from "@/lib/stage-images";
import { teacherHomeGradeCards } from "@/lib/teacher-homepage";
import {
  fetchScopedStudents,
  fetchTeacherContext,
  fetchTeacherOverviewStats,
  formatClassScopeLabel,
  type TeacherContext,
  type TeacherOverviewStats,
} from "@/lib/teacher-dashboard";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-white p-5 shadow-[var(--shadow-soft)] text-center">
      <div className="font-display text-3xl text-primary md:text-4xl">{value}</div>
      <div className="mt-2 text-xs uppercase tracking-wider text-foreground/65">{label}</div>
    </div>
  );
}

export function TeacherHomepage() {
  const { tr, dir, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<TeacherContext | null>(null);
  const [stats, setStats] = useState<TeacherOverviewStats | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }
      const ctx = await fetchTeacherContext(auth.user.id);
      const students = await fetchScopedStudents();
      const overview = await fetchTeacherOverviewStats(ctx, students);
      setContext(ctx);
      setStats(overview);
      setLoading(false);
    })();
  }, []);

  const gradeCards = useMemo(
    () => (context ? teacherHomeGradeCards(context) : []),
    [context],
  );

  const scopeSummary = useMemo(() => {
    if (!context) return "";
    if (context.isLeadTeacher) return tr("teacher_all_grades");
    if (context.assignments.length === 0) return tr("teacher_no_classes");
    return context.assignments.map((a) => formatClassScopeLabel(a, lang)).join(" · ");
  }, [context, lang, tr]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="container-page flex items-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr("teacher_loading")}
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden bg-brand-dark text-white">
          <div
            className="absolute inset-0 opacity-[0.07] mix-blend-luminosity pointer-events-none"
            style={{ backgroundImage: `url(${patternImg})`, backgroundSize: "320px" }}
            aria-hidden
          />
          <div className="container-page relative grid items-start gap-10 py-16 sm:gap-12 sm:py-20 md:py-24 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-24">
            <div className="relative z-10">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/50 bg-primary/15 px-4 py-2 text-xs font-medium tracking-wide text-primary sm:text-sm">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>{tr("teacher_title")}</span>
              </div>
              <h1 className="mt-5 font-display text-3xl font-semibold leading-tight text-[#F4B400] sm:text-4xl md:text-5xl">
                {tr("teacher_home_welcome")}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
                {tr("teacher_lead")}
              </p>
              <p className="mt-3 text-sm text-white/75">{scopeSummary}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/teacher"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-semibold text-foreground shadow-[0_10px_30px_-10px_rgba(242,178,27,0.45)] hover:translate-y-[-2px] transition-transform"
                >
                  {tr("teacher_title")}
                  <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
                </Link>
                <Link
                  to="/teacher/classes"
                  className="inline-flex items-center gap-2 rounded-full border border-white/35 px-7 py-3.5 font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  <School className="h-4 w-4" />
                  {tr("teacher_my_classes")}
                </Link>
              </div>
            </div>
            <div className="relative z-10 hidden lg:block">
              <div className="relative overflow-hidden rounded-3xl border border-primary/25 shadow-[var(--shadow-elegant)]">
                <img src={heroImg} alt="" width={1600} height={1100} className="w-full h-auto" />
              </div>
            </div>
          </div>
        </section>

        <section className="container-page py-16">
          <h2 className="font-display text-2xl text-foreground md:text-3xl">{tr("teacher_home_scope_summary")}</h2>
          {stats ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <StatTile label={tr("teacher_stat_students")} value={String(stats.studentCount)} />
              <StatTile label={tr("teacher_stat_classes")} value={String(stats.classCount)} />
              <StatTile label={tr("teacher_stat_lessons")} value={String(stats.lessonCount)} />
              <StatTile label={tr("teacher_stat_quizzes")} value={String(stats.quizCount)} />
              <StatTile label={tr("teacher_stat_assignments")} value={String(stats.assignmentCount)} />
              <StatTile
                label={tr("teacher_stat_avg_quiz")}
                value={stats.avgQuizScore === null ? "—" : `${stats.avgQuizScore}%`}
              />
            </div>
          ) : null}
        </section>

        <section className="container-page py-8 pb-16">
          <div className="mb-8 max-w-2xl">
            <div className="text-xs uppercase tracking-[0.22em] font-semibold text-primary">
              {tr("teacher_home_my_stages")}
            </div>
            <h2 className="mt-3 font-display text-3xl text-foreground md:text-4xl">
              {context?.isLeadTeacher ? tr("teacher_all_grades") : tr("teacher_assigned_grades")}
            </h2>
            <p className="mt-3 text-foreground/65">{tr("teacher_home_my_stages_desc")}</p>
          </div>

          {gradeCards.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">{tr("teacher_no_classes")}</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {gradeCards.map((card) => {
                const config = STAGE_CARD_CONFIG[card.stageKey];
                const img = STAGE_CARD_IMAGES[card.stageKey];
                const label = card.assignment
                  ? formatClassScopeLabel(card.assignment, lang)
                  : gradeDisplayName(card.gradeSlug, lang);
                const search = card.assignment
                  ? {
                      grade: card.assignment.grade,
                      section: card.assignment.section ?? "",
                      islamic_group: card.assignment.islamic_group ?? "",
                    }
                  : { grade: card.gradeSlug, section: "", islamic_group: "" };

                return (
                  <Link
                    key={`${card.gradeSlug}-${card.assignment?.id ?? "lead"}`}
                    to="/teacher/students"
                    search={search}
                    className="group relative overflow-hidden rounded-3xl bg-white border border-foreground/10 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition-all hover:-translate-y-1"
                  >
                    <div className="aspect-[4/5] overflow-hidden">
                      <img
                        src={img}
                        alt={label}
                        width={800}
                        height={1000}
                        loading="lazy"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        style={{ objectPosition: config.objectPosition }}
                      />
                    </div>
                    <div className={`absolute inset-0 ${config.overlayClass}`} />
                    <div className="absolute inset-0 flex flex-col justify-end p-6 text-white [text-shadow:0_1px_12px_rgba(47,53,66,0.55)]">
                      <div className="text-xs uppercase tracking-wider text-primary">
                        {gradeDisplayName(card.gradeSlug, lang)}
                      </div>
                      <div className="font-display text-xl mt-1">{label}</div>
                      <div className="mt-3 inline-flex items-center gap-1 text-sm opacity-90 group-hover:gap-2 transition-all">
                        {tr("teacher_view_students")}
                        <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-white py-16 border-y border-foreground/8">
          <div className="container-page">
            <h2 className="font-display text-2xl text-foreground md:text-3xl">{tr("teacher_home_quick_actions")}</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <Link
                to="/teacher/lessons/new"
                className="group rounded-2xl border border-foreground/10 bg-background p-5 hover:border-primary/60 hover:shadow-[var(--shadow-soft)] transition-all"
              >
                <Plus className="h-6 w-6 text-primary" />
                <div className="mt-3 font-semibold text-foreground group-hover:text-primary">
                  {tr("teacher_home_add_lesson")}
                </div>
              </Link>
              <Link
                to="/teacher/quizzes"
                className="group rounded-2xl border border-foreground/10 bg-background p-5 hover:border-primary/60 hover:shadow-[var(--shadow-soft)] transition-all"
              >
                <ClipboardCheck className="h-6 w-6 text-primary" />
                <div className="mt-3 font-semibold text-foreground group-hover:text-primary">
                  {tr("teacher_home_review_quizzes")}
                </div>
              </Link>
              <Link
                to="/teacher/assignments"
                className="group rounded-2xl border border-foreground/10 bg-background p-5 hover:border-primary/60 hover:shadow-[var(--shadow-soft)] transition-all"
              >
                <GraduationCap className="h-6 w-6 text-primary" />
                <div className="mt-3 font-semibold text-foreground group-hover:text-primary">
                  {tr("teacher_home_create_assignment")}
                </div>
              </Link>
              <Link
                to="/teacher/students"
                className="group rounded-2xl border border-foreground/10 bg-background p-5 hover:border-primary/60 hover:shadow-[var(--shadow-soft)] transition-all"
              >
                <Users className="h-6 w-6 text-primary" />
                <div className="mt-3 font-semibold text-foreground group-hover:text-primary">
                  {tr("teacher_home_view_students")}
                </div>
              </Link>
              <Link
                to="/teacher/performance"
                className="group rounded-2xl border border-foreground/10 bg-background p-5 hover:border-primary/60 hover:shadow-[var(--shadow-soft)] transition-all"
              >
                <ChartBar className="h-6 w-6 text-primary" />
                <div className="mt-3 font-semibold text-foreground group-hover:text-primary">
                  {tr("teacher_home_view_performance")}
                </div>
              </Link>
            </div>
          </div>
        </section>

        <section className="container-page py-12">
          <div className="rounded-3xl bg-brand-dark text-white p-8 md:p-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <BookOpen className="h-8 w-8 text-primary" />
              <h3 className="mt-4 font-display text-2xl">{tr("teacher_title")}</h3>
              <p className="mt-2 text-sm text-white/80 max-w-xl">{tr("teacher_scope_lead")}</p>
            </div>
            <Link
              to="/teacher"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-foreground hover:bg-primary/90 transition-colors"
            >
              {tr("teacher_title")}
              <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
      <AskMrAhmed />
    </div>
  );
}
