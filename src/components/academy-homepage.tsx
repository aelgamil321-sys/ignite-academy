import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight, BookOpen, GraduationCap, Library, Video, ClipboardCheck,
  Users, Award, Sparkles, Play,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero.jpg";
import patternImg from "@/assets/pattern.jpg";
import { getStage } from "@/lib/curriculum";
import { HOMEPAGE_STAGE_CARDS, STAGE_CARD_CONFIG, STAGE_CARD_IMAGES } from "@/lib/stage-images";
import { useI18n } from "@/lib/i18n";
import { SUBJECT_CATEGORIES } from "@/lib/categories";
import { useCMS, useCMSStats, useAllAnnouncements } from "@/lib/cms";
import { gradeNameBi } from "@/lib/grade-utils";
import { useHomepageContentPrefetch } from "@/hooks/use-cms-content-prefetch";
import { getAccountRole, postAuthPathForRole } from "@/lib/account-role";
import { certificateIslamicLogoUrl } from "@/lib/certificate-branding";
import { DepartmentLogoCard } from "@/components/brand-logo";
import { HomepageAnnouncements } from "@/components/homepage-announcements";
import { AdminHomeAnalyticsPreview } from "@/components/admin-home-analytics-preview";
import { AdminHomeAnnouncements } from "@/components/admin-home-announcements";

function SectionHeader({
  eyebrow, title, desc, align = "center", tone = "dark",
}: { eyebrow: string; title: string; desc?: string; align?: "center" | "left"; tone?: "dark" | "light" }) {
  return (
    <div className={align === "center" ? "text-center max-w-2xl mx-auto" : "max-w-2xl"}>
      <div className="text-xs uppercase tracking-[0.22em] font-semibold text-primary">{eyebrow}</div>
      <h2 className={`mt-3 font-display text-4xl md:text-5xl ${tone === "light" ? "text-white" : "text-foreground"}`}>{title}</h2>
      {desc ? <p className={`mt-4 text-base ${tone === "light" ? "text-white/80" : "text-foreground/65"}`}>{desc}</p> : null}
    </div>
  );
}

export function AcademyHomepage({
  signedIn,
  variant = "public",
}: {
  signedIn: boolean;
  variant?: "public" | "admin";
}) {
  const isAdmin = variant === "admin";
  const { tr, dir, bi } = useI18n();
  const { lessons } = useCMS();
  const stats = useCMSStats();
  const announcements = useAllAnnouncements();
  const featuredLessons = lessons.filter((l) => l.published).slice(0, 3);
  useHomepageContentPrefetch(lessons.filter((l) => l.published), announcements);
  const [dashboardPath, setDashboardPath] = useState("/student");

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      if (data.user) {
        const role = await getAccountRole(data.user.id);
        if (!active) return;
        setDashboardPath(postAuthPathForRole(role));
      } else {
        setDashboardPath("/student");
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void getAccountRole(session.user.id).then((role) => {
          if (active) setDashboardPath(postAuthPathForRole(role));
        });
      } else {
        setDashboardPath("/student");
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  function goToDashboard() {
    window.location.assign(dashboardPath);
  }

  const stages = HOMEPAGE_STAGE_CARDS.map((card) => ({
    ...card,
    img: STAGE_CARD_IMAGES[card.key],
    ...STAGE_CARD_CONFIG[card.key],
    stage: getStage(card.stageSlug),
  }));

  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-dark text-white">
        <div
          className="absolute inset-0 opacity-[0.07] mix-blend-luminosity pointer-events-none"
          style={{ backgroundImage: `url(${patternImg})`, backgroundSize: "320px" }}
          aria-hidden
        />
        <div className="container-page relative grid items-start gap-10 py-16 sm:gap-12 sm:py-20 md:py-24 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-24 xl:gap-16 xl:py-28">
          <div className="relative z-10 flex flex-col justify-center">
            <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-primary/50 bg-primary/15 px-4 py-2 text-xs font-medium tracking-wide text-primary sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>{tr("hero_badge")}</span>
            </div>
            <h1 className="mt-5 font-display text-3xl font-semibold leading-[1.12] tracking-tight text-[#F4B400] sm:mt-6 sm:text-4xl md:text-5xl lg:text-[3.25rem] lg:leading-[1.08] xl:text-6xl">
              {tr("brand_name")}
            </h1>
            <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-primary/90 sm:mt-4 sm:text-base md:text-lg">
              {tr("hero_subtitle")}
            </p>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:mt-6 sm:text-lg sm:leading-relaxed">
              {tr("hero_desc")}
            </p>
            <div className="relative z-20 mt-7 flex flex-wrap gap-3 sm:mt-8 sm:gap-4">
              {signedIn ? (
                <a
                  href={dashboardPath}
                  onClick={(e) => {
                    e.preventDefault();
                    goToDashboard();
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-semibold text-foreground shadow-[0_10px_30px_-10px_rgba(242,178,27,0.45)] hover:translate-y-[-2px] transition-transform"
                >
                  {dashboardPath === "/teacher"
                    ? tr("teacher_title")
                    : dashboardPath === "/parent/dashboard"
                      ? tr("parent_dashboard_title")
                      : dashboardPath.startsWith("/admin")
                        ? tr("nav_admin")
                        : tr("nav_student")}
                  <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
                </a>
              ) : (
                <>
                  <a
                    href="/auth?mode=signup"
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-semibold text-foreground shadow-[0_10px_30px_-10px_rgba(242,178,27,0.45)] hover:translate-y-[-2px] transition-transform"
                  >
                    {tr("cta_signup")} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
                  </a>
                  <a
                    href="/auth?mode=login"
                    className="inline-flex items-center gap-2 rounded-full bg-white text-foreground px-7 py-3.5 font-semibold hover:bg-white/90 transition-colors"
                  >
                    {tr("cta_login")}
                  </a>
                </>
              )}
              <Link to="/grades" className="inline-flex items-center gap-2 rounded-full border border-white/35 px-7 py-3.5 font-semibold text-white hover:bg-white/10 transition-colors">
                <Play className="h-4 w-4" /> {tr("cta_explore")}
              </Link>
            </div>

            <div className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-white/15 pt-8 sm:mt-12 sm:gap-6 sm:pt-10">
              {[
                { n: String(stats.lessonCount), l: tr("stat_lessons") },
                { n: String(stats.gradeCount), l: tr("stat_grades") },
                { n: String(stats.subjectCount), l: tr("stat_subjects") },
              ].map((s) => (
                <div key={s.l} className="text-center sm:text-start">
                  <div className="font-display text-2xl text-primary sm:text-3xl">{s.n}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-white/75 sm:text-xs">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative z-10 flex w-full flex-col items-center lg:items-stretch">
            <div className="relative w-full">
              <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full pointer-events-none sm:-inset-6" aria-hidden />
              <div className="relative overflow-hidden rounded-3xl border border-primary/25 shadow-[var(--shadow-elegant)]">
                <img src={heroImg} alt="" width={1600} height={1100} className="w-full h-auto" />
              </div>
            </div>

            <div className="mt-6 flex w-full max-w-[340px] flex-col items-center gap-4 sm:mt-8 sm:gap-5 lg:mx-auto">
              <div className="flex w-full min-w-[260px] max-w-[340px] items-center gap-3 rounded-2xl bg-white p-4 text-foreground shadow-[var(--shadow-elegant)] sm:p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-foreground">
                  <Award className="h-6 w-6" />
                </div>
                <div className="min-w-0 text-start">
                  <div className="font-semibold text-sm leading-snug">{tr("badge_certified")}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-foreground/65">{tr("badge_certified_sub")}</div>
                </div>
              </div>

              <DepartmentLogoCard
                src={certificateIslamicLogoUrl()}
                alt={tr("dept_islamic_ed")}
                className="min-w-[260px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ACCESS — Academic stages */}
      <section className="container-page py-20">
        <SectionHeader eyebrow={tr("stages_eyebrow")} title={tr("stages_title")} desc={tr("stages_desc")} />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((s) => (
            <Link
              key={s.name}
              to={isAdmin ? "/admin/grades" : s.to}
              search={isAdmin ? { stage: s.stageSlug } : undefined}
              className="group relative overflow-hidden rounded-3xl bg-white border border-foreground/10 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition-all hover:-translate-y-1"
            >
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={s.img}
                  alt={tr(s.name)}
                  width={800}
                  height={1000}
                  loading="lazy"
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  style={{ objectPosition: s.objectPosition }}
                />
              </div>
              <div className={`absolute inset-0 ${s.overlayClass}`} />
              <div className="absolute inset-0 flex flex-col justify-end p-6 text-white [text-shadow:0_1px_12px_rgba(47,53,66,0.55)]">
                <div className="text-xs uppercase tracking-wider text-primary">{tr(s.grades)}</div>
                <div className="font-display text-2xl mt-1">{tr(s.name)}</div>
                <div className="mt-1 text-sm font-medium opacity-95">{tr(s.subtitle)}</div>
                {s.stage ? (
                  <div className="mt-1 text-sm opacity-85 line-clamp-2">
                    {bi(s.stage.desc, {
                      fieldName: `stage_${s.stageSlug}_desc`,
                      contentType: "general",
                    })}
                  </div>
                ) : null}
                <div className="mt-3 inline-flex items-center gap-1 text-sm opacity-90 group-hover:gap-2 transition-all">
                  {tr("explore")} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SUBJECT CATEGORIES */}
      <section className="bg-white py-20 border-y border-foreground/8">
        <div className="container-page">
          <SectionHeader eyebrow={tr("cat_eyebrow")} title={tr("cat_title")} desc={tr("cat_desc")} />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SUBJECT_CATEGORIES.map((c, i) => (
              <Link
                key={c.slug}
                to="/categories/$category"
                params={{ category: c.slug }}
                className="group rounded-2xl bg-background border border-foreground/10 p-6 hover:border-primary/60 hover:shadow-[var(--shadow-soft)] transition-all"
              >
                <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center text-foreground font-display text-lg">
                  {i + 1}
                </div>
                <div className="mt-4 font-display text-xl text-foreground group-hover:text-primary">
                  {bi(c.name, { fieldName: `category_${c.slug}_name`, contentType: "title" })}
                </div>
                <div className="mt-1 text-sm text-foreground/65">
                  {bi(c.desc, { fieldName: `category_${c.slug}_desc`, contentType: "general" })}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED LESSONS (public) / Analytics preview (admin) */}
      {isAdmin ? (
        <AdminHomeAnalyticsPreview />
      ) : (
        <section className="container-page py-20">
          <SectionHeader eyebrow={tr("lessons_eyebrow")} title={tr("lessons_title")} align="left" />
          <div className="mt-10 space-y-4">
            {featuredLessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tr("empty_published_lessons")}</p>
            ) : featuredLessons.map((l) => (
              <Link
                key={l.id}
                to="/grades/$grade/$lesson"
                params={{ grade: l.grade, lesson: l.id }}
                className="group flex items-center gap-6 rounded-2xl bg-white border border-foreground/10 p-5 hover:border-primary hover:shadow-[var(--shadow-soft)] transition-all"
              >
                <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center text-foreground shrink-0">
                  <BookOpen className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wider text-primary font-semibold">
                    {((): string => {
                      const g = gradeNameBi(l.grade);
                      return g ? bi(g) : l.grade;
                    })()} · {bi(l.unit)}
                  </div>
                  <div className="mt-1 font-display text-xl text-foreground truncate">{bi(l.title)}</div>
                  <div className="text-xs text-foreground/60 mt-1">{l.quiz.length} {tr("questions")} · {tr("lesson_meta")}</div>
                </div>
                <ArrowRight className={`h-5 w-5 text-foreground/40 group-hover:text-primary transition-all ${dir === "rtl" ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {isAdmin ? (
        <AdminHomeAnnouncements />
      ) : (
        <HomepageAnnouncements announcements={announcements} />
      )}

      {/* FEATURES strip */}
      <section className="bg-brand-dark text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: `url(${patternImg})`, backgroundSize: "240px" }}
          aria-hidden
        />
        <div className="container-page py-20 relative">
          <SectionHeader eyebrow={tr("feat_eyebrow")} title={tr("feat_title")} desc={tr("feat_desc")} tone="light" />
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Library, t: tr("feat_lib_t"), d: tr("feat_lib_d"), to: "/resource-library" as const },
              { icon: Video, t: tr("feat_vid_t"), d: tr("feat_vid_d"), to: "/video-lessons" as const },
              { icon: ClipboardCheck, t: tr("feat_quiz_t"), d: tr("feat_quiz_d"), to: "/quizzes" as const },
              { icon: Users, t: tr("feat_par_t"), d: tr("feat_par_d"), to: "/parent" as const },
            ].map((f) => {
              const card = (
                <>
                  <div className="h-12 w-12 rounded-xl bg-primary text-foreground flex items-center justify-center">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <div className="mt-4 font-display text-xl">{f.t}</div>
                  <div className="mt-2 text-sm opacity-80 leading-relaxed">{f.d}</div>
                </>
              );
              return f.to ? (
                <Link
                  key={f.t}
                  to={f.to}
                  className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors block"
                >
                  {card}
                </Link>
              ) : (
                <div key={f.t} className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors">
                  {card}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="container-page py-20">
        <div className="rounded-3xl bg-white border border-foreground/10 p-10 md:p-16 shadow-[var(--shadow-soft)]">
          <div className="grid gap-10 md:grid-cols-4 text-center">
            {[
              { n: String(stats.lessonCount), l: tr("stat_lessons") },
              { n: String(stats.educationalFileCount), l: tr("stat_educational_files") },
              { n: String(stats.videoCount), l: tr("stat_videos") },
              { n: String(stats.quizCount), l: tr("stat_assessments") },
            ].map((s) => (
              <div key={s.l}>
                <div className="font-display text-5xl md:text-6xl text-primary">{s.n}</div>
                <div className="mt-2 text-sm uppercase tracking-wider text-foreground/65">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARENT / STUDENT CTA */}
      <section className="container-page pb-20">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-brand-dark text-white p-10 relative overflow-hidden">
            <div className={`absolute ${dir === "rtl" ? "-left-10" : "-right-10"} -bottom-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl`} />
            <Users className="h-10 w-10 text-primary" />
            <h3 className="mt-4 font-display text-3xl">
              {isAdmin ? tr("admin_home_parent_directory_title") : tr("for_parents")}
            </h3>
            <p className="mt-2 opacity-90 max-w-md">
              {isAdmin ? tr("admin_home_parent_directory_lead") : tr("for_parents_d")}
            </p>
            {isAdmin ? (
              <Link to="/admin/parents" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary text-foreground px-6 py-3 font-semibold hover:translate-y-[-2px] transition-transform">
                {tr("admin_home_parent_directory_cta")}
                <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </Link>
            ) : (
              <Link to="/parent" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary text-foreground px-6 py-3 font-semibold hover:translate-y-[-2px] transition-transform">
                {tr("visit_parent")} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </Link>
            )}
          </div>
          <div className="rounded-3xl bg-white border border-foreground/10 p-10 relative overflow-hidden">
            <GraduationCap className="h-10 w-10 text-primary" />
            <h3 className="mt-4 font-display text-3xl text-foreground">
              {isAdmin ? tr("admin_home_honor_board_title") : tr("for_students")}
            </h3>
            <p className="mt-2 text-foreground/65 max-w-md">
              {isAdmin ? tr("admin_home_honor_board_lead") : tr("for_students_d")}
            </p>
            {isAdmin ? (
              <Link to="/admin/honor-board" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary text-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition-colors">
                {tr("admin_home_honor_board_cta")}
                <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </Link>
            ) : (
              <Link to="/student" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary text-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition-colors">
                {tr("open_portal")} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
