import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { grades } from "@/lib/curriculum";
import { gradeDisplayName, normalizeGradeSlug } from "@/lib/grade-utils";
import {
  fetchStudentProfile,
  saveStudentProfile,
  type StudentProfileForm,
} from "@/lib/student-profile";
import {
  changeStudentGrade,
  changeStudentLoginEmail,
  validateStudentEmailChangeInput,
  validateStudentGradeChangeInput,
  type StudentEmailChangeErrorKey,
} from "@/lib/student-profile-self-correction";
import { fetchStudentProgress, type StudentProgressData } from "@/lib/student-progress";
import { clearStudentShellCache } from "@/lib/student-workspace-session";
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

function emailChangeErrorMessage(tr: (key: string) => string, errorKey: StudentEmailChangeErrorKey): string {
  switch (errorKey) {
    case "empty":
      return tr("student_profile_email_empty");
    case "invalid_email":
      return tr("auth_err_invalid_email");
    case "same_email":
      return tr("student_profile_email_same");
    case "mismatch":
      return tr("student_profile_email_mismatch");
    case "duplicate_email":
      return tr("auth_duplicate_email");
    case "rate_limit":
      return tr("auth_err_rate_limit");
    case "network":
      return tr("auth_err_network");
    default:
      return tr("student_profile_email_change_failed");
  }
}

function StudentProfilePage() {
  const navigate = useNavigate();
  const { userId } = useStudentShell();
  const { lang, dir, tr, setLang, bi } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const submitInFlightRef = useRef(false);
  const [email, setEmail] = useState("");
  const [originalGrade, setOriginalGrade] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
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

        const resolvedEmail = profile?.email || user.email || "";
        setEmail(resolvedEmail);
        setNewEmail("");
        setConfirmEmail("");
        const resolvedGrade = normalizeGradeSlug(profile?.grade ?? String(meta.grade ?? "")) || "";
        setGrade(resolvedGrade);
        setOriginalGrade(resolvedGrade);
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
    if (submitInFlightRef.current || saving) return;

    if (!form.english_name.trim()) {
      toast.error(tr("auth_err_english_name"));
      return;
    }
    if (!form.arabic_name.trim()) {
      toast.error(tr("auth_err_arabic_name"));
      return;
    }

    const wantsEmailChange = Boolean(newEmail.trim() || confirmEmail.trim());
    const wantsGradeChange =
      Boolean(grade) && normalizeGradeSlug(grade) !== normalizeGradeSlug(originalGrade);

    if (wantsEmailChange) {
      const emailValidation = validateStudentEmailChangeInput(email, newEmail, confirmEmail);
      if (!emailValidation.ok) {
        toast.error(emailChangeErrorMessage(tr, emailValidation.errorKey));
        return;
      }
    }

    if (wantsGradeChange) {
      const gradeValidation = validateStudentGradeChangeInput(originalGrade, grade);
      if (!gradeValidation.ok) {
        toast.error(
          gradeValidation.errorKey === "same_grade"
            ? tr("student_profile_grade_same")
            : tr("student_profile_grade_invalid"),
        );
        return;
      }
    }

    if (wantsEmailChange && !window.confirm(tr("student_profile_email_confirm_dialog"))) {
      return;
    }
    if (wantsGradeChange && !window.confirm(tr("student_profile_grade_confirm_dialog"))) {
      return;
    }

    submitInFlightRef.current = true;
    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) throw new Error(tr("auth_err_email_password"));

      let nextEmail = email;
      if (wantsEmailChange) {
        const emailResult = await changeStudentLoginEmail({
          userId: user.id,
          currentEmail: email,
          newEmail,
          confirmEmail,
        });
        if (!emailResult.ok) {
          toast.error(emailChangeErrorMessage(tr, emailResult.errorKey));
          return;
        }
        nextEmail = emailResult.email;
        setNewEmail("");
        setConfirmEmail("");
      }

      if (photoFile) {
        const path = await uploadProfilePhoto(user.id, photoFile);
        setProfilePhotoPath(path);
        setPhotoFile(null);
      }

      const updated = await saveStudentProfile(user.id, nextEmail, {
        ...form,
        full_name: form.english_name.trim(),
        section: section || null,
        islamic_group: islamicGroup || null,
        preferred_language: preferredLanguage,
      });

      let nextGrade = updated.grade ?? grade;
      if (wantsGradeChange) {
        const gradeResult = await changeStudentGrade({
          userId: user.id,
          currentGrade: originalGrade,
          newGrade: grade,
        });
        if (!gradeResult.ok) {
          toast.error(tr("student_profile_grade_change_failed"));
          return;
        }
        nextGrade = gradeResult.grade;
        setOriginalGrade(nextGrade);
      }

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
      setEmail(nextEmail);
      setGrade(normalizeGradeSlug(nextGrade) || nextGrade);
      setLang(updated.preferred_language);
      clearStudentShellCache();

      const progressResult = await fetchStudentProgress(user.id);
      if (!progressResult.error) setProgress(progressResult.data);

      if (wantsEmailChange) toast.success(tr("student_profile_email_updated"));
      if (wantsGradeChange) toast.success(tr("student_profile_grade_updated"));
      toast.success(tr("student_profile_updated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      submitInFlightRef.current = false;
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

              <div className="space-y-3 rounded-xl border border-border/70 bg-muted/15 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {tr("auth_email")}
                </p>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{tr("auth_email")}</label>
                  <input
                    type="email"
                    readOnly
                    value={email}
                    className={`${inputClass} cursor-not-allowed bg-muted/40 text-muted-foreground`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{tr("student_profile_email_new")}</label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    maxLength={254}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    {tr("student_profile_email_confirm")}
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    maxLength={254}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">{tr("auth_grade")}</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className={inputClass}
                >
                  <option value="">{tr("select_placeholder")}</option>
                  {grades.map((g) => (
                    <option key={g.slug} value={g.slug}>
                      {bi(g.name)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">{gradeLabel}</p>
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
