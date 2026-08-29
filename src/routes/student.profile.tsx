import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { ParentLinkCodeCard } from "@/components/parent-link-code-card";
import { ProfilePhotoField } from "@/components/profile-photo-field";
import { StudentAcademicFields } from "@/components/student-academic-fields";
import { PreferredLanguageField } from "@/components/preferred-language-field";
import { StudentDashboardSection } from "@/components/student-dashboard-section";
import { StudentProfileIdentityCard } from "@/components/student-profile-identity-card";
import { StudentProfileProgressSummary } from "@/components/student-profile-progress-summary";
import { useI18n } from "@/lib/i18n";
import { fetchMyParentLinkCode } from "@/lib/parent-link-code";
import { supabase } from "@/integrations/supabase/client";
import { uploadProfilePhoto } from "@/lib/profile-photo";
import { gradeDisplayName } from "@/lib/grade-utils";
import {
  fetchStudentProfile,
  saveStudentProfile,
  type StudentProfileForm,
} from "@/lib/student-profile";
import { fetchStudentProgress, type StudentProgressData } from "@/lib/student-progress";
import { useStudentShell } from "@/lib/student-shell-context";
import type { IslamicGroup, StudentSection } from "@/lib/student-academics";
import type { Lang } from "@/lib/i18n-config";

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

const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none";

function StudentProfilePage() {
  const navigate = useNavigate();
  const { userId } = useStudentShell();
  const { lang, dir, tr, setLang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState("");
  const [profilePhotoPath, setProfilePhotoPath] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState<StudentProfileForm>({
    full_name: "",
    arabic_name: "",
    english_name: "",
    section: null,
    islamic_group: null,
  });
  const [section, setSection] = useState<StudentSection | "">("");
  const [islamicGroup, setIslamicGroup] = useState<IslamicGroup | "">("");
  const [preferredLanguage, setPreferredLanguage] = useState<Lang>("ar");
  const [parentLinkCode, setParentLinkCode] = useState<string | null>(null);
  const [progress, setProgress] = useState<StudentProgressData | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;
        if (!user) {
          navigate({ to: "/auth", search: { mode: "login" } });
          return;
        }

        const [profile, progressResult, linkCode] = await Promise.all([
          fetchStudentProfile(user.id),
          fetchStudentProgress(user.id),
          fetchMyParentLinkCode(),
        ]);
        const meta = user.user_metadata ?? {};

        if (!active) return;

        setEmail(profile?.email || user.email || "");
        setGrade(profile?.grade ?? String(meta.grade ?? ""));
        setProfilePhotoPath(profile?.profile_photo_path ?? null);
        setForm({
          full_name:
            profile?.full_name?.trim() ||
            profile?.english_name?.trim() ||
            (typeof meta.full_name === "string" ? meta.full_name.trim() : ""),
          arabic_name:
            profile?.arabic_name?.trim() ||
            (typeof meta.arabic_name === "string" ? meta.arabic_name.trim() : ""),
          english_name:
            profile?.english_name?.trim() ||
            (typeof meta.english_name === "string" ? meta.english_name.trim() : ""),
          section: profile?.section ?? null,
          islamic_group: profile?.islamic_group ?? null,
        });
        setSection(profile?.section ?? "");
        setIslamicGroup(profile?.islamic_group ?? "");
        setPreferredLanguage(profile?.preferred_language ?? lang);
        setParentLinkCode(linkCode);
        if (!progressResult.error) setProgress(progressResult.data);
      } catch (error) {
        console.error("[student profile load]", error);
        toast.error(error instanceof Error ? error.message : String(error));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [lang, navigate, userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.english_name.trim()) {
      toast.error(tr("auth_err_english_name"));
      return;
    }
    if (!form.arabic_name.trim()) {
      toast.error(tr("auth_err_arabic_name"));
      return;
    }

    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) throw new Error(tr("auth_err_email_password"));

      if (photoFile) {
        const path = await uploadProfilePhoto(user.id, photoFile);
        setProfilePhotoPath(path);
        setPhotoFile(null);
      }

      const updated = await saveStudentProfile(user.id, email, {
        ...form,
        full_name: form.english_name.trim(),
        section: section || null,
        islamic_group: islamicGroup || null,
        preferred_language: preferredLanguage,
      });
      setForm({
        full_name: updated.full_name,
        arabic_name: updated.arabic_name,
        english_name: updated.english_name,
        section: updated.section,
        islamic_group: updated.islamic_group,
      });
      setSection(updated.section ?? "");
      setIslamicGroup(updated.islamic_group ?? "");
      setPreferredLanguage(updated.preferred_language);
      setProfilePhotoPath(updated.profile_photo_path);
      setGrade(updated.grade ?? grade);
      setLang(updated.preferred_language);
      toast.success(tr("student_profile_updated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  const gradeLabel = grade ? gradeDisplayName(grade, lang) : tr("not_set");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          to="/student"
          className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
          {tr("student_back_dashboard")}
        </Link>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          {tr("profile_student")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{tr("student_profile_lead")}</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          {tr("loading")}
        </div>
      ) : (
        <>
          <StudentProfileIdentityCard
            profilePhotoPath={profilePhotoPath}
            arabicName={form.arabic_name}
            englishName={form.english_name}
            email={email}
            grade={grade}
            section={section}
            islamicGroup={islamicGroup}
          />

          {progress ? <StudentProfileProgressSummary progress={progress} /> : null}

          <StudentDashboardSection title={tr("student_profile_personal_details")} lead={tr("student_cert_note")}>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    {tr("auth_english_name_hint")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.english_name}
                    onChange={(e) => setForm((f) => ({ ...f, english_name: e.target.value }))}
                    maxLength={100}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    {tr("auth_arabic_name_hint")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.arabic_name}
                    onChange={(e) => setForm((f) => ({ ...f, arabic_name: e.target.value }))}
                    maxLength={100}
                    dir="rtl"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">{tr("auth_email")}</label>
                <input
                  type="email"
                  readOnly
                  value={email}
                  className={`${inputClass} cursor-not-allowed bg-muted/40 text-muted-foreground`}
                />
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/15 px-3 py-3">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {tr("auth_grade")}
                </p>
                <p className="text-sm font-semibold text-foreground">{gradeLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">{tr("student_profile_grade_readonly")}</p>
              </div>

              <PreferredLanguageField value={preferredLanguage} onChange={setPreferredLanguage} />

              <ProfilePhotoField file={photoFile} onChange={setPhotoFile} />

              <StudentAcademicFields
                section={section}
                islamicGroup={islamicGroup}
                onSectionChange={setSection}
                onIslamicGroupChange={setIslamicGroup}
              />

              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60 sm:w-auto sm:min-w-[12rem]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {tr("student_saving")}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {tr("save_changes")}
                  </>
                )}
              </button>
            </form>
          </StudentDashboardSection>

          {parentLinkCode ? <ParentLinkCodeCard code={parentLinkCode} /> : null}
        </>
      )}
    </div>
  );
}
