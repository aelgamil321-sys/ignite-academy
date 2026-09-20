import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import {
  ArrowRight, BookOpen, GraduationCap, Library, Video, ClipboardCheck,
  Users, Heart, ShieldCheck, Sparkles, Baby, Landmark,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero.jpg";
import { HOMEPAGE_STAGE_CARDS, STAGE_CARD_IMAGES } from "@/lib/stage-images";
import { useI18n } from "@/lib/i18n";
import { SUBJECT_CATEGORIES } from "@/lib/categories";
import { useCMS, useCMSStats, useAllAnnouncements } from "@/lib/cms";
import { gradeNameBi } from "@/lib/grade-utils";
import { useHomepageContentPrefetch } from "@/hooks/use-cms-content-prefetch";
import { getAccountRole, postAuthPathForRole } from "@/lib/account-role";
import { BRAND } from "@/lib/brand";
import { HomepageAnnouncements } from "@/components/homepage-announcements";
import { AdminHomeAnalyticsPreview } from "@/components/admin-home-analytics-preview";
import { AdminHomeAnnouncements } from "@/components/admin-home-announcements";

const STAGE_ICONS: Record<(typeof HOMEPAGE_STAGE_CARDS)[number]["key"], ComponentType<{ className?: string }>> = {
  kg: Baby,
  elementary: BookOpen,
  middle: Landmark,
  high: GraduationCap,
};

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
  }));

  const benefits = [
    { icon: Sparkles, label: tr("hero_benefit_impact") },
    { icon: ShieldCheck, label: tr("hero_benefit_trusted") },
    { icon: Heart, label: tr("hero_benefit_community") },
  ];

  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-x-clip bg-[#FAF8F5]">
        <div className="container-page grid items-center gap-10 py-10 sm:py-14 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:gap-8 lg:gap-12 lg:py-16 xl:py-20">
          <div className="relative z-10 mx-auto max-w-xl text-center md:mx-0 md:max-w-none md:text-start">
            <p className="text-[13px] font-semibold tracking-wide text-[#FF7A00] sm:text-sm">
              {tr("hero_eyebrow")}
            </p>
            <h1
              className="mt-3 font-display text-[2rem] font-bold leading-[1.2] text-[#7A0D14] sm:text-4xl md:text-[2.65rem] lg:text-[3.15rem] lg:leading-[1.18]"
              dir="rtl"
              lang="ar"
            >
              {BRAND.taglineAr}
            </h1>
            <p className="mt-3 font-display text-lg font-medium text-[#2D2D2D] sm:text-xl lg:text-[1.35rem]" dir="ltr">
              {BRAND.taglineEn}
            </p>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[#2D2D2D]/80 sm:text-base lg:text-[1.05rem] lg:leading-8">
              {tr("hero_desc")}
            </p>
            <div className="relative z-20 mt-7 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              {signedIn ? (
                <a
                  href={dashboardPath}
                  onClick={(e) => {
                    e.preventDefault();
                    goToDashboard();
                  }}
                  className="inline-flex items-center justify-center rounded-lg bg-[#7A0D14] px-7 py-3 text-sm font-semibold text-[#FAF8F5] shadow-[0_10px_24px_-12px_rgba(122,13,20,0.55)] transition-transform hover:-translate-y-0.5"
                >
                  {dashboardPath === "/teacher"
                    ? tr("teacher_title")
                    : dashboardPath === "/parent/dashboard"
                      ? tr("parent_dashboard_title")
                      : dashboardPath.startsWith("/admin")
                        ? tr("nav_admin")
                        : tr("cta_start_now")}
                </a>
              ) : (
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="inline-flex items-center justify-center rounded-lg bg-[#7A0D14] px-7 py-3 text-sm font-semibold text-[#FAF8F5] shadow-[0_10px_24px_-12px_rgba(122,13,20,0.55)] transition-transform hover:-translate-y-0.5"
                >
                  {tr("cta_start_now")}
                </Link>
              )}
              <Link
                to="/grades"
                className="inline-flex items-center justify-center rounded-lg border-2 border-[#7A0D14] bg-[#FAF8F5] px-7 py-3 text-sm font-semibold text-[#7A0D14] transition-colors hover:bg-white"
              >
                {tr("cta_explore_stages")}
              </Link>
            </div>
            <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-2 lg:gap-4">
              {benefits.map((b) => (
                <li key={b.label} className="flex items-center justify-center gap-2.5 text-sm font-medium text-[#2D2D2D] md:justify-start">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF7A00] text-white">
                    <b.icon className="h-4 w-4" aria-hidden />
                  </span>
                  {b.label}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-lg md:max-w-none">
            <div className="absolute -inset-6 rounded-[2rem] bg-[#FF7A00]/10 blur-2xl" aria-hidden />
            <div className="relative overflow-hidden rounded-[1.35rem] shadow-[0_24px_50px_-24px_rgba(45,45,45,0.45)]">
              <img
                src={heroImg}
                alt=""
                width={1600}
                height={1100}
                className="aspect-[4/3] h-auto w-full object-cover object-[50%_35%] sm:aspect-[5/4]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ACCESS — Academic stages */}
      <section id="stages" className="bg-[#FAF8F5] pb-16 pt-4 sm:pb-20">
        <div className="container-page">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[13px] font-semibold tracking-wide text-[#FF7A00] sm:text-sm">{tr("stages_eyebrow")}</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-[#2D2D2D] sm:text-4xl md:text-[2.6rem]">{tr("stages_title")}</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[#2D2D2D]/70 sm:text-base">{tr("stages_desc")}</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {stages.map((s) => {
              const Icon = STAGE_ICONS[s.key];
              return (
                <Link
                  key={s.name}
                  to={isAdmin ? "/admin/grades" : s.to}
                  search={isAdmin ? { stage: s.stageSlug } : undefined}
                  className="group relative isolate min-h-0 overflow-hidden rounded-[1.25rem] shadow-[0_16px_40px_-24px_rgba(45,45,45,0.45)]"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={s.img}
                      alt={tr(s.name)}
                      width={800}
                      height={1000}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/15" />
                  <span className="absolute start-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#FF7A00] text-white shadow-md">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-start p-5 text-white">
                    <h3 className="font-display text-xl font-semibold leading-snug">{tr(s.name)}</h3>
                    <p className="mt-1 text-sm font-medium text-white/95">{tr(s.subtitle)}</p>
                    <p className="mt-1 text-xs text-white/80">{tr(s.grades)}</p>
                    <span className="mt-4 inline-flex items-center rounded-full border border-white/90 px-4 py-1.5 text-sm font-semibold text-white transition-colors group-hover:bg-white/15">
                      {tr("explore")}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
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
                <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-display text-lg">
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
        <section id="featured-lessons" className="container-page scroll-mt-24 py-20">
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
      <section className="relative bg-[#FAF8F5]">
        <div className="container-page relative py-20">
          <SectionHeader eyebrow={tr("feat_eyebrow")} title={tr("feat_title")} desc={tr("feat_desc")} />
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Library, t: tr("feat_lib_t"), d: tr("feat_lib_d"), to: "/resource-library" as const },
              { icon: Video, t: tr("feat_vid_t"), d: tr("feat_vid_d"), to: "/video-lessons" as const },
              { icon: ClipboardCheck, t: tr("feat_quiz_t"), d: tr("feat_quiz_d"), to: "/quizzes" as const },
              { icon: Users, t: tr("feat_par_t"), d: tr("feat_par_d"), to: "/parent" as const },
            ].map((f) => (
              <Link
                key={f.t}
                to={f.to}
                className="block rounded-2xl border border-[#E7E2DC] bg-white p-6 shadow-[var(--shadow-soft)] transition-colors hover:border-[#7A0D14]/35"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7A0D14] text-[#FAF8F5]">
                  <f.icon className="h-6 w-6" />
                </div>
                <div className="mt-4 font-display text-xl text-[#2D2D2D]">{f.t}</div>
                <div className="mt-2 text-sm leading-relaxed text-[#2D2D2D]/70">{f.d}</div>
              </Link>
            ))}
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
              <Link to="/admin/parents" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:translate-y-[-2px] transition-transform">
                {tr("admin_home_parent_directory_cta")}
                <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </Link>
            ) : (
              <Link to="/parent" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:translate-y-[-2px] transition-transform">
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
              <Link to="/admin/honor-board" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition-colors">
                {tr("admin_home_honor_board_cta")}
                <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </Link>
            ) : (
              <Link to="/student" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition-colors">
                {tr("open_portal")} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
