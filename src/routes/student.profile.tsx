import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { ParentLinkCodeCard } from "@/components/parent-link-code-card";
import { ProfilePhotoField } from "@/components/profile-photo-field";
import { StudentAcademicFields } from "@/components/student-academic-fields";
import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import { PreferredLanguageField } from "@/components/preferred-language-field";
import { useI18n } from "@/lib/i18n";
import { fetchMyParentLinkCode } from "@/lib/parent-link-code";
import { supabase } from "@/integrations/supabase/client";
import { gradeDisplayName } from "@/lib/grade-utils";
import { uploadProfilePhoto } from "@/lib/profile-photo";
import {
  fetchStudentProfile,
  saveStudentProfile,
  type StudentProfileForm,
} from "@/lib/student-profile";
import { destinationForAccountRole, getAccountRole } from "@/lib/account-role";
import { islamicGroupLabel, sectionLabel, type IslamicGroup, type StudentSection } from "@/lib/student-academics";
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

function StudentProfilePage() {
  const navigate = useNavigate();
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

      const role = await getAccountRole(user.id);
      if (!active) return;
      if (role !== "student") {
        navigate({ to: destinationForAccountRole(role) });
        return;
      }

      try {
        const profile = await fetchStudentProfile(user.id);
        const meta = user.user_metadata ?? {};

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
        setParentLinkCode(await fetchMyParentLinkCode());
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
    <PageShell
      eyebrow={tr("nav_student")}
      title={tr("profile_student")}
      lead={tr("student_profile_lead")}
      crumbs={[
        { label: tr("nav_student"), to: "/student" },
        { label: tr("profile_student") },
      ]}
    >
      <div className="max-w-2xl">
        <Link
          to="/student"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
          {tr("student_back_dashboard")}
        </Link>

        {parentLinkCode ? <div className="mb-6"><ParentLinkCodeCard code={parentLinkCode} /></div> : null}

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12">
            <Loader2 className="h-5 w-5 animate-spin" />
            {tr("loading")}
          </div>
        ) : (
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-soft)] space-y-5"
          >
            <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-border">
              <StudentProfileAvatar
                profilePhotoPath={profilePhotoPath}
                alt={form.english_name || form.arabic_name}
                className="h-20 w-20"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-display text-xl text-foreground leading-tight">
                  {form.english_name || form.arabic_name}
                </p>
                {form.arabic_name ? (
                  <p className="text-sm text-muted-foreground" dir="rtl">
                    {form.arabic_name}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground pt-1">{tr("student_cert_note")}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-4 grid gap-3 sm:grid-cols-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">{tr("auth_grade")}</div>
                <div className="font-semibold text-foreground mt-0.5">{gradeLabel}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{tr("auth_section")}</div>
                <div className="font-semibold text-foreground mt-0.5">
                  {section ? sectionLabel(section, lang) : tr("not_set")}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  {tr("auth_islamic_group")}
                </div>
                <div className="font-semibold text-foreground mt-0.5">
                  {islamicGroup ? islamicGroupLabel(islamicGroup, lang) : tr("not_set")}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">{tr("auth_english_name_hint")} *</label>
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
              <label className="text-xs font-medium text-muted-foreground">{tr("auth_arabic_name_hint")} *</label>
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
              <label className="text-xs font-medium text-muted-foreground">{tr("auth_email")}</label>
              <input
                type="email"
                readOnly
                value={email}
                className="mt-1 w-full rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
              />
            </div>

            <PreferredLanguageField
              value={preferredLanguage}
              onChange={setPreferredLanguage}
            />

            <ProfilePhotoField
              file={photoFile}
              onChange={setPhotoFile}
            />

            <StudentAcademicFields
              section={section}
              islamicGroup={islamicGroup}
              onSectionChange={setSection}
              onIslamicGroupChange={setIslamicGroup}
            />

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-60"
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
        )}
      </div>
    </PageShell>
  );
}
