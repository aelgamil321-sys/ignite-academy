import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { getAccountRole, getPostAuthPath, postAuthPathForRole } from "@/lib/account-role";
import { parseAuthAccountType } from "@/lib/parent-corner-access";
import { redeemParentLinkCode } from "@/lib/parent-link-code";
import { toast } from "sonner";
import { GraduationCap, LogIn, UserPlus, AlertCircle, Users, CheckCircle } from "lucide-react";
import { grades } from "@/lib/curriculum";
import { StudentAcademicFields } from "@/components/student-academic-fields";
import { ProfilePhotoField } from "@/components/profile-photo-field";
import { uploadProfilePhoto } from "@/lib/profile-photo";
import type { IslamicGroup, StudentSection } from "@/lib/student-academics";
import {
  SIGNUP_EMAIL_REDIRECT_URL,
  clearAuthCallbackUrl,
  hasSupabaseAuthHash,
  isEmailNotConfirmedError,
  parseEmailConfirmedParam,
  waitForSupabaseHashSession,
} from "@/lib/auth-redirect";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s.mode === "signup" ? "signup" : "login",
    accountType: parseAuthAccountType(s),
    email_confirmed: parseEmailConfirmedParam(s.email_confirmed),
  }),
  head: () => ({
    meta: [
      { title: "Student Sign In — Ignite Islamic Academy" },
      { name: "description", content: "Sign in or create a student account to access lessons, videos, quizzes and progress tracking." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode, accountType: initialAccountType, email_confirmed: emailConfirmedSearch } =
    Route.useSearch();
  const { lang, bi, tr } = useI18n();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [accountType, setAccountType] = useState<"student" | "parent">(initialAccountType);
  const [arabicName, setArabicName] = useState("");
  const [englishName, setEnglishName] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [parentFullName, setParentFullName] = useState("");
  const [parentLinkCode, setParentLinkCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState(grades.find((g) => g.slug === "8")?.slug ?? grades[0]?.slug ?? "");
  const [section, setSection] = useState<StudentSection | "">("");
  const [islamicGroup, setIslamicGroup] = useState<IslamicGroup | "">("");
  const [busy, setBusy] = useState(false);
  const [signupAlert, setSignupAlert] = useState<string | null>(null);
  const [signupSuccessAlert, setSignupSuccessAlert] = useState<string | null>(null);
  const [emailConfirmedAlert, setEmailConfirmedAlert] = useState<string | null>(null);
  const [emailNotConfirmedAlert, setEmailNotConfirmedAlert] = useState<string | null>(null);
  const authInitDone = useRef(false);

  useEffect(() => { setMode(initialMode); }, [initialMode]);
  useEffect(() => { setAccountType(initialAccountType); }, [initialAccountType]);

  // Run once on mount: handle email-confirmation callback OR redirect already-signed-in users.
  useEffect(() => {
    if (authInitDone.current) return;
    authInitDone.current = true;

    let cancelled = false;

    void (async () => {
      const confirmedParam = emailConfirmedSearch;
      const hashPresent = hasSupabaseAuthHash();

      if (confirmedParam === false) {
        await waitForSupabaseHashSession();
        await supabase.auth.signOut();
        if (cancelled) return;
        setEmailNotConfirmedAlert(tr("auth_email_not_confirmed"));
        setMode("login");
        clearAuthCallbackUrl();
        return;
      }

      if (confirmedParam === true || hashPresent) {
        await waitForSupabaseHashSession();
        await supabase.auth.signOut();
        if (cancelled) return;
        setEmailConfirmedAlert(tr("auth_email_confirmed"));
        setMode("login");
        clearAuthCallbackUrl();
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      const user = data.session?.user;
      if (user && !user.email_confirmed_at) {
        await supabase.auth.signOut();
        return;
      }

      if (!user?.email_confirmed_at) return;

      const role = await getAccountRole(user.id);
      if (cancelled) return;
      if (initialAccountType === "parent" && role === "student") return;
      if (initialAccountType === "student" && role === "parent") return;
      window.location.replace(postAuthPathForRole(role));
    })();

    return () => {
      cancelled = true;
    };
  }, [emailConfirmedSearch, initialAccountType, tr]);

  function isDuplicateEmailError(err: unknown): boolean {
    if (err && typeof err === "object" && "code" in err) {
      return (err as { code?: string }).code === "user_already_exists";
    }
    if (err instanceof Error) {
      return err.message.toLowerCase().includes("already registered");
    }
    return false;
  }

  function showSignupError(message: string, debug?: unknown) {
    setSignupAlert(message);
    console.error("[auth signup]", message, debug ?? "");
  }

  function validateStudentSignupFields(fields: {
    arabicName: string;
    englishName: string;
    grade: string;
    section: string;
    islamicGroup: string;
    email: string;
    password: string;
    photo: File | null;
  }): string | null {
    if (!fields.arabicName) return tr("auth_err_arabic_name");
    if (!fields.englishName) return tr("auth_err_english_name");
    if (!fields.grade) return tr("auth_err_grade");
    if (!fields.section) return tr("auth_err_section");
    if (!fields.islamicGroup) return tr("auth_err_islamic_group");
    if (!fields.photo) return tr("auth_err_photo");
    if (!fields.email || !fields.password) return tr("auth_err_email_password");
    if (fields.password.length < 8) return tr("auth_err_password_length");
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setSignupAlert(null);
    setSignupSuccessAlert(null);
    setEmailConfirmedAlert(null);
    setEmailNotConfirmedAlert(null);
    try {
      const form = e.currentTarget;
      const fd = new FormData(form);
      const submitEmail = String(fd.get("email") ?? email).trim();
      const submitPassword = String(fd.get("password") ?? password);
      const submitArabicName = String(fd.get("arabic_name") ?? arabicName).trim();
      const submitEnglishName = String(fd.get("english_name") ?? englishName).trim();
      const submitGrade = String(fd.get("grade") ?? grade).trim();
      const submitSection = String(fd.get("section") ?? section).trim();
      const submitIslamicGroup = String(fd.get("islamic_group") ?? islamicGroup).trim();

      if (mode === "signup") {
        console.debug("[auth signup] submit started", { accountType });

        if (accountType === "student") {
          const validationError = validateStudentSignupFields({
            arabicName: submitArabicName,
            englishName: submitEnglishName,
            grade: submitGrade,
            section: submitSection,
            islamicGroup: submitIslamicGroup,
            email: submitEmail,
            password: submitPassword,
            photo: profilePhotoFile,
          });
          if (validationError) {
            showSignupError(validationError, { step: "validation" });
            return;
          }

          console.debug("[auth signup] calling supabase.auth.signUp", {
            email: submitEmail,
            emailRedirectTo: SIGNUP_EMAIL_REDIRECT_URL,
          });

          const { data, error } = await supabase.auth.signUp({
            email: submitEmail,
            password: submitPassword,
            options: {
              emailRedirectTo: SIGNUP_EMAIL_REDIRECT_URL,
              data: {
                full_name: submitEnglishName,
                arabic_name: submitArabicName,
                english_name: submitEnglishName,
                role_intent: "student",
                grade: submitGrade,
                section: submitSection,
                islamic_group: submitIslamicGroup,
              },
            },
          });
          if (error) {
            console.error("[auth signup] supabase signUp error", error);
            throw error;
          }

          console.debug("[auth signup] signUp response", {
            userId: data.user?.id,
            hasSession: Boolean(data.session),
            emailConfirmed: Boolean(data.user?.email_confirmed_at),
          });

          if (data.session && data.user?.email_confirmed_at) {
            await uploadProfilePhoto(data.user.id, profilePhotoFile!);
            toast.success(tr("auth_welcome"));
            window.location.assign("/student");
            return;
          }

          if (data.session && !data.user?.email_confirmed_at) {
            await supabase.auth.signOut();
          }

          setSignupSuccessAlert(tr("auth_success_student"));
          return;
        }

        const submitParentFullName = String(fd.get("parent_full_name") ?? parentFullName).trim();
        const submitParentLinkCode = String(fd.get("parent_link_code") ?? parentLinkCode).trim();

        if (!submitParentFullName) {
          showSignupError(tr("auth_err_parent_name"), { step: "validation" });
          return;
        }
        if (!submitParentLinkCode) {
          showSignupError(tr("auth_err_link_code"), { step: "validation" });
          return;
        }
        if (!submitEmail || !submitPassword) {
          showSignupError(tr("auth_err_email_password"), { step: "validation" });
          return;
        }
        if (submitPassword.length < 8) {
          showSignupError(tr("auth_err_password_length"), { step: "validation" });
          return;
        }

        console.debug("[auth signup] calling supabase.auth.signUp (parent)", {
          email: submitEmail,
          emailRedirectTo: SIGNUP_EMAIL_REDIRECT_URL,
        });

        const { data, error } = await supabase.auth.signUp({
          email: submitEmail,
          password: submitPassword,
          options: {
            emailRedirectTo: SIGNUP_EMAIL_REDIRECT_URL,
            data: {
              full_name: submitParentFullName,
              role_intent: "parent",
              parent_link_code: submitParentLinkCode,
            },
          },
        });
        if (error) {
          console.error("[auth signup] supabase signUp error (parent)", error);
          throw error;
        }

        if (data.user) {
          const { error: profileError } = await supabase.from("parent_profiles").upsert(
            {
              user_id: data.user.id,
              full_name: submitParentFullName,
              email: submitEmail,
              student_name: "",
              student_grade: "",
            },
            { onConflict: "user_id" },
          );
          if (profileError) {
            console.error("[auth signup] parent_profiles upsert error", profileError);
          }
        }

        const completeParentSignup = async () => {
          const redeem = await redeemParentLinkCode(submitParentLinkCode);
          if (!redeem.ok) {
            toast.error(tr("auth_invalid_link_code"));
          } else if (redeem.alreadyLinked) {
            toast.success(tr("auth_already_linked"));
          } else {
            toast.success(tr("auth_linked_success"));
          }
          await supabase.auth.updateUser({ data: { parent_link_code: null } });
          window.location.assign("/parent/dashboard");
        };

        if (data.session && data.user?.email_confirmed_at) {
          toast.success(tr("auth_welcome"));
          await completeParentSignup();
          return;
        }

        if (data.session && !data.user?.email_confirmed_at) {
          await supabase.auth.signOut();
        }

        setSignupSuccessAlert(tr("auth_success_parent"));
        return;
      }

      if (!submitEmail || !submitPassword) {
        toast.error(tr("auth_err_email_password"));
        return;
      }

      const { data: loginData, error } = await supabase.auth.signInWithPassword({
        email: submitEmail,
        password: submitPassword,
      });
      if (error) {
        if (isEmailNotConfirmedError(error)) {
          setEmailNotConfirmedAlert(tr("auth_email_not_confirmed"));
          await supabase.auth.signOut();
          return;
        }
        throw error;
      }

      if (!loginData.user?.email_confirmed_at) {
        setEmailNotConfirmedAlert(tr("auth_email_not_confirmed"));
        await supabase.auth.signOut();
        return;
      }

      toast.success(tr("auth_success_login"));
      const redirectPath = await getPostAuthPath(loginData.user.id);
      window.location.assign(redirectPath);
    } catch (err) {
      if (mode === "signup" && isDuplicateEmailError(err)) {
        showSignupError(tr("auth_duplicate_email"), err);
        return;
      }
      if (mode === "login" && isEmailNotConfirmedError(err)) {
        setEmailNotConfirmedAlert(tr("auth_email_not_confirmed"));
        await supabase.auth.signOut();
        return;
      }
      if (mode === "signup") {
        const message = err instanceof Error ? err.message : String(err);
        showSignupError(message, err);
        return;
      }
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }


  return (
    <PageShell
      eyebrow={tr("student_title")}
      title={tr("auth_title")}
      lead={tr("auth_lead")}
      crumbs={[{ label: tr("auth_title") }]}
    >
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 items-start">
        {/* Form card */}
        <div className="rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
          <div className="inline-flex rounded-full border border-border p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode("signup"); setSignupAlert(null); setSignupSuccessAlert(null); }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}
            >
              <UserPlus className="h-4 w-4" /> {accountType === "parent" ? tr("auth_create_parent") : tr("auth_create_student")}
            </button>
            <button
              type="button"
              onClick={() => { setMode("login"); setSignupAlert(null); setSignupSuccessAlert(null); }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${mode === "login" ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}
            >
              <LogIn className="h-4 w-4" /> {tr("auth_login")}
            </button>
          </div>

          {emailNotConfirmedAlert && mode === "login" && (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-foreground"
            >
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                <p className="font-medium leading-relaxed">{emailNotConfirmedAlert}</p>
              </div>
            </div>
          )}

          {emailConfirmedAlert && mode === "login" && (
            <div
              role="status"
              className="mb-4 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4 text-sm text-foreground"
            >
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <p className="font-medium leading-relaxed">{emailConfirmedAlert}</p>
              </div>
            </div>
          )}

          {signupSuccessAlert && (
            <div
              role="status"
              className="mb-4 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4 text-sm text-foreground"
            >
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <p className="font-medium leading-relaxed">{signupSuccessAlert}</p>
              </div>
            </div>
          )}

          {signupAlert && mode === "signup" && (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-destructive/50 bg-destructive/10 px-5 py-4 text-sm text-destructive"
            >
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
                <div className="space-y-3">
                  <p className="font-medium leading-relaxed">{signupAlert}</p>
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setSignupAlert(null); }}
                    className="inline-flex rounded-full border border-destructive/40 bg-background px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    {tr("auth_login")}
                  </button>
                </div>
              </div>
            </div>
          )}

          <form noValidate onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">{tr("auth_account_type")}</label>
                <div className="mt-2 inline-flex w-full rounded-full border border-border p-1">
                  <button
                    type="button"
                    onClick={() => setAccountType("student")}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${accountType === "student" ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}
                  >
                    <GraduationCap className="h-4 w-4" /> {tr("auth_student_account")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType("parent")}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${accountType === "parent" ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}
                  >
                    <Users className="h-4 w-4" /> {tr("auth_parent_account")}
                  </button>
                </div>
              </div>
            )}
            {mode === "signup" && accountType === "student" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{tr("auth_arabic_name_hint")} *</label>
                  <input
                    type="text"
                    name="arabic_name"
                    autoComplete="additional-name"
                    value={arabicName}
                    onChange={(e) => setArabicName(e.target.value)}
                    maxLength={100}
                    dir="rtl"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{tr("auth_english_name_hint")} *</label>
                  <input
                    type="text"
                    name="english_name"
                    autoComplete="name"
                    value={englishName}
                    onChange={(e) => setEnglishName(e.target.value)}
                    maxLength={100}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{tr("auth_grade")}</label>
                  <select
                    name="grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    {grades.map((g) => (
                      <option key={g.slug} value={g.slug}>{bi(g.name)}</option>
                    ))}
                  </select>
                </div>
                <StudentAcademicFields
                  lang={lang}
                  section={section}
                  islamicGroup={islamicGroup}
                  onSectionChange={setSection}
                  onIslamicGroupChange={setIslamicGroup}
                />
                <ProfilePhotoField
                  lang={lang}
                  file={profilePhotoFile}
                  onChange={setProfilePhotoFile}
                />
              </>
            )}
            {mode === "signup" && accountType === "parent" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{tr("auth_parent_full_name")}</label>
                  <input
                    type="text"
                    name="parent_full_name"
                    autoComplete="name"
                    value={parentFullName}
                    onChange={(e) => setParentFullName(e.target.value)}
                    maxLength={100}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{tr("auth_parent_link_code")}</label>
                  <input
                    type="text"
                    name="parent_link_code"
                    value={parentLinkCode}
                    onChange={(e) => setParentLinkCode(e.target.value.toUpperCase())}
                    maxLength={20}
                    placeholder="IIA-X7K92A"
                    autoComplete="off"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono tracking-wider uppercase"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{tr("auth_parent_link_code_hint")}</p>
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">{tr("auth_email")}</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setSignupAlert(null); }}
                maxLength={255}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{tr("auth_password")}</label>
              <input
                type="password"
                name="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-60"
            >
              {busy ? "…" : mode === "signup" ? (accountType === "parent" ? tr("auth_create_parent") : tr("auth_submit_signup")) : tr("auth_submit_login")}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setSignupAlert(null);
                setSignupSuccessAlert(null);
              }}
              className="underline hover:text-primary"
            >
              {mode === "login" ? tr("auth_to_signup") : tr("auth_to_login")}
            </button>
          </div>
        </div>

        {/* Side panel */}
        <div className="rounded-3xl bg-gradient-to-br from-brand-dark to-primary text-primary-foreground p-8 shadow-[var(--shadow-elegant)]">
          <GraduationCap className="h-10 w-10 text-gold" />
          <h3 className="mt-4 font-display text-2xl">
            {tr("auth_start_journey")}
          </h3>
          <ul className="mt-5 space-y-3 text-sm opacity-90">
            {tr("auth_hero_bullets").split("|").map((x) => (
              <li key={x} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {x}
              </li>
            ))}
          </ul>
          <Link to="/grades" className="mt-8 inline-flex rounded-full border border-primary-foreground/30 px-5 py-2.5 text-sm font-semibold hover:bg-primary-foreground/10">
            {tr("auth_explore_academy")}
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
