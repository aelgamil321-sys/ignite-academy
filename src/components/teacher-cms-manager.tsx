import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useCMS,
  type CustomArticle,
  type CustomFile,
  type CustomVideo,
  type ArticleCategory,
} from "@/lib/cms";
import { grades, type Bi } from "@/lib/curriculum";
import { SUBJECT_CATEGORIES, type SubjectCategory } from "@/lib/categories";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import { fetchTeacherContext, assignmentScopeOptionsForGrade, type TeacherContext } from "@/lib/teacher-dashboard";
import { useI18n, L } from "@/lib/i18n";
import { uploadToStorage, formatError } from "@/lib/upload";
import type { FileType } from "@/lib/cms";
import { AnnouncementTargetingFields } from "@/components/announcement-targeting-fields";
import {
  TEACHER_ANNOUNCEMENT_AUDIENCES,
  type AnnouncementAudience,
} from "@/lib/announcement-audience";
import type { AnnouncementTopic } from "@/lib/announcement-topics";
import { STUDENT_SECTIONS, type StudentSection } from "@/lib/student-academics";

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-destructive ms-1">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function CmsItemRow({
  children,
  published,
  onPublish,
  onDelete,
  viewSlug,
}: {
  children: React.ReactNode;
  published: boolean;
  onPublish: () => void;
  onDelete: () => void;
  viewSlug?: string;
}) {
  const { tr } = useI18n();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex-1 min-w-0">{children}</div>
      {viewSlug ? (
        <Link
          to="/teacher/announcements/$slug"
          params={{ slug: viewSlug }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
        >
          <Eye className="h-3.5 w-3.5" />
          {tr("admin_content_view_announcement")}
        </Link>
      ) : null}
      <button
        type="button"
        onClick={onPublish}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
          published ? "border-primary text-primary" : "border-border text-muted-foreground"
        }`}
      >
        {published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        {published ? tr("teacher_published") : tr("teacher_draft")}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {tr("teacher_delete")}
      </button>
    </div>
  );
}

function useTeacherGrades() {
  const [assignedGrades, setAssignedGrades] = useState<string[]>([]);
  const [isLeadTeacher, setIsLeadTeacher] = useState(false);
  const [teacherContext, setTeacherContext] = useState<TeacherContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setLoading(false);
        return;
      }
      const ctx = await fetchTeacherContext(data.user.id);
      setAssignedGrades(ctx.assignedGrades);
      setIsLeadTeacher(ctx.isLeadTeacher);
      setTeacherContext(ctx);
      setLoading(false);
    })();
  }, []);

  return { assignedGrades, isLeadTeacher, teacherContext, loading };
}

export function TeacherVideosManager({ mode = "manage" }: { mode?: "new" | "manage" }) {
  const { lang, bi, tr } = useI18n();
  const { videos, addVideo, updateVideo, deleteVideo, refresh } = useCMS();
  const { assignedGrades, loading: scopeLoading } = useTeacherGrades();
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [grade, setGrade] = useState("");
  const [unitEn, setUnitEn] = useState("");
  const [unitAr, setUnitAr] = useState("");
  const [category, setCategory] = useState<SubjectCategory>("quran");
  const [yt, setYt] = useState("");
  const [thumb, setThumb] = useState("");
  const [pub, setPub] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (assignedGrades[0] && !grade) setGrade(assignedGrades[0]);
  }, [assignedGrades, grade]);

  const scopedVideos = useMemo(
    () =>
      videos.filter((v) =>
        assignedGrades.includes(normalizeGradeSlug(v.grade) || v.grade),
      ),
    [videos, assignedGrades],
  );

  const onThumb = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const up = await uploadToStorage(f, "videos");
      setThumb(up.url);
      toast.success(L("Thumbnail uploaded", "تم رفع الصورة")[lang]);
    } catch (err) {
      toast.error(formatError(err));
    }
  };

  const submit = async () => {
    if (!titleEn || !titleAr || !yt || !grade) {
      toast.error(tr("teacher_video_required"));
      return;
    }
    setSaving(true);
    try {
      await addVideo({
        title: { en: titleEn, ar: titleAr },
        description: { en: descEn, ar: descAr },
        grade: normalizeGradeSlug(grade),
        unit: { en: unitEn, ar: unitAr },
        category,
        youtubeUrl: yt,
        thumbnailUrl: thumb,
        published: pub,
      });
      toast.success(tr("teacher_video_saved"));
      if (mode === "new") {
        setTitleEn("");
        setTitleAr("");
        setDescEn("");
        setDescAr("");
        setUnitEn("");
        setUnitAr("");
        setYt("");
        setThumb("");
      }
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setSaving(false);
    }
  };

  if (scopeLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mode === "manage" && (
        <h2 className="font-display text-xl text-foreground">{tr("teacher_nav_manage_videos")}</h2>
      )}
      {mode === "new" && (
        <h2 className="font-display text-xl text-foreground">{tr("teacher_nav_add_video")}</h2>
      )}

      {mode === "new" && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <Row>
            <Field label={L("Title (EN)", "العنوان (إنجليزي)")[lang]} required>
              <input className="input w-full rounded-lg border border-border px-3 py-2" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
            </Field>
            <Field label={L("Title (AR)", "العنوان (عربي)")[lang]} required>
              <input className="input w-full rounded-lg border border-border px-3 py-2" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label={L("Grade", "الصف")[lang]} required>
              <select className="input w-full rounded-lg border border-border px-3 py-2" value={grade} onChange={(e) => setGrade(e.target.value)}>
                {assignedGrades.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field label={L("Library Category", "تصنيف المكتبة")[lang]}>
              <select className="input w-full rounded-lg border border-border px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value as SubjectCategory)}>
                {SUBJECT_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{bi(c.name)}</option>)}
              </select>
            </Field>
          </Row>
          <Field label={L("YouTube Video Link", "رابط فيديو يوتيوب")[lang]} required>
            <input className="input w-full rounded-lg border border-border px-3 py-2" value={yt} onChange={(e) => setYt(e.target.value)} />
          </Field>
          <Field label={L("Thumbnail Upload", "صورة مصغّرة")[lang]}>
            <input type="file" accept="image/*" onChange={onThumb} className="input w-full" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} />
            {tr("teacher_publish")}
          </label>
          <button type="button" disabled={saving} onClick={() => void submit()} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving ? tr("teacher_loading") : tr("teacher_save")}
          </button>
        </div>
      )}

      {mode === "manage" && scopedVideos.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{tr("teacher_no_videos")}</p>
      ) : mode === "manage" ? (
        <div className="space-y-3">
          {scopedVideos.map((v: CustomVideo) => (
            <CmsItemRow
              key={v.id}
              published={v.published}
              onPublish={() => void updateVideo(v.id, { published: !v.published })}
              onDelete={() => {
                void deleteVideo(v.id).then(() => toast.success(tr("teacher_deleted")));
              }}
            >
              <div className="font-medium">{bi(v.title)}</div>
              <div className="text-xs text-muted-foreground">{v.grade} · {bi(v.unit) || "—"}</div>
            </CmsItemRow>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TeacherResourcesManager({ mode = "manage" }: { mode?: "new" | "manage" }) {
  const { lang, bi, tr } = useI18n();
  const { files, addFile, updateFile, deleteFile, lessons, refresh } = useCMS();
  const { assignedGrades, loading: scopeLoading } = useTeacherGrades();
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [grade, setGrade] = useState("");
  const [unitEn, setUnitEn] = useState("");
  const [unitAr, setUnitAr] = useState("");
  const [lesson, setLesson] = useState("");
  const [type, setType] = useState<FileType>("pdf");
  const [subjectCategory, setSubjectCategory] = useState<SubjectCategory>("quran");
  const [file, setFile] = useState<{ url: string; name: string; size: string } | null>(null);
  const [pub, setPub] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (assignedGrades[0] && !grade) setGrade(assignedGrades[0]);
  }, [assignedGrades, grade]);

  const scopedFiles = useMemo(
    () =>
      files.filter((f) =>
        assignedGrades.includes(normalizeGradeSlug(f.grade) || f.grade),
      ),
    [files, assignedGrades],
  );

  const gradeLessons = lessons
    .filter((l) => assignedGrades.includes(normalizeGradeSlug(l.grade) || l.grade))
    .filter((l) => normalizeGradeSlug(l.grade) === normalizeGradeSlug(grade))
    .map((l) => ({ id: l.id, title: bi(l.title) }));

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const up = await uploadToStorage(f, `files/${type}`);
      setFile({ url: up.url, name: up.name, size: up.size });
      toast.success(L("File uploaded", "تم رفع الملف")[lang]);
    } catch (err) {
      toast.error(formatError(err));
    }
  };

  const submit = async () => {
    if (!titleEn || !titleAr || !file || !grade) {
      toast.error(tr("teacher_file_required"));
      return;
    }
    setSaving(true);
    try {
      await addFile({
        title: { en: titleEn, ar: titleAr },
        grade: normalizeGradeSlug(grade),
        unit: { en: unitEn, ar: unitAr },
        lesson,
        type,
        subjectCategory,
        fileUrl: file.url,
        fileName: file.name,
        size: file.size,
        published: pub,
      });
      toast.success(tr("teacher_file_saved"));
      if (mode === "new") {
        setTitleEn("");
        setTitleAr("");
        setUnitEn("");
        setUnitAr("");
        setLesson("");
        setFile(null);
      }
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setSaving(false);
    }
  };

  if (scopeLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mode === "manage" && (
        <h2 className="font-display text-xl text-foreground">{tr("teacher_nav_manage_resources")}</h2>
      )}
      {mode === "new" && (
        <h2 className="font-display text-xl text-foreground">{tr("teacher_nav_upload_file")}</h2>
      )}

      {mode === "new" && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <Row>
            <Field label={L("Title (EN)", "العنوان (إنجليزي)")[lang]} required>
              <input className="input w-full rounded-lg border border-border px-3 py-2" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
            </Field>
            <Field label={L("Title (AR)", "العنوان (عربي)")[lang]} required>
              <input className="input w-full rounded-lg border border-border px-3 py-2" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label={L("Grade", "الصف")[lang]} required>
              <select className="input w-full rounded-lg border border-border px-3 py-2" value={grade} onChange={(e) => { setGrade(e.target.value); setLesson(""); }}>
                {assignedGrades.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label={L("Lesson", "الدرس")[lang]}>
              <select className="input w-full rounded-lg border border-border px-3 py-2" value={lesson} onChange={(e) => setLesson(e.target.value)}>
                <option value="">{L("— None —", "— لا شيء —")[lang]}</option>
                {gradeLessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </Field>
          </Row>
          <Field label={L("Upload File", "ارفع الملف")[lang]} required>
            <input type="file" onChange={onFile} className="input w-full" />
            {file && <div className="text-xs text-primary mt-1">✓ {file.name}</div>}
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} />
            {tr("teacher_publish")}
          </label>
          <button type="button" disabled={saving} onClick={() => void submit()} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving ? tr("teacher_loading") : tr("teacher_save")}
          </button>
        </div>
      )}

      {mode === "manage" && scopedFiles.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{tr("teacher_no_resources")}</p>
      ) : mode === "manage" ? (
        <div className="space-y-3">
          {scopedFiles.map((f: CustomFile) => (
            <CmsItemRow
              key={f.id}
              published={f.published}
              onPublish={() => void updateFile(f.id, { published: !f.published })}
              onDelete={() => {
                void deleteFile(f.id).then(() => toast.success(tr("teacher_deleted")));
              }}
            >
              <div className="font-medium">{bi(f.title)}</div>
              <div className="text-xs text-muted-foreground">{f.grade} · {f.type.toUpperCase()} · {f.fileName}</div>
            </CmsItemRow>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TeacherArticlesManager({
  categoryFilter,
  titleKey,
  mode = "manage",
  defaultCategory,
}: {
  categoryFilter?: ArticleCategory;
  titleKey: string;
  mode?: "new" | "manage";
  defaultCategory?: ArticleCategory;
}) {
  const { lang, bi, tr } = useI18n();
  const { articles, addArticle, updateArticle, deleteArticle, refresh } = useCMS();
  const { assignedGrades, loading: scopeLoading, teacherContext } = useTeacherGrades();
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [cat, setCat] = useState<ArticleCategory>(defaultCategory ?? categoryFilter ?? "parent");
  const [grade, setGrade] = useState("");
  const [targetSection, setTargetSection] = useState<StudentSection | "">("");
  const [audience, setAudience] = useState<AnnouncementAudience>("students");
  const [announcementTopic, setAnnouncementTopic] = useState<AnnouncementTopic>("school_news");
  const [subjectCategory, setSubjectCategory] = useState<SubjectCategory>("quran");
  const [img, setImg] = useState("");
  const [pub, setPub] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (assignedGrades[0] && !grade) setGrade(assignedGrades[0]);
  }, [assignedGrades, grade]);

  const announcementSectionOptions = useMemo(() => {
    if (!teacherContext || !grade) return undefined;
    const { sections } = assignmentScopeOptionsForGrade(teacherContext, grade);
    const allowAllSections = sections.includes(null);
    const specificSections = sections.filter((section): section is StudentSection => section !== null);
    return {
      allowAllSections,
      sections: allowAllSections ? [...STUDENT_SECTIONS] : specificSections,
    };
  }, [teacherContext, grade]);

  const announcementAudienceOptions = useMemo(() => {
    if (teacherContext?.isLeadTeacher) return undefined;
    return TEACHER_ANNOUNCEMENT_AUDIENCES;
  }, [teacherContext]);

  useEffect(() => {
    if (!announcementAudienceOptions) return;
    if (!announcementAudienceOptions.includes(audience)) {
      setAudience(announcementAudienceOptions[0]);
    }
  }, [announcementAudienceOptions, audience]);

  useEffect(() => {
    if (!targetSection || !announcementSectionOptions) return;
    if (!announcementSectionOptions.sections.includes(targetSection)) {
      setTargetSection("");
    }
  }, [announcementSectionOptions, targetSection]);

  const scopedArticles = useMemo(() => {
    let filtered = articles.filter((a) =>
      assignedGrades.includes(normalizeGradeSlug(a.grade ?? "") || (a.grade ?? "")),
    );
    if (categoryFilter) filtered = filtered.filter((a) => a.category === categoryFilter);
    else filtered = filtered.filter((a) => a.category !== "announcement");
    return filtered;
  }, [articles, assignedGrades, categoryFilter]);

  const onImg = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const up = await uploadToStorage(f, "articles");
      setImg(up.url);
      toast.success(L("Image uploaded", "تم رفع الصورة")[lang]);
    } catch (err) {
      toast.error(formatError(err));
    }
  };

  const isAnnouncementFlow = categoryFilter === "announcement" || cat === "announcement";

  const submit = async () => {
    if (!titleEn || !titleAr || !grade) {
      toast.error(tr("teacher_article_grade_required"));
      return;
    }
    setSaving(true);
    try {
      await addArticle({
        title: { en: titleEn, ar: titleAr },
        content: { en: bodyEn, ar: bodyAr },
        category: cat,
        subjectCategory,
        imageUrl: img,
        grade: normalizeGradeSlug(grade),
        targetSection: isAnnouncementFlow && targetSection ? targetSection : null,
        audience: isAnnouncementFlow ? audience : null,
        announcementTopic: isAnnouncementFlow ? announcementTopic : null,
        published: pub,
      });
      toast.success(tr("teacher_article_saved"));
      if (mode === "new") {
        setTitleEn("");
        setTitleAr("");
        setBodyEn("");
        setBodyAr("");
        setImg("");
      }
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setSaving(false);
    }
  };

  if (scopeLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl text-foreground">{tr(titleKey)}</h2>

      {mode === "new" && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <Row>
            <Field label={L("Title (EN)", "العنوان (إنجليزي)")[lang]} required>
              <input className="input w-full rounded-lg border border-border px-3 py-2" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
            </Field>
            <Field label={L("Title (AR)", "العنوان (عربي)")[lang]} required>
              <input className="input w-full rounded-lg border border-border px-3 py-2" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
            </Field>
          </Row>
          <Row>
            {isAnnouncementFlow ? (
              <AnnouncementTargetingFields
                grade={grade}
                setGrade={setGrade}
                targetSection={targetSection}
                setTargetSection={setTargetSection}
                audience={audience}
                setAudience={setAudience}
                topic={announcementTopic}
                setTopic={setAnnouncementTopic}
                gradeOptions={assignedGrades}
                requireGrade
                sectionOptions={announcementSectionOptions}
                audienceOptions={announcementAudienceOptions}
              />
            ) : (
              <Field label={L("Grade", "الصف")[lang]} required>
                <select className="input w-full rounded-lg border border-border px-3 py-2" value={grade} onChange={(e) => setGrade(e.target.value)}>
                  {assignedGrades.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
            )}
            <Field label={L("Subject Category", "التصنيف")[lang]}>
              <select className="input w-full rounded-lg border border-border px-3 py-2" value={subjectCategory} onChange={(e) => setSubjectCategory(e.target.value as SubjectCategory)}>
                {SUBJECT_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{bi(c.name)}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label={L("Content (EN)", "المحتوى (إنجليزي)")[lang]}>
              <textarea className="input w-full rounded-lg border border-border px-3 py-2" rows={4} value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} />
            </Field>
            <Field label={L("Content (AR)", "المحتوى (عربي)")[lang]}>
              <textarea className="input w-full rounded-lg border border-border px-3 py-2" dir="rtl" rows={4} value={bodyAr} onChange={(e) => setBodyAr(e.target.value)} />
            </Field>
          </Row>
          <Field label={L("Featured Image", "صورة مميزة")[lang]}>
            <input type="file" accept="image/*" onChange={onImg} className="input w-full" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} />
            {tr("teacher_publish")}
          </label>
          <button type="button" disabled={saving} onClick={() => void submit()} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving ? tr("teacher_loading") : tr("teacher_save")}
          </button>
        </div>
      )}

      {mode === "manage" && scopedArticles.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{tr("teacher_no_articles")}</p>
      ) : mode === "manage" ? (
        <div className="space-y-3">
          {scopedArticles.map((a: CustomArticle) => (
            <CmsItemRow
              key={a.id}
              published={a.published}
              viewSlug={
                categoryFilter === "announcement" && a.published ? a.id : undefined
              }
              onPublish={() => void updateArticle(a.id, { published: !a.published })}
              onDelete={() => {
                void deleteArticle(a.id).then(() => toast.success(tr("teacher_deleted")));
              }}
            >
              <div className="font-medium">{bi(a.title)}</div>
              <div className="text-xs text-muted-foreground">{a.grade ?? "—"} · {a.category}</div>
            </CmsItemRow>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TeacherUnitsManager() {
  return <TeacherCurriculumLinks titleKey="teacher_nav_manage_units" />;
}

export function TeacherCurriculumLinks({ titleKey }: { titleKey?: string }) {
  const { bi, tr } = useI18n();
  const { assignedGrades, loading } = useTeacherGrades();
  const { lessons, refresh } = useCMS();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  const gradeRows = grades.filter((g) => assignedGrades.includes(g.slug));

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl text-foreground">
        {titleKey ? tr(titleKey) : tr("teacher_nav_curriculum")}
      </h2>
      <p className="text-sm text-muted-foreground">{tr("teacher_curriculum_desc")}</p>
      {gradeRows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{tr("teacher_no_classes")}</p>
      ) : (
        <div className="space-y-4">
          {gradeRows.map((g) => {
            const customLessons = lessons.filter((l) => normalizeGradeSlug(l.grade) === g.slug);
            const units = new Map<string, Bi>();
            for (const l of g.lessons) units.set(l.unit.en, l.unit);
            for (const l of customLessons) units.set(l.unit.en || l.unit.ar, l.unit);

            return (
              <div key={g.slug} className="rounded-xl border border-border bg-card p-4">
                <h3 className="font-semibold text-foreground mb-2">{bi(g.name)}</h3>
                <ul className="space-y-2 text-sm">
                  {[...units.entries()].map(([slug, unit]) => {
                    const unitSlug = slug
                      .toLowerCase()
                      .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
                      .replace(/^-+|-+$/g, "") || "untitled";
                    return (
                      <li key={unitSlug}>
                        <a
                          href={`/grades/${g.slug}/units/${unitSlug}`}
                          className="text-primary hover:underline"
                        >
                          {bi(unit) || unitSlug}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TeacherQuizCreate() {
  const { bi, tr } = useI18n();
  const { lessons, refresh } = useCMS();
  const { assignedGrades, loading } = useTeacherGrades();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const scopedLessons = lessons.filter((l) =>
    assignedGrades.includes(normalizeGradeSlug(l.grade) || l.grade),
  );
  const withoutQuiz = scopedLessons.filter((l) => l.quiz.length === 0);
  const withQuiz = scopedLessons.filter((l) => l.quiz.length > 0);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl text-foreground">{tr("teacher_nav_add_quiz")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{tr("teacher_add_quiz_desc")}</p>
      </div>

      {scopedLessons.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">{tr("teacher_no_lessons")}</p>
          <a
            href="/teacher/lessons/new"
            className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            {tr("teacher_nav_add_lesson")}
          </a>
        </div>
      ) : (
        <>
          {withoutQuiz.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{tr("teacher_add_quiz_no_quiz")}</h3>
              <ul className="space-y-2">
                {withoutQuiz.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{bi(lesson.title)}</p>
                      <p className="text-xs text-muted-foreground">{lesson.grade}</p>
                    </div>
                    <a
                      href={`/teacher/lessons/edit/${lesson.id}`}
                      className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                    >
                      {tr("teacher_nav_add_quiz")}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {withQuiz.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{tr("teacher_add_quiz_has_quiz")}</h3>
              <ul className="space-y-2">
                {withQuiz.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{bi(lesson.title)}</p>
                      <p className="text-xs text-muted-foreground">
                        {lesson.grade} · {lesson.quiz.length} {tr("teacher_quiz_questions")}
                      </p>
                    </div>
                    <a
                      href={`/teacher/lessons/edit/${lesson.id}`}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
                    >
                      {tr("teacher_edit_quiz")}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export function TeacherQuizzesManage() {
  const { bi, tr } = useI18n();
  const { lessons, refresh } = useCMS();
  const { assignedGrades, loading } = useTeacherGrades();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const scopedLessons = lessons.filter((l) =>
    assignedGrades.includes(normalizeGradeSlug(l.grade) || l.grade),
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl text-foreground">{tr("teacher_nav_manage_quizzes")}</h2>
      <p className="text-sm text-muted-foreground">{tr("teacher_manage_quizzes_desc")}</p>
      {scopedLessons.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{tr("teacher_no_lessons")}</p>
      ) : (
        <ul className="space-y-3">
          {scopedLessons.map((lesson) => (
            <li
              key={lesson.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-medium">{bi(lesson.title)}</p>
                <p className="text-xs text-muted-foreground">
                  {lesson.grade} · {lesson.quiz.length} {tr("teacher_quiz_questions")}
                </p>
              </div>
              <a
                href={`/teacher/lessons/edit/${lesson.id}`}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
              >
                {tr("teacher_edit_quiz")}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
