import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save, User } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { gradeDisplayName } from "@/lib/grade-utils";
import {
  fetchStudentProfile,
  saveStudentProfile,
  type StudentProfileForm,
} from "@/lib/student-profile";

export const Route = createFileRoute("/student/profile")({
  head: () => ({
    meta: [
      { title: "Student Profile — Ignite Islamic Academy" },
      { name: "description", content: "View and update your student profile and certificate names." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: StudentProfilePage,
});

function StudentProfilePage() {
  const navigate = useNavigate();
  const { lang, dir } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState("");
  const [form, setForm] = useState<StudentProfileForm>({
    full_name: "",
    arabic_name: "",
    english_name: "",
  });

  const T = {
    eyebrow: lang === "ar" ? "الطالب" : "Student",
    title: lang === "ar" ? "الملف الشخصي" : "Profile",
    lead:
      lang === "ar"
        ? "عرض وتحديث بياناتك الشخصية وأسماء الشهادة بالعربية والإنجليزية."
        : "View and update your personal details and certificate names in Arabic and English.",
    fullName: lang === "ar" ? "الاسم الكامل" : "Full Name",
    fullNameHint: "Full Name / الاسم الكامل",
    arabicName: lang === "ar" ? "الاسم باللغة العربية" : "Arabic Name",
    arabicNameHint: "Arabic Name / الاسم باللغة العربية",
    englishName: lang === "ar" ? "الاسم باللغة الإنجليزية" : "English Name",
    englishNameHint: "English Name / الاسم باللغة الإنجليزية",
    email: lang === "ar" ? "البريد الإلكتروني" : "Email",
    grade: lang === "ar" ? "الصف الدراسي" : "Grade",
    gradeEmpty: lang === "ar" ? "غير محدد" : "Not set",
    save: lang === "ar" ? "حفظ التغييرات" : "Save changes",
    saving: lang === "ar" ? "جارٍ الحفظ…" : "Saving…",
    saved: lang === "ar" ? "تم تحديث الملف الشخصي" : "Profile updated",
    back: lang === "ar" ? "العودة إلى لوحة الطالب" : "Back to dashboard",
    certNote:
      lang === "ar"
        ? "تُستخدم هذه الأسماء على شهادات الإنجاز."
        : "These names are used on your achievement certificates.",
  };

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!active) return;

      const user = authData.user;
      if (!user) {
        navigate({ to: "/auth", search: { mode: "login" } });
        return;
      }

      try {
        const profile = await fetchStudentProfile(user.id);
        const meta = user.user_metadata ?? {};

        setEmail(profile?.email || user.email || "");
        setGrade(profile?.grade ?? String(meta.grade ?? ""));
        setForm({
          full_name:
            profile?.full_name?.trim() ||
            (typeof meta.full_name === "string" ? meta.full_name.trim() : ""),
          arabic_name:
            profile?.arabic_name?.trim() ||
            (typeof meta.arabic_name === "string" ? meta.arabic_name.trim() : ""),
          english_name:
            profile?.english_name?.trim() ||
            (typeof meta.english_name === "string" ? meta.english_name.trim() : ""),
        });
      } catch (error) {
        console.error("[student profile load]", error);
        toast.error(error instanceof Error ? error.message : String(error));
      } finally {
        if (active) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth", search: { mode: "login" } });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.english_name.trim()) {
      toast.error(lang === "ar" ? "الاسم بالإنجليزية مطلوب" : "English name is required");
      return;
    }
    if (!form.arabic_name.trim()) {
      toast.error(lang === "ar" ? "الاسم بالعربية مطلوب" : "Arabic name is required");
      return;
    }

    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) throw new Error(lang === "ar" ? "يرجى تسجيل الدخول" : "Please sign in");

      const updated = await saveStudentProfile(user.id, email, form);
      setForm({
        full_name: updated.full_name,
        arabic_name: updated.arabic_name,
        english_name: updated.english_name,
      });
      toast.success(T.saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  const gradeLabel = grade ? gradeDisplayName(grade, lang) : T.gradeEmpty;

  return (
    <PageShell
      eyebrow={T.eyebrow}
      title={T.title}
      lead={T.lead}
      crumbs={[
        { label: lang === "ar" ? "الطالب" : "Student", to: "/student" },
        { label: T.title },
      ]}
    >
      <div className="max-w-2xl">
        <Link
          to="/student"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
          {T.back}
        </Link>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12">
            <Loader2 className="h-5 w-5 animate-spin" />
            {lang === "ar" ? "جارٍ التحميل…" : "Loading…"}
          </div>
        ) : (
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-soft)] space-y-5"
          >
            <div className="flex items-center gap-3 pb-2 border-b border-border">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted-foreground">{T.certNote}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">{T.fullNameHint}</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                maxLength={100}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">{T.englishNameHint} *</label>
              <input
                type="text"
                required
                value={form.english_name}
                onChange={(e) => setForm((f) => ({ ...f, english_name: e.target.value }))}
                maxLength={100}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">{T.arabicNameHint} *</label>
              <input
                type="text"
                required
                value={form.arabic_name}
                onChange={(e) => setForm((f) => ({ ...f, arabic_name: e.target.value }))}
                maxLength={100}
                dir="rtl"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">{T.email}</label>
              <input
                type="email"
                readOnly
                value={email}
                className="mt-1 w-full rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">{T.grade}</label>
              <input
                type="text"
                readOnly
                value={gradeLabel}
                className="mt-1 w-full rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {T.saving}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {T.save}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </PageShell>
  );
}
