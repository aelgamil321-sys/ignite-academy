import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { blockParentFromStudentRoutes } from "@/lib/parent-route-guard";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { ChevronLeft, Plus, Trash2, Eye, EyeOff, Save, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { getGrade, type Bi, type Grade, type Lesson, type QuizQuestion } from "@/lib/curriculum";
import { useCMS, ytId } from "@/lib/cms";
import { gradeMatches, normalizeGradeSlug } from "@/lib/grade-utils";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage, formatError } from "@/lib/upload";

// ---------- helpers ----------
export function slugifyUnit(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled";
}
const L = (en: string, ar: string): Bi => ({ en, ar });
const empty: Bi = { en: "", ar: "" };
const emptyQ: QuizQuestion = {
  q: { en: "", ar: "" },
  type: "multiple_choice",
  options: [{ en: "", ar: "" }, { en: "", ar: "" }, { en: "", ar: "" }, { en: "", ar: "" }],
  answer: 0,
  points: 1,
};

// ---------- route ----------
export const Route = createFileRoute("/grades/$grade/units/$unit")({
  beforeLoad: () => blockParentFromStudentRoutes(),
  loader: ({ params }) => {
    const grade = getGrade(params.grade);
    if (!grade) throw notFound();
    return { grade, unitSlug: params.unit };
  },
  head: ({ params }) => ({
    meta: [
      { title: `Unit — Ignite Islamic Academy` },
      { name: "description", content: "Unit content management." },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [
      { rel: "canonical", href: `https://ignite-faith-learn.lovable.app/grades/${params.grade}/units/${params.unit}` },
    ],
  }),
  component: UnitPage,
  notFoundComponent: () => <div className="container-page py-20">Unit not found.</div>,
  errorComponent: ({ error }) => <div className="container-page py-20">Error: {error.message}</div>,
});

type Tab = "overview" | "lessons" | "information" | "articles" | "files" | "videos" | "quizzes";

// ---------- info/quiz types ----------
interface UnitInfo {
  id: string;
  title: Bi;
  description: Bi;
  key_points: Bi;
  notes: Bi;
  published: boolean;
}
interface UnitQuiz {
  id: string;
  title: Bi;
  questions: QuizQuestion[];
  published: boolean;
}

function UnitPage() {
  const { grade, unitSlug } = Route.useLoaderData() as { grade: Grade; unitSlug: string };
  const { tr, lang, dir } = useI18n();
  const { lessons, files, videos, articles, refresh } = useCMS();
  const [tab, setTab] = useState<Tab>("overview");

  // Determine unit display name from any source
  const unitName = useMemo<Bi>(() => {
    const fromStatic = grade.lessons.find((l: Lesson) => slugifyUnit(l.unit.en) === unitSlug)?.unit;
    if (fromStatic) return fromStatic;
    const fromCustom = lessons.find((l) => gradeMatches(l.grade, grade.slug) && slugifyUnit(l.unit.en || l.unit.ar) === unitSlug)?.unit;
    if (fromCustom) return fromCustom;
    return { en: unitSlug, ar: unitSlug };
  }, [grade, unitSlug, lessons]);

  // Filtered lists for this grade+unit
  const unitLessonsStatic = grade.lessons.filter((l: Lesson) => slugifyUnit(l.unit.en) === unitSlug);
  const unitLessonsCustom = lessons.filter(
    (l) => gradeMatches(l.grade, grade.slug) && slugifyUnit(l.unit.en || l.unit.ar) === unitSlug,
  );
  const unitFiles = files.filter(
    (f) => gradeMatches(f.grade, grade.slug) && slugifyUnit(f.unit.en || f.unit.ar) === unitSlug,
  );
  const unitVideos = videos.filter(
    (v) => gradeMatches(v.grade, grade.slug) && slugifyUnit(v.unit.en || v.unit.ar) === unitSlug,
  );
  type ArticleWithUnit = (typeof articles)[number] & { grade?: string; unitSlug?: string };
  const unitArticles = (articles as ArticleWithUnit[]).filter(
    (a) => a.grade && gradeMatches(a.grade, grade.slug) && a.unitSlug === unitSlug,
  );

  // Information & quizzes local state
  const [infos, setInfos] = useState<UnitInfo[]>([]);
  const [quizzes, setQuizzes] = useState<UnitQuiz[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(true);

  const fetchExtras = async () => {
    try {
      const [i, q] = await Promise.all([
        supabase
          .from("unit_information" as never)
          .select("*")
          .eq("grade", grade.slug)
          .eq("unit_slug", unitSlug)
          .order("created_at", { ascending: false }),
        supabase
          .from("unit_quizzes" as never)
          .select("*")
          .eq("grade", grade.slug)
          .eq("unit_slug", unitSlug)
          .order("created_at", { ascending: false }),
      ]);
      if (i.error) throw i.error;
      if (q.error) throw q.error;
      setInfos((i.data ?? []) as unknown as UnitInfo[]);
      setQuizzes((q.data ?? []) as unknown as UnitQuiz[]);
    } catch (e) {
      toast.error(`Load failed: ${formatError(e)}`);
    } finally {
      setLoadingExtras(false);
    }
  };
  useEffect(() => {
    void fetchExtras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade.slug, unitSlug]);

  const tabs: Array<{ key: Tab; label: Bi; count?: number }> = [
    { key: "overview", label: L("Overview", "نظرة عامة") },
    { key: "lessons", label: L("Lessons", "الدروس"), count: unitLessonsStatic.length + unitLessonsCustom.length },
    { key: "information", label: L("Information", "المعلومات"), count: infos.length },
    { key: "articles", label: L("Articles", "المقالات"), count: unitArticles.length },
    { key: "files", label: L("Files", "الملفات"), count: unitFiles.length },
    { key: "videos", label: L("Videos", "الفيديوهات"), count: unitVideos.length },
    { key: "quizzes", label: L("Quizzes", "الاختبارات"), count: quizzes.length },
  ];

  return (
    <PageShell
      eyebrow={`${grade.name[lang]} · ${tr("nav_stages")}`}
      title={unitName[lang] || unitName.ar || unitName.en}
      crumbs={[
        { label: tr("nav_stages"), to: "/grades" },
        { label: grade.name[lang], to: "/grades/$grade", params: { grade: grade.slug } },
        { label: unitName[lang] },
      ]}
    >
      <Link
        to="/grades/$grade"
        params={{ grade: grade.slug }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-5"
      >
        <ChevronLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
        {grade.name[lang]}
      </Link>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "border border-border text-foreground/70 hover:border-primary hover:text-primary"
            }`}
          >
            {t.label[lang]}
            {typeof t.count === "number" && (
              <span className="text-[11px] opacity-80">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab
          counts={{
            lessons: unitLessonsStatic.length + unitLessonsCustom.length,
            information: infos.length,
            articles: unitArticles.length,
            files: unitFiles.length,
            videos: unitVideos.length,
            quizzes: quizzes.length,
          }}
          lang={lang}
        />
      )}

      {tab === "lessons" && (
        <LessonsTab
          gradeSlug={grade.slug}
          unitSlug={unitSlug}
          unitName={unitName}
          lang={lang}
          builtIn={unitLessonsStatic}
          custom={unitLessonsCustom}
          onRefresh={refresh}
        />
      )}

      {tab === "information" && (
        <InfoTab
          gradeSlug={grade.slug}
          unitSlug={unitSlug}
          unitName={unitName}
          lang={lang}
          infos={infos}
          loading={loadingExtras}
          onRefresh={fetchExtras}
        />
      )}

      {tab === "articles" && (
        <ArticlesTab
          gradeSlug={grade.slug}
          unitSlug={unitSlug}
          lang={lang}
          articles={unitArticles}
          onRefresh={refresh}
        />
      )}

      {tab === "files" && (
        <FilesTab
          gradeSlug={grade.slug}
          unitSlug={unitSlug}
          unitName={unitName}
          lang={lang}
          files={unitFiles}
          onRefresh={refresh}
        />
      )}

      {tab === "videos" && (
        <VideosTab
          gradeSlug={grade.slug}
          unitSlug={unitSlug}
          unitName={unitName}
          lang={lang}
          videos={unitVideos}
          onRefresh={refresh}
        />
      )}

      {tab === "quizzes" && (
        <QuizzesTab
          gradeSlug={grade.slug}
          unitSlug={unitSlug}
          unitName={unitName}
          lang={lang}
          quizzes={quizzes}
          loading={loadingExtras}
          onRefresh={fetchExtras}
        />
      )}
    </PageShell>
  );
}

// ============== shared bits ==============
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] ${className}`}>
      {children}
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-destructive ms-1">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
const inputCls =
  "block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary";

function PublishBar({
  pub, setPub, onSave, saving, lang,
}: { pub: boolean; setPub: (b: boolean) => void; onSave: () => void; saving: boolean; lang: "en" | "ar" }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} className="accent-primary h-4 w-4" />
        {L("Publish now (otherwise save as draft)", "النشر الآن (وإلا حفظ كمسودة)")[lang]}
      </label>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors shadow-[var(--shadow-soft)] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Save className="h-4 w-4" />
        {saving
          ? L("Saving…", "جارٍ الحفظ…")[lang]
          : pub
            ? L("Publish", "نشر")[lang]
            : L("Save Draft", "حفظ كمسودة")[lang]}
      </button>
    </div>
  );
}

function ItemActions({
  published, onToggle, onDelete,
}: { published: boolean; onToggle: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggle}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
          published ? "border-primary text-primary" : "border-border text-muted-foreground"
        }`}
      >
        {published ? <><Eye className="h-3.5 w-3.5" /> Published</> : <><EyeOff className="h-3.5 w-3.5" /> Draft</>}
      </button>
      <button
        onClick={onDelete}
        className="inline-flex items-center justify-center rounded-full border border-destructive/40 text-destructive p-1.5 hover:bg-destructive/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Empty({ lang, kind = "items" }: { lang: "en" | "ar"; kind?: "lessons" | "files" | "videos" | "quizzes" | "articles" | "info" | "items" }) {
  const map: Record<string, { en: string; ar: string }> = {
    lessons: { en: "No lessons added yet.", ar: "لا توجد دروس بعد." },
    files: { en: "No files available.", ar: "لا توجد ملفات متاحة." },
    videos: { en: "No videos uploaded.", ar: "لم يتم رفع أي فيديوهات." },
    quizzes: { en: "No quizzes yet.", ar: "لا توجد اختبارات بعد." },
    articles: { en: "No articles published.", ar: "لا توجد مقالات منشورة." },
    info: { en: "No information added yet.", ar: "لم تتم إضافة معلومات بعد." },
    items: { en: "No items yet.", ar: "لا توجد عناصر بعد." },
  };
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 py-10 text-center">
      <div className="text-sm text-muted-foreground">{map[kind][lang]}</div>
    </div>
  );
}

// ============== Overview ==============
function OverviewTab({
  counts, lang,
}: {
  counts: { lessons: number; information: number; articles: number; files: number; videos: number; quizzes: number };
  lang: "en" | "ar";
}) {
  const items: Array<{ k: keyof typeof counts; label: Bi }> = [
    { k: "lessons", label: L("Lessons", "الدروس") },
    { k: "information", label: L("Information", "المعلومات") },
    { k: "articles", label: L("Articles", "المقالات") },
    { k: "files", label: L("Files", "الملفات") },
    { k: "videos", label: L("Videos", "الفيديوهات") },
    { k: "quizzes", label: L("Quizzes", "الاختبارات") },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {items.map((it) => (
        <Card key={it.k}>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{it.label[lang]}</div>
          <div className="font-display text-3xl text-foreground mt-1">{counts[it.k]}</div>
        </Card>
      ))}
    </div>
  );
}

// ============== Lessons tab (read-only list of existing) ==============
function LessonsTab({
  gradeSlug, unitSlug, unitName, lang, builtIn, custom, onRefresh,
}: {
  gradeSlug: string; unitSlug: string; unitName: Bi; lang: "en" | "ar";
  builtIn: Lesson[];
  custom: ReturnType<typeof useCMS>["lessons"];
  onRefresh: () => Promise<void>;
}) {
  const allItems = [
    ...builtIn.map((l) => ({ id: l.slug, title: l.title, builtIn: true, published: true })),
    ...custom.map((l) => ({ id: l.id, title: l.title, builtIn: false, published: l.published })),
  ];
  const { deleteLesson } = useCMS();
  const onDelete = async (id: string) => {
    if (!confirm(L("Are you sure you want to delete this lesson?", "هل أنت متأكد أنك تريد حذف هذا الدرس?")[lang])) return;
    try {
      await deleteLesson(id);
      toast.success(L("Deleted", "تم الحذف")[lang]);
      await onRefresh();
    } catch { /* CMS layer already shows the error toast */ }
  };
  const togglePub = async (id: string, next: boolean) => {
    try {
      const { error } = await supabase.from("lessons").update({ published: next }).eq("id", id);
      if (error) throw error;
      await onRefresh();
    } catch (e) { toast.error(`Update failed: ${formatError(e)}`); }
  };
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        {L("To add a lesson to this unit, use the Admin → Add New Lesson form. Set Unit to ",
          "لإضافة درس لهذه الوحدة، استخدم لوحة الإدارة → إضافة درس جديد. اضبط الوحدة على ")[lang]}
        <span className="font-semibold text-foreground">“{unitName[lang]}”</span>
        {L(` and Grade to the current grade.`, ` والصف على الصف الحالي.`)[lang]}
        <Link to="/admin" className="ms-2 inline-flex items-center gap-1 text-primary hover:text-primary">
          <ExternalLink className="h-3.5 w-3.5" /> Admin
        </Link>
      </div>
      {allItems.length === 0 ? (
        <Empty lang={lang} kind="lessons" />
      ) : (
        allItems.map((l) => (
          <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex-1 min-w-0">
              <Link
                to="/grades/$grade/$lesson"
                params={{ grade: gradeSlug, lesson: l.id }}
                className="font-medium text-foreground hover:text-primary"
              >
                {l.title[lang]}
              </Link>
              <div className="text-xs text-muted-foreground">
                {l.builtIn ? L("Built-in", "مدمج")[lang] : L("Custom", "مخصص")[lang]}
              </div>
            </div>
            {!l.builtIn && (
              <ItemActions
                published={l.published}
                onToggle={() => void togglePub(l.id, !l.published)}
                onDelete={() => void onDelete(l.id)}
              />
            )}
          </div>
        ))
      )}
      <div className="text-xs text-muted-foreground">unit_slug: <code>{unitSlug}</code></div>
    </div>
  );
}

// ============== Information ==============
function InfoTab({
  gradeSlug, unitSlug, unitName, lang, infos, loading, onRefresh,
}: {
  gradeSlug: string; unitSlug: string; unitName: Bi; lang: "en" | "ar";
  infos: UnitInfo[]; loading: boolean; onRefresh: () => Promise<void>;
}) {
  const [titleEn, setTitleEn] = useState(""); const [titleAr, setTitleAr] = useState("");
  const [descEn, setDescEn] = useState(""); const [descAr, setDescAr] = useState("");
  const [kpEn, setKpEn] = useState(""); const [kpAr, setKpAr] = useState("");
  const [notesEn, setNotesEn] = useState(""); const [notesAr, setNotesAr] = useState("");
  const [pub, setPub] = useState(true);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!titleEn.trim() && !titleAr.trim()) {
      toast.error(L("Title required", "العنوان مطلوب")[lang]); return;
    }
    setSaving(true);
    try {
      const payload = {
        grade: gradeSlug,
        unit_slug: unitSlug,
        unit: unitName,
        title: { en: titleEn, ar: titleAr },
        description: { en: descEn, ar: descAr },
        key_points: { en: kpEn, ar: kpAr },
        notes: { en: notesEn, ar: notesAr },
        published: pub,
      };
      const { error } = await supabase.from("unit_information" as never).insert(payload as never);
      if (error) throw error;
      toast.success(L("Information saved!", "تم حفظ المعلومات!")[lang]);
      setTitleEn(""); setTitleAr(""); setDescEn(""); setDescAr("");
      setKpEn(""); setKpAr(""); setNotesEn(""); setNotesAr("");
      await onRefresh();
    } catch (e) {
      toast.error(`Save failed: ${formatError(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this information?")) return;
    try {
      const { error } = await supabase.from("unit_information" as never).delete().eq("id", id);
      if (error) throw error;
      toast.success(L("Deleted", "تم الحذف")[lang]);
      await onRefresh();
    } catch (e) { toast.error(`Delete failed: ${formatError(e)}`); }
  };
  const togglePub = async (id: string, next: boolean) => {
    try {
      const { error } = await supabase.from("unit_information" as never).update({ published: next } as never).eq("id", id);
      if (error) throw error;
      await onRefresh();
    } catch (e) { toast.error(`Update failed: ${formatError(e)}`); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-display text-xl text-foreground mb-4">{L("Add Information", "إضافة معلومات")[lang]}</h3>
        <div className="space-y-4">
          <Row>
            <Field label={L("Title (EN)", "العنوان (إنجليزي)")[lang]} required><input className={inputCls} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} /></Field>
            <Field label={L("Title (AR)", "العنوان (عربي)")[lang]} required><input className={inputCls} dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} /></Field>
          </Row>
          <Row>
            <Field label={L("Description (EN)", "الوصف (إنجليزي)")[lang]}><textarea className={inputCls} rows={4} value={descEn} onChange={(e) => setDescEn(e.target.value)} /></Field>
            <Field label={L("Description (AR)", "الوصف (عربي)")[lang]}><textarea className={inputCls} dir="rtl" rows={4} value={descAr} onChange={(e) => setDescAr(e.target.value)} /></Field>
          </Row>
          <Row>
            <Field label={L("Key Points (EN)", "النقاط الرئيسية (إنجليزي)")[lang]}><textarea className={inputCls} rows={4} value={kpEn} onChange={(e) => setKpEn(e.target.value)} /></Field>
            <Field label={L("Key Points (AR)", "النقاط الرئيسية (عربي)")[lang]}><textarea className={inputCls} dir="rtl" rows={4} value={kpAr} onChange={(e) => setKpAr(e.target.value)} /></Field>
          </Row>
          <Row>
            <Field label={L("Learning Notes (EN)", "ملاحظات التعلم (إنجليزي)")[lang]}><textarea className={inputCls} rows={3} value={notesEn} onChange={(e) => setNotesEn(e.target.value)} /></Field>
            <Field label={L("Learning Notes (AR)", "ملاحظات التعلم (عربي)")[lang]}><textarea className={inputCls} dir="rtl" rows={3} value={notesAr} onChange={(e) => setNotesAr(e.target.value)} /></Field>
          </Row>
          <PublishBar pub={pub} setPub={setPub} onSave={submit} saving={saving} lang={lang} />
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="font-display text-xl text-foreground">{L("Information", "المعلومات")[lang]}</h3>
        {loading ? (
          <div className="text-sm text-muted-foreground">{L("Loading…", "جارٍ التحميل…")[lang]}</div>
        ) : infos.length === 0 ? (
          <Empty lang={lang} kind="info" />
        ) : (
          infos.map((it) => (
            <div key={it.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">{it.title[lang]}</div>
                  {it.description[lang] && (
                    <p className="text-sm text-muted-foreground mt-1" dir={lang === "ar" ? "rtl" : "ltr"}>{it.description[lang]}</p>
                  )}
                  {it.key_points[lang] && (
                    <div className="mt-2 text-sm" dir={lang === "ar" ? "rtl" : "ltr"}>
                      <span className="font-semibold">{L("Key points:", "النقاط الرئيسية:")[lang]} </span>
                      {it.key_points[lang]}
                    </div>
                  )}
                  {it.notes[lang] && (
                    <div className="mt-2 text-sm text-muted-foreground" dir={lang === "ar" ? "rtl" : "ltr"}>
                      <span className="font-semibold">{L("Notes:", "ملاحظات:")[lang]} </span>
                      {it.notes[lang]}
                    </div>
                  )}
                </div>
                <ItemActions
                  published={it.published}
                  onToggle={() => void togglePub(it.id, !it.published)}
                  onDelete={() => void onDelete(it.id)}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============== Articles ==============
function ArticlesTab({
  gradeSlug, unitSlug, lang, articles, onRefresh,
}: {
  gradeSlug: string; unitSlug: string; lang: "en" | "ar";
  articles: Array<{ id: string; title: Bi; content: Bi; imageUrl?: string; published: boolean; category: string }>;
  onRefresh: () => Promise<void>;
}) {
  const [titleEn, setTitleEn] = useState(""); const [titleAr, setTitleAr] = useState("");
  const [bodyEn, setBodyEn] = useState(""); const [bodyAr, setBodyAr] = useState("");
  const [cat, setCat] = useState("announcement");
  const [img, setImg] = useState("");
  const [pub, setPub] = useState(true);
  const [saving, setSaving] = useState(false);

  const onImg = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const up = await uploadToStorage(f, "articles");
      setImg(up.url);
      toast.success(L("Image uploaded", "تم رفع الصورة")[lang]);
    } catch (err) { toast.error(formatError(err)); }
  };
  const submit = async () => {
    if (!titleEn.trim() && !titleAr.trim()) { toast.error(L("Title required", "العنوان مطلوب")[lang]); return; }
    setSaving(true);
    try {
      const payload = {
        title: { en: titleEn, ar: titleAr },
        content: { en: bodyEn, ar: bodyAr },
        category: cat,
        image_url: img || null,
        grade: gradeSlug,
        unit_slug: unitSlug,
        published: pub,
      };
      const { error } = await supabase.from("articles").insert(payload as never);
      if (error) throw error;
      toast.success(L("Article saved!", "تم حفظ المقال!")[lang]);
      setTitleEn(""); setTitleAr(""); setBodyEn(""); setBodyAr(""); setImg("");
      await onRefresh();
    } catch (e) { toast.error(`Save failed: ${formatError(e)}`); }
    finally { setSaving(false); }
  };
  const onDelete = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    try {
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw error;
      toast.success(L("Deleted", "تم الحذف")[lang]);
      await onRefresh();
    } catch (e) { toast.error(`Delete failed: ${formatError(e)}`); }
  };
  const togglePub = async (id: string, next: boolean) => {
    try {
      const { error } = await supabase.from("articles").update({ published: next } as never).eq("id", id);
      if (error) throw error;
      await onRefresh();
    } catch (e) { toast.error(`Update failed: ${formatError(e)}`); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-display text-xl text-foreground mb-4">{L("Add Article", "إضافة مقال")[lang]}</h3>
        <div className="space-y-4">
          <Row>
            <Field label={L("Title (EN)", "العنوان (إنجليزي)")[lang]} required><input className={inputCls} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} /></Field>
            <Field label={L("Title (AR)", "العنوان (عربي)")[lang]} required><input className={inputCls} dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} /></Field>
          </Row>
          <Row>
            <Field label={L("Body (EN)", "النص (إنجليزي)")[lang]}><textarea className={inputCls} rows={8} value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} /></Field>
            <Field label={L("Body (AR)", "النص (عربي)")[lang]}><textarea className={inputCls} dir="rtl" rows={8} value={bodyAr} onChange={(e) => setBodyAr(e.target.value)} /></Field>
          </Row>
          <Field label={L("Category", "التصنيف")[lang]}>
            <select className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="announcement">{L("Announcement", "إعلان")[lang]}</option>
              <option value="parent">{L("Parent Corner", "ركن الوالدين")[lang]}</option>
              <option value="lesson">{L("Lesson Note", "ملاحظة درس")[lang]}</option>
            </select>
          </Field>
          <Field label={L("Featured Image", "صورة مميزة")[lang]}>
            <input type="file" accept="image/*" onChange={onImg} className={inputCls} />
            {img && <img src={img} alt="" className="mt-2 max-h-40 rounded-lg border border-border" />}
          </Field>
          <PublishBar pub={pub} setPub={setPub} onSave={submit} saving={saving} lang={lang} />
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="font-display text-xl text-foreground">{L("Articles", "المقالات")[lang]}</h3>
        {articles.length === 0 ? (
          <Empty lang={lang} kind="articles" />
        ) : (
          articles.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground">{a.title[lang]}</div>
                <div className="text-xs text-muted-foreground">{a.category}</div>
              </div>
              <ItemActions
                published={a.published}
                onToggle={() => void togglePub(a.id, !a.published)}
                onDelete={() => void onDelete(a.id)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============== Files ==============
function FilesTab({
  gradeSlug, unitSlug, unitName, lang, files, onRefresh,
}: {
  gradeSlug: string; unitSlug: string; unitName: Bi; lang: "en" | "ar";
  files: ReturnType<typeof useCMS>["files"]; onRefresh: () => Promise<void>;
}) {
  const [titleEn, setTitleEn] = useState(""); const [titleAr, setTitleAr] = useState("");
  const [type, setType] = useState<"pdf" | "ppt" | "worksheet" | "image" | "word">("pdf");
  const [desc, setDesc] = useState("");
  const [uploaded, setUploaded] = useState<{ url: string; name: string; size: string } | null>(null);
  const [pub, setPub] = useState(true);
  const [saving, setSaving] = useState(false);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const up = await uploadToStorage(f, `files/${type}`);
      setUploaded({ url: up.url, name: up.name, size: up.size });
      toast.success(L("File uploaded", "تم رفع الملف")[lang]);
    } catch (err) { toast.error(formatError(err)); }
  };
  const submit = async () => {
    if (!titleEn.trim() && !titleAr.trim()) { toast.error(L("Title required", "العنوان مطلوب")[lang]); return; }
    if (!uploaded) { toast.error(L("File required", "الملف مطلوب")[lang]); return; }
    setSaving(true);
    try {
      const dbType = type === "word" ? "pdf" : type; // DB only has 4 types — store word as pdf
      const payload = {
        title: { en: titleEn || desc, ar: titleAr || desc },
        grade: gradeSlug,
        unit: unitName,
        lesson: "",
        type: dbType,
        file_url: uploaded.url,
        file_name: uploaded.name,
        size: uploaded.size,
        published: pub,
      };
      const { error } = await supabase.from("files").insert(payload as never);
      if (error) throw error;
      toast.success(L("File saved!", "تم حفظ الملف!")[lang]);
      setTitleEn(""); setTitleAr(""); setDesc(""); setUploaded(null);
      await onRefresh();
    } catch (e) { toast.error(`Save failed: ${formatError(e)}`); }
    finally { setSaving(false); }
  };
  const onDelete = async (id: string) => {
    if (!confirm("Delete this file?")) return;
    try {
      const { error } = await supabase.from("files").delete().eq("id", id);
      if (error) throw error;
      toast.success(L("Deleted", "تم الحذف")[lang]);
      await onRefresh();
    } catch (e) { toast.error(`Delete failed: ${formatError(e)}`); }
  };
  const togglePub = async (id: string, next: boolean) => {
    try {
      const { error } = await supabase.from("files").update({ published: next } as never).eq("id", id);
      if (error) throw error;
      await onRefresh();
    } catch (e) { toast.error(`Update failed: ${formatError(e)}`); }
  };

  // mark unitSlug as used (it's implicit in grade+unit name filter)
  void unitSlug;

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-display text-xl text-foreground mb-4">{L("Add File", "إضافة ملف")[lang]}</h3>
        <div className="space-y-4">
          <Row>
            <Field label={L("Title (EN)", "العنوان (إنجليزي)")[lang]} required><input className={inputCls} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} /></Field>
            <Field label={L("Title (AR)", "العنوان (عربي)")[lang]} required><input className={inputCls} dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} /></Field>
          </Row>
          <Field label={L("File Type", "نوع الملف")[lang]}>
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="pdf">PDF</option>
              <option value="ppt">PowerPoint</option>
              <option value="worksheet">Worksheet</option>
              <option value="image">Image</option>
              <option value="word">Word Document</option>
            </select>
          </Field>
          <Field label={L("File", "الملف")[lang]} required>
            <input type="file" onChange={onFile} className={inputCls} />
            {uploaded && <div className="text-xs text-primary mt-1">✓ {uploaded.name} ({uploaded.size})</div>}
          </Field>
          <Field label={L("Short Description", "وصف مختصر")[lang]}>
            <textarea className={inputCls} rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </Field>
          <PublishBar pub={pub} setPub={setPub} onSave={submit} saving={saving} lang={lang} />
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="font-display text-xl text-foreground">{L("Files", "الملفات")[lang]}</h3>
        {files.length === 0 ? <Empty lang={lang} kind="files" /> : files.map((f) => (
          <div key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex-1 min-w-0">
              <a href={f.fileUrl} target="_blank" rel="noreferrer" className="font-semibold text-foreground hover:text-primary">{f.title[lang] || f.fileName}</a>
              <div className="text-xs text-muted-foreground">{f.type.toUpperCase()} · {f.size} · {f.fileName}</div>
            </div>
            <ItemActions published={f.published} onToggle={() => void togglePub(f.id, !f.published)} onDelete={() => void onDelete(f.id)} />
          </div>
        ))}
      </div>
      {/* gradeSlug used implicitly via filtered files */}
    </div>
  );
}

// ============== Videos ==============
function VideosTab({
  gradeSlug, unitSlug, unitName, lang, videos, onRefresh,
}: {
  gradeSlug: string; unitSlug: string; unitName: Bi; lang: "en" | "ar";
  videos: ReturnType<typeof useCMS>["videos"]; onRefresh: () => Promise<void>;
}) {
  const [titleEn, setTitleEn] = useState(""); const [titleAr, setTitleAr] = useState("");
  const [descEn, setDescEn] = useState(""); const [descAr, setDescAr] = useState("");
  const [yt, setYt] = useState("");
  const [thumb, setThumb] = useState("");
  const [pub, setPub] = useState(true);
  const [saving, setSaving] = useState(false);

  const onThumb = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const up = await uploadToStorage(f, "videos");
      setThumb(up.url);
      toast.success(L("Thumbnail uploaded", "تم رفع الصورة")[lang]);
    } catch (err) { toast.error(formatError(err)); }
  };
  const onYtFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const up = await uploadToStorage(f, "videos/files");
      setYt(up.url); // store direct URL in same field
      toast.success(L("Video uploaded", "تم رفع الفيديو")[lang]);
    } catch (err) { toast.error(formatError(err)); }
  };
  const submit = async () => {
    if (!titleEn.trim() && !titleAr.trim()) { toast.error(L("Title required", "العنوان مطلوب")[lang]); return; }
    if (!yt) { toast.error(L("YouTube link or video upload required", "رابط يوتيوب أو رفع فيديو مطلوب")[lang]); return; }
    setSaving(true);
    try {
      const payload = {
        title: { en: titleEn, ar: titleAr },
        description: { en: descEn, ar: descAr },
        grade: gradeSlug,
        unit: unitName,
        youtube_url: yt,
        thumbnail_url: thumb || null,
        published: pub,
      };
      const { error } = await supabase.from("videos").insert(payload as never);
      if (error) throw error;
      toast.success(L("Video saved!", "تم حفظ الفيديو!")[lang]);
      setTitleEn(""); setTitleAr(""); setDescEn(""); setDescAr(""); setYt(""); setThumb("");
      await onRefresh();
    } catch (e) { toast.error(`Save failed: ${formatError(e)}`); }
    finally { setSaving(false); }
  };
  const onDelete = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    try {
      const { error } = await supabase.from("videos").delete().eq("id", id);
      if (error) throw error;
      toast.success(L("Deleted", "تم الحذف")[lang]);
      await onRefresh();
    } catch (e) { toast.error(`Delete failed: ${formatError(e)}`); }
  };
  const togglePub = async (id: string, next: boolean) => {
    try {
      const { error } = await supabase.from("videos").update({ published: next } as never).eq("id", id);
      if (error) throw error;
      await onRefresh();
    } catch (e) { toast.error(`Update failed: ${formatError(e)}`); }
  };

  void unitSlug;

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-display text-xl text-foreground mb-4">{L("Add Video", "إضافة فيديو")[lang]}</h3>
        <div className="space-y-4">
          <Row>
            <Field label={L("Title (EN)", "العنوان (إنجليزي)")[lang]} required><input className={inputCls} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} /></Field>
            <Field label={L("Title (AR)", "العنوان (عربي)")[lang]} required><input className={inputCls} dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} /></Field>
          </Row>
          <Row>
            <Field label={L("Description (EN)", "الوصف (إنجليزي)")[lang]}><textarea className={inputCls} rows={3} value={descEn} onChange={(e) => setDescEn(e.target.value)} /></Field>
            <Field label={L("Description (AR)", "الوصف (عربي)")[lang]}><textarea className={inputCls} dir="rtl" rows={3} value={descAr} onChange={(e) => setDescAr(e.target.value)} /></Field>
          </Row>
          <Field label={L("YouTube Link", "رابط يوتيوب")[lang]}>
            <input className={inputCls} placeholder="https://www.youtube.com/watch?v=..." value={yt} onChange={(e) => setYt(e.target.value)} />
          </Field>
          <Field label={L("…or upload a video file", "…أو ارفع ملف فيديو")[lang]}>
            <input type="file" accept="video/*" onChange={onYtFile} className={inputCls} />
          </Field>
          <Field label={L("Thumbnail", "الصورة المصغرة")[lang]}>
            <input type="file" accept="image/*" onChange={onThumb} className={inputCls} />
            {thumb && <img src={thumb} alt="" className="mt-2 max-h-32 rounded-lg border border-border" />}
          </Field>
          <PublishBar pub={pub} setPub={setPub} onSave={submit} saving={saving} lang={lang} />
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="font-display text-xl text-foreground">{L("Videos", "الفيديوهات")[lang]}</h3>
        {videos.length === 0 ? <Empty lang={lang} kind="videos" /> : videos.map((v) => {
          const id = ytId(v.youtubeUrl);
          return (
            <div key={v.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground">{v.title[lang]}</div>
                <div className="text-xs text-muted-foreground break-all">
                  {id ? `YouTube: ${id}` : v.youtubeUrl}
                </div>
              </div>
              <ItemActions published={v.published} onToggle={() => void togglePub(v.id, !v.published)} onDelete={() => void onDelete(v.id)} />
            </div>
          );
        })}
      </div>
      {/* gradeSlug used implicitly via filtered videos */}
    </div>
  );
}

// ============== Quizzes ==============
function QuizzesTab({
  gradeSlug, unitSlug, unitName, lang, quizzes, loading, onRefresh,
}: {
  gradeSlug: string; unitSlug: string; unitName: Bi; lang: "en" | "ar";
  quizzes: UnitQuiz[]; loading: boolean; onRefresh: () => Promise<void>;
}) {
  const [titleEn, setTitleEn] = useState(""); const [titleAr, setTitleAr] = useState("");
  const [qs, setQs] = useState<QuizQuestion[]>([{ ...emptyQ, options: emptyQ.options.map((o) => ({ ...o })) }]);
  const [pub, setPub] = useState(true);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!titleEn.trim() && !titleAr.trim()) { toast.error(L("Title required", "العنوان مطلوب")[lang]); return; }
    setSaving(true);
    try {
      const payload = {
        grade: gradeSlug,
        unit_slug: unitSlug,
        unit: unitName,
        title: { en: titleEn, ar: titleAr },
        questions: qs.filter((q) => q.q.en || q.q.ar),
        published: pub,
      };
      const { error } = await supabase.from("unit_quizzes" as never).insert(payload as never);
      if (error) throw error;
      toast.success(L("Quiz saved!", "تم حفظ الاختبار!")[lang]);
      setTitleEn(""); setTitleAr("");
      setQs([{ ...emptyQ, options: emptyQ.options.map((o) => ({ ...o })) }]);
      await onRefresh();
    } catch (e) { toast.error(`Save failed: ${formatError(e)}`); }
    finally { setSaving(false); }
  };
  const onDelete = async (id: string) => {
    if (!confirm("Delete this quiz?")) return;
    try {
      const { error } = await supabase.from("unit_quizzes" as never).delete().eq("id", id);
      if (error) throw error;
      toast.success(L("Deleted", "تم الحذف")[lang]);
      await onRefresh();
    } catch (e) { toast.error(`Delete failed: ${formatError(e)}`); }
  };
  const togglePub = async (id: string, next: boolean) => {
    try {
      const { error } = await supabase.from("unit_quizzes" as never).update({ published: next } as never).eq("id", id);
      if (error) throw error;
      await onRefresh();
    } catch (e) { toast.error(`Update failed: ${formatError(e)}`); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-display text-xl text-foreground mb-4">{L("Add Quiz", "إضافة اختبار")[lang]}</h3>
        <div className="space-y-4">
          <Row>
            <Field label={L("Quiz Title (EN)", "عنوان الاختبار (إنجليزي)")[lang]} required><input className={inputCls} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} /></Field>
            <Field label={L("Quiz Title (AR)", "عنوان الاختبار (عربي)")[lang]} required><input className={inputCls} dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} /></Field>
          </Row>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-display text-lg text-foreground">{L("Questions", "الأسئلة")[lang]}</h4>
              <button type="button" onClick={() => setQs((q) => [...q, { ...emptyQ, options: emptyQ.options.map((o) => ({ ...o })) }])}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary">
                <Plus className="h-3.5 w-3.5" /> {L("Add Question", "إضافة سؤال")[lang]}
              </button>
            </div>
            <div className="space-y-4">
              {qs.map((q, i) => (
                <div key={i} className="rounded-lg border border-border p-3 bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs uppercase tracking-wider text-primary font-semibold">Q{i + 1}</div>
                    <button type="button" onClick={() => setQs((qq) => qq.filter((_, j) => j !== i))} className="text-destructive hover:text-destructive/70"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <Row>
                    <input className={inputCls} placeholder="Question (EN)" value={q.q.en}
                      onChange={(e) => setQs((qq) => qq.map((x, j) => j === i ? { ...x, q: { ...x.q, en: e.target.value } } : x))} />
                    <input className={inputCls} dir="rtl" placeholder="السؤال (عربي)" value={q.q.ar}
                      onChange={(e) => setQs((qq) => qq.map((x, j) => j === i ? { ...x, q: { ...x.q, ar: e.target.value } } : x))} />
                  </Row>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2 mt-2">
                      <input type="radio" name={`uq-ans-${i}`} checked={q.answer === oi}
                        onChange={() => setQs((qq) => qq.map((x, j) => j === i ? { ...x, answer: oi } : x))} className="accent-primary" />
                      <input className={`${inputCls} flex-1`} placeholder={`Option ${oi + 1} (EN)`} value={opt.en}
                        onChange={(e) => setQs((qq) => qq.map((x, j) => j === i ? { ...x, options: x.options.map((o, k) => k === oi ? { ...o, en: e.target.value } : o) } : x))} />
                      <input className={`${inputCls} flex-1`} dir="rtl" placeholder={`خيار ${oi + 1}`} value={opt.ar}
                        onChange={(e) => setQs((qq) => qq.map((x, j) => j === i ? { ...x, options: x.options.map((o, k) => k === oi ? { ...o, ar: e.target.value } : o) } : x))} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <PublishBar pub={pub} setPub={setPub} onSave={submit} saving={saving} lang={lang} />
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="font-display text-xl text-foreground">{L("Quizzes", "الاختبارات")[lang]}</h3>
        {loading ? (
          <div className="text-sm text-muted-foreground">{L("Loading…", "جارٍ التحميل…")[lang]}</div>
        ) : quizzes.length === 0 ? (
          <Empty lang={lang} kind="quizzes" />
        ) : (
          quizzes.map((q) => (
            <div key={q.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground">{q.title[lang]}</div>
                <div className="text-xs text-muted-foreground">
                  {(q.questions ?? []).length} {L("questions", "أسئلة")[lang]}
                </div>
              </div>
              <ItemActions published={q.published} onToggle={() => void togglePub(q.id, !q.published)} onDelete={() => void onDelete(q.id)} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
