import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight, BookOpen, GraduationCap, Library, Video, ClipboardCheck,
  Users, Megaphone, Award, Sparkles, Play, Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero.jpg";
import patternImg from "@/assets/pattern.jpg";
import kgImg from "@/assets/kg.jpg";
import elemImg from "@/assets/elementary.jpg";
import midImg from "@/assets/middle.jpg";
import highImg from "@/assets/high.jpg";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AskMrAhmed } from "@/components/ask-mr-ahmed";
import { useI18n, type TKey } from "@/lib/i18n";
import { SUBJECT_CATEGORIES } from "@/lib/categories";
import { useCMS, useCMSStats, useAllAnnouncements } from "@/lib/cms";
import { gradeDisplayName } from "@/lib/grade-utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ignite Islamic Academy — Online Islamic Learning" },
      { name: "description", content: "Bilingual online Islamic education for KG1–Grade 12. Explore lessons, videos, quizzes, worksheets and parent resources in English and Arabic." },
      { property: "og:title", content: "Ignite Islamic Academy — Online Islamic Learning" },
      { property: "og:description", content: "Bilingual Islamic education for KG1–Grade 12: lessons, videos, quizzes, worksheets and parent resources." },
      { property: "og:url", content: "https://ignite-faith-learn.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://ignite-faith-learn.lovable.app/" }],
  }),
  component: Home,
});

function Home() {
  const { tr, dir, lang } = useI18n();
  const { lessons } = useCMS();
  const stats = useCMSStats();
  const announcements = useAllAnnouncements();
  const featuredLessons = lessons.filter((l) => l.published).slice(0, 3);
  const [signedIn, setSignedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setSignedIn(!!data.user);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
      setAuthReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  function goToStudent() {
    window.location.assign("/student");
  }

  const stages: Array<{ name: TKey; grades: TKey; img: string; tint: string; to: string }> = [
    { name: "stage_kg", grades: "stage_kg_grades", img: kgImg, tint: "from-gold/40", to: "/grades" },
    { name: "stage_elem", grades: "stage_elem_grades", img: elemImg, tint: "from-emerald/40", to: "/grades" },
    { name: "stage_mid", grades: "stage_mid_grades", img: midImg, tint: "from-primary/40", to: "/grades" },
    { name: "stage_high", grades: "stage_high_grades", img: highImg, tint: "from-emerald/50", to: "/grades" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader showPartnerLogos />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden bg-primary text-primary-foreground">
          <div
            className="absolute inset-0 opacity-[0.07] mix-blend-luminosity pointer-events-none"
            style={{ backgroundImage: `url(${patternImg})`, backgroundSize: "320px" }}
            aria-hidden
          />
          <div className="container-page relative grid items-center gap-10 py-16 sm:gap-12 sm:py-20 md:py-24 lg:grid-cols-2 lg:gap-16 lg:py-28 xl:py-32">
            <div className="relative z-10 flex flex-col justify-center">
              <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-medium tracking-wide text-gold sm:text-sm">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>{tr("hero_badge")}</span>
              </div>
              <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:mt-6 sm:text-5xl md:text-6xl lg:text-[4.25rem] lg:leading-[1.05] xl:text-7xl">
                {tr("hero_title_1")}{" "}
                <span className="text-gold italic">{tr("hero_title_2")}</span>{" "}
                {tr("hero_title_3")}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed opacity-90 sm:mt-6 sm:text-lg sm:leading-relaxed">
                {tr("hero_desc")}
              </p>
              <div className="relative z-20 mt-7 flex flex-wrap gap-3 sm:mt-8 sm:gap-4">
                {authReady && signedIn ? (
                  <a
                    href="/student"
                    onClick={(e) => {
                      e.preventDefault();
                      goToStudent();
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 font-semibold text-gold-foreground shadow-[var(--shadow-gold)] hover:translate-y-[-2px] transition-transform"
                  >
                    {tr("nav_student")} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
                  </a>
                ) : (
                  <>
                    <a
                      href="/auth?mode=signup"
                      className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 font-semibold text-gold-foreground shadow-[var(--shadow-gold)] hover:translate-y-[-2px] transition-transform"
                    >
                      {tr("cta_signup")} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
                    </a>
                    <a
                      href="/auth?mode=login"
                      className="inline-flex items-center gap-2 rounded-full bg-primary-foreground text-primary px-7 py-3.5 font-semibold hover:bg-primary-foreground/90 transition-colors"
                    >
                      {tr("cta_login")}
                    </a>
                  </>
                )}
                <Link to="/grades" className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 px-7 py-3.5 font-semibold hover:bg-primary-foreground/10 transition-colors">
                  <Play className="h-4 w-4" /> {tr("cta_explore")}
                </Link>
              </div>

              <div className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-primary-foreground/15 pt-8 sm:mt-12 sm:gap-6 sm:pt-10">
                {[
                  { n: String(stats.lessonCount), l: tr("stat_lessons") },
                  { n: String(stats.gradeCount), l: tr("stat_grades") },
                  { n: String(stats.subjectCount), l: tr("stat_subjects") },
                ].map((s) => (
                  <div key={s.l} className="text-center sm:text-start">
                    <div className="font-display text-2xl text-gold sm:text-3xl">{s.n}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider opacity-75 sm:text-xs">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-xl lg:max-w-none lg:mx-0">
              <div className="absolute -inset-6 bg-gold/20 blur-3xl rounded-full pointer-events-none" aria-hidden />
              <div className="relative rounded-3xl overflow-hidden shadow-[var(--shadow-elegant)] border border-gold/20">
                <img src={heroImg} alt="" width={1600} height={1100} className="w-full h-auto" />
              </div>
              <div className={`absolute -bottom-6 ${dir === "rtl" ? "-right-6" : "-left-6"} rounded-2xl bg-card text-card-foreground p-4 shadow-[var(--shadow-elegant)] hidden md:flex items-center gap-3`}>
                <div className="h-12 w-12 rounded-xl bg-emerald flex items-center justify-center text-emerald-foreground">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{tr("badge_certified")}</div>
                  <div className="text-xs text-muted-foreground">{tr("badge_certified_sub")}</div>
                </div>
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
                to={s.to}
                className="group relative overflow-hidden rounded-3xl bg-card border border-border shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition-all hover:-translate-y-1"
              >
                <div className="aspect-[4/5] overflow-hidden">
                  <img src={s.img} alt="" width={800} height={600} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className={`absolute inset-0 bg-gradient-to-t ${s.tint} via-primary/70 to-primary/95`} />
                <div className="absolute inset-0 p-6 flex flex-col justify-end text-primary-foreground">
                  <div className="text-xs uppercase tracking-wider opacity-80 text-gold">{tr(s.grades)}</div>
                  <div className="font-display text-2xl mt-1">{tr(s.name)}</div>
                  <div className="mt-3 inline-flex items-center gap-1 text-sm opacity-90 group-hover:gap-2 transition-all">
                    {tr("explore")} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* SUBJECT CATEGORIES */}
        <section className="bg-cream py-20">
          <div className="container-page">
            <SectionHeader eyebrow={tr("cat_eyebrow")} title={tr("cat_title")} desc={tr("cat_desc")} />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SUBJECT_CATEGORIES.map((c, i) => (
                <Link
                  key={c.slug}
                  to="/categories/$category"
                  params={{ category: c.slug }}
                  className="group rounded-2xl bg-card border border-border p-6 hover:border-gold/60 hover:shadow-[var(--shadow-soft)] transition-all"
                >
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald to-primary flex items-center justify-center text-primary-foreground font-display text-lg">
                    {i + 1}
                  </div>
                  <div className="mt-4 font-display text-xl text-primary group-hover:text-emerald">{c.name[lang]}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{c.desc[lang]}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURED + LATEST LESSONS */}
        <section className="container-page py-20 grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <SectionHeader eyebrow={tr("lessons_eyebrow")} title={tr("lessons_title")} align="left" />
            <div className="mt-10 space-y-4">
              {featuredLessons.length === 0 ? (
                <p className="text-sm text-muted-foreground">{lang === "ar" ? "لا توجد دروس منشورة بعد." : "No published lessons yet."}</p>
              ) : featuredLessons.map((l) => (
                <Link
                  key={l.id}
                  to="/grades/$grade/$lesson"
                  params={{ grade: l.grade, lesson: l.id }}
                  className="group flex items-center gap-6 rounded-2xl bg-card border border-border p-5 hover:border-emerald hover:shadow-[var(--shadow-soft)] transition-all"
                >
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-gold/40 to-emerald/20 flex items-center justify-center text-primary shrink-0">
                    <BookOpen className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs uppercase tracking-wider text-emerald font-semibold">
                      {gradeDisplayName(l.grade, lang)} · {l.unit[lang]}
                    </div>
                    <div className="mt-1 font-display text-xl text-primary truncate">{l.title[lang]}</div>
                    <div className="text-xs text-muted-foreground mt-1">{l.quiz.length} {tr("questions")} · {tr("lesson_meta")}</div>
                  </div>
                  <ArrowRight className={`h-5 w-5 text-muted-foreground group-hover:text-primary transition-all ${dir === "rtl" ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
                </Link>
              ))}
            </div>
          </div>

          {/* Announcements */}
          <div>
            <SectionHeader eyebrow={tr("ann_eyebrow")} title={tr("ann_title")} align="left" />
            <div className="mt-10 rounded-3xl bg-primary text-primary-foreground p-6 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2 text-gold">
                <Megaphone className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">{tr("ann_school")}</span>
              </div>
              <ul className="mt-6 space-y-5">
                {announcements.length === 0 ? (
                  <li className="text-sm opacity-80">{lang === "ar" ? "لا توجد إعلانات بعد." : "No announcements yet."}</li>
                ) : announcements.slice(0, 3).map((a) => (
                  <li key={a.slug} className="border-b border-white/10 last:border-0 pb-5 last:pb-0">
                    <Link to="/announcements/$slug" params={{ slug: a.slug }} className="block hover:opacity-90">
                      <div className="flex items-center gap-2 text-xs">
                        <Calendar className="h-3.5 w-3.5 text-gold" />
                        <span className="opacity-80">{a.date}</span>
                        <span className="ms-auto rounded-full bg-gold/20 text-gold px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{a.tag[lang]}</span>
                      </div>
                      <div className="mt-2 font-medium leading-snug">{a.title[lang]}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FEATURES strip */}
        <section className="bg-primary text-primary-foreground relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: `url(${patternImg})`, backgroundSize: "240px" }}
            aria-hidden
          />
          <div className="container-page py-20 relative">
            <SectionHeader eyebrow={tr("feat_eyebrow")} title={tr("feat_title")} desc={tr("feat_desc")} tone="light" />
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Library, t: tr("feat_lib_t"), d: tr("feat_lib_d") },
                { icon: Video, t: tr("feat_vid_t"), d: tr("feat_vid_d") },
                { icon: ClipboardCheck, t: tr("feat_quiz_t"), d: tr("feat_quiz_d") },
                { icon: Users, t: tr("feat_par_t"), d: tr("feat_par_d") },
              ].map((f) => (
                <div key={f.t} className="rounded-2xl bg-primary-foreground/5 border border-primary-foreground/10 p-6 hover:bg-primary-foreground/10 transition-colors">
                  <div className="h-12 w-12 rounded-xl bg-gold text-gold-foreground flex items-center justify-center">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <div className="mt-4 font-display text-xl">{f.t}</div>
                  <div className="mt-2 text-sm opacity-80 leading-relaxed">{f.d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="container-page py-20">
          <div className="rounded-3xl bg-gradient-to-br from-cream to-accent/30 border border-border p-10 md:p-16">
            <div className="grid gap-10 md:grid-cols-4 text-center">
              {[
                { n: String(stats.lessonCount), l: tr("stat_lessons") },
                { n: String(stats.fileCount), l: tr("stat_worksheets") },
                { n: String(stats.videoCount), l: tr("stat_videos") },
                { n: String(stats.articleCount), l: tr("stat_assessments") },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display text-5xl md:text-6xl text-primary">{s.n}</div>
                  <div className="mt-2 text-sm uppercase tracking-wider text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PARENT / STUDENT CTA */}
        <section className="container-page pb-20">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-emerald text-emerald-foreground p-10 relative overflow-hidden">
              <div className={`absolute ${dir === "rtl" ? "-left-10" : "-right-10"} -bottom-10 h-48 w-48 rounded-full bg-gold/20 blur-3xl`} />
              <Users className="h-10 w-10 text-gold" />
              <h3 className="mt-4 font-display text-3xl">{tr("for_parents")}</h3>
              <p className="mt-2 opacity-90 max-w-md">{tr("for_parents_d")}</p>
              <Link to="/parent" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold text-gold-foreground px-6 py-3 font-semibold hover:translate-y-[-2px] transition-transform">
                {tr("visit_parent")} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </Link>
            </div>
            <div className="rounded-3xl bg-card border border-border p-10 relative overflow-hidden">
              <GraduationCap className="h-10 w-10 text-emerald" />
              <h3 className="mt-4 font-display text-3xl text-primary">{tr("for_students")}</h3>
              <p className="mt-2 text-muted-foreground max-w-md">{tr("for_students_d")}</p>
              <Link to="/student" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-emerald transition-colors">
                {tr("open_portal")} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <AskMrAhmed />
    </div>
  );
}

function SectionHeader({
  eyebrow, title, desc, align = "center", tone = "dark",
}: { eyebrow: string; title: string; desc?: string; align?: "center" | "left"; tone?: "dark" | "light" }) {
  return (
    <div className={align === "center" ? "text-center max-w-2xl mx-auto" : "max-w-2xl"}>
      <div className={`text-xs uppercase tracking-[0.22em] font-semibold ${tone === "light" ? "text-gold" : "text-emerald"}`}>{eyebrow}</div>
      <h2 className={`mt-3 font-display text-4xl md:text-5xl ${tone === "light" ? "text-primary-foreground" : "text-primary"}`}>{title}</h2>
      {desc && <p className={`mt-4 text-base ${tone === "light" ? "opacity-80" : "text-muted-foreground"}`}>{desc}</p>}
    </div>
  );
}
