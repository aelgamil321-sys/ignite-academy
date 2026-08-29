import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AskMrAhmed } from "@/components/ask-mr-ahmed";
import { useI18n } from "@/lib/i18n";
import { getAccountRole, getPostAuthPath, postAuthPathForRole } from "@/lib/account-role";
import { fetchTeacherRequestForUser } from "@/lib/teacher-requests";
import { toast } from "sonner";
import {
  ArrowLeft,
  GraduationCap,
  LogIn,
  UserPlus,
  AlertCircle,
  Users,
  CheckCircle,
  School,
  Shield,
} from "lucide-react";
import { grades } from "@/lib/curriculum";
import { StudentAcademicFields } from "@/components/student-academic-fields";
import { ProfilePhotoField } from "@/components/profile-photo-field";
import { PreferredLanguageField } from "@/components/preferred-language-field";
import { uploadProfilePhoto } from "@/lib/profile-photo";
import type { IslamicGroup, StudentSection } from "@/lib/student-academics";
import {
  clearAuthCallbackUrl,
  isEmailNotConfirmedError,
  isEmailRateLimitError,
  parseEmailConfirmedParam,
  parseSupabaseAuthHashError,
  signupAuthOptions,
  waitForSupabaseHashSession,
} from "@/lib/auth-redirect";
import { ENABLE_EMAIL_VERIFICATION, shouldRequireEmailConfirmation } from "@/lib/auth-config";
import { EmailVerificationRequired } from "@/components/email-verification-required";
import { isEmailVerified } from "@/lib/email-verification";
import { applyLanguageForUser, persistLanguage, resolveGuestLanguage } from "@/lib/preferred-language";
import { isLang, type Lang } from "@/lib/i18n-config";
import { pageHeadTitle } from "@/lib/page-head";
import { ensureSessionPersisted } from "@/lib/supabase-auth-storage";
import {
  hasSignupAuthHash,
  isPasswordRecoveryPending,
  isRecoveryAuthHash,
  markPasswordRecoveryPending,
  requestPasswordResetEmail,
  shouldDeferToPasswordReset,
} from "@/lib/password-recovery";

type AuthSearchMode = "landing" | "login" | "signup";
type AuthStep = "landing" | "role-chooser" | "admin-notice" | "form";

type AuthSearch = {
  mode: AuthSearchMode;
  accountType?: "student" | "parent" | "teacher" | "admin";
  email_confirmed: ReturnType<typeof parseEmailConfirmedParam>;
};

function parseAuthSearch(s: Record<string, unknown>): AuthSearch {
  const rawAccountType = s.accountType ?? s.role ?? s.type;
  const rawType = typeof rawAccountType === "string" ? rawAccountType.trim() : "";
  const mode: AuthSearchMode =
    s.mode === "signup" ? "signup" : s.mode === "login" ? "login" : "landing";
  const accountType =
    rawType === "parent" || rawType === "teacher" || rawType === "student" || rawType === "admin"
      ? rawType
      : undefined;
  return {
    mode,
    ...(accountType ? { accountType } : {}),
    email_confirmed: parseEmailConfirmedParam(s.email_confirmed),
  };
}

function resolveAuthStep(search: AuthSearch): AuthStep {
  if (search.mode === "landing") return "landing";
  if (search.mode === "login") return "form";
  if (search.accountType === "admin") return "admin-notice";
  if (search.mode === "signup" && !search.accountType) return "role-chooser";
  return "form";
}

export const Route = createFileRoute("/auth")({
  validateSearch: parseAuthSearch,
  head: () => ({
    meta: [
      { title: pageHeadTitle("auth") },
      { name: "description", content: "Sign in or create an account to access Ignite Islamic Academy." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const authStep = resolveAuthStep(search);
  const formMode: "login" | "signup" = search.mode === "signup" ? "signup" : "login";
  const { accountType: searchAccountType, email_confirmed: emailConfirmedSearch } = search;
  const { lang, bi, tr, dir } = useI18n();
  const [accountType, setAccountType] = useState<"student" | "parent" | "teacher">(
    searchAccountType === "parent" || searchAccountType === "teacher"
      ? searchAccountType
      : "student",
  );
  const [arabicName, setArabicName] = useState("");
  const [englishName, setEnglishName] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [parentFullName, setParentFullName] = useState("");
  const [parentLinkCode, setParentLinkCode] = useState("");
  const [teacherFullName, setTeacherFullName] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState(grades.find((g) => g.slug === "8")?.slug ?? grades[0]?.slug ?? "");
  const [section, setSection] = useState<StudentSection | "">("");
  const [islamicGroup, setIslamicGroup] = useState<IslamicGroup | "">("");
  const [preferredLanguage, setPreferredLanguage] = useState<Lang>(() => resolveGuestLanguage());
  const [busy, setBusy] = useState(false);
  const [signupAlert, setSignupAlert] = useState<string | null>(null);
  const [signupSuccessAlert, setSignupSuccessAlert] = useState<string | null>(null);
  const [emailConfirmedAlert, setEmailConfirmedAlert] = useState<string | null>(null);
  const [emailNotConfirmedAlert, setEmailNotConfirmedAlert] = useState<string | null>(null);
  const [invalidLinkAlert, setInvalidLinkAlert] = useState<string | null>(null);
  const [teacherPendingAlert, setTeacherPendingAlert] = useState<string | null>(null);
  const [teacherRejectedAlert, setTeacherRejectedAlert] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const authInitDone = useRef(false);
  const signupInFlight = useRef(false);
  const signUpCallCount = useRef(0);

  useEffect(() => {
    if (
      searchAccountType === "student" ||
      searchAccountType === "parent" ||
      searchAccountType === "teacher"
    ) {
      setAccountType(searchAccountType);
    }
  }, [searchAccountType]);

  function goAuthLanding() {
    void navigate({ to: "/auth", search: {}, replace: true });
  }

  function goLogin() {
    void navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  function goRoleChooser() {
    void navigate({ to: "/auth", search: { mode: "signup" }, replace: true });
  }

  function goSignupRole(role: "student" | "parent" | "teacher") {
    void navigate({ to: "/auth", search: { mode: "signup", accountType: role }, replace: true });
  }

  function goAdminNotice() {
    void navigate({ to: "/auth", search: { mode: "signup", accountType: "admin" }, replace: true });
  }

  // Run once on mount: handle email-confirmation callback OR redirect already-signed-in users.
  useEffect(() => {
    if (authInitDone.current) return;
    authInitDone.current = true;

    let cancelled = false;

    void (async () => {
      if (isRecoveryAuthHash()) {
        markPasswordRecoveryPending();
        window.location.replace(`/reset-password${window.location.hash}`);
        return;
      }
      if (isPasswordRecoveryPending()) {
        window.location.replace("/reset-password");
        return;
      }

      if (!ENABLE_EMAIL_VERIFICATION) {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;

        const user = data.session?.user;
        if (!user) return;

        if (shouldDeferToPasswordReset()) {
          window.location.replace("/reset-password");
          return;
        }

        const role = await getAccountRole(user.id);
        if (cancelled) return;
        if (searchAccountType === "parent" && role === "student") return;
        if (searchAccountType === "student" && role === "parent") return;
        if (searchAccountType === "teacher" && role && role !== "teacher") return;
        if (role === "teacher") {
          await applyLanguageForUser(user.id);
          if (cancelled) return;
          window.location.replace(postAuthPathForRole("teacher"));
          return;
        }
        const teacherRequest = await fetchTeacherRequestForUser(user.id);
        if (cancelled) return;
        if (teacherRequest?.status === "pending") return;
        await applyLanguageForUser(user.id);
        if (cancelled) return;
        window.location.replace(postAuthPathForRole(role));
        return;
      }

      const hashError = parseSupabaseAuthHashError();
      if (hashError) {
        await supabase.auth.signOut();
        if (cancelled) return;
        setInvalidLinkAlert(tr("auth_verification_link_invalid"));
        goLogin();
        clearAuthCallbackUrl();
        return;
      }

      const confirmedParam = emailConfirmedSearch;
      const hashPresent = hasSignupAuthHash();

      if (confirmedParam === false) {
        await waitForSupabaseHashSession();
        await supabase.auth.signOut();
        if (cancelled) return;
        setInvalidLinkAlert(tr("auth_verification_link_invalid"));
        goLogin();
        clearAuthCallbackUrl();
        return;
      }

      if (confirmedParam === true || hashPresent) {
        await waitForSupabaseHashSession();
        const { data: hashSession } = await supabase.auth.getSession();
        if (cancelled) return;
        if (hashSession.session?.user && !isEmailVerified(hashSession.session.user)) {
          await supabase.auth.signOut();
          setInvalidLinkAlert(tr("auth_verification_link_invalid"));
          goLogin();
          clearAuthCallbackUrl();
          return;
        }
        await supabase.auth.signOut();
        if (cancelled) return;
        setEmailConfirmedAlert(tr("auth_email_confirmed"));
        goLogin();
        clearAuthCallbackUrl();
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (shouldDeferToPasswordReset()) {
        window.location.replace("/reset-password");
        return;
      }

      const user = data.session?.user;
      if (user && shouldRequireEmailConfirmation(user)) {
        await supabase.auth.signOut();
        return;
      }

      if (!user?.email_confirmed_at) return;

      const role = await getAccountRole(user.id);
      if (cancelled) return;
      if (searchAccountType === "parent" && role === "student") return;
      if (searchAccountType === "student" && role === "parent") return;
      if (searchAccountType === "teacher" && role && role !== "teacher") return;
      if (role === "teacher") {
        await applyLanguageForUser(user.id);
        if (cancelled) return;
        const teacherRedirect = postAuthPathForRole("teacher");
        window.location.replace(teacherRedirect);
        return;
      }
      const teacherRequest = await fetchTeacherRequestForUser(user.id);
      if (cancelled) return;
      if (teacherRequest?.status === "pending") return;
      await applyLanguageForUser(user.id);
      if (cancelled) return;
      window.location.replace(postAuthPathForRole(role));
    })();

    return () => {
      cancelled = true;
    };
  }, [emailConfirmedSearch, searchAccountType, tr]);

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error(tr("auth_forgot_email_required"));
      return;
    }
    setBusy(true);
    try {
      await requestPasswordResetEmail(trimmed);
      setForgotSent(true);
      toast.success(tr("auth_reset_email_sent"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

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

  async function ensureSignupSession(
    submitEmail: string,
    submitPassword: string,
    signUpResult: Awaited<ReturnType<typeof supabase.auth.signUp>>,
  ) {
    if (signUpResult.data.session) return signUpResult.data.session;
    if (ENABLE_EMAIL_VERIFICATION) return null;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: submitEmail,
      password: submitPassword,
    });
    if (error) {
      console.warn("[auth signup] auto sign-in after signup failed", error);
      return null;
    }
    return data.session;
  }

  async function finishSignupAndRedirect(userId: string) {
    await applyLanguageForUser(userId);
    const redirectPath = await getPostAuthPath(userId);
    window.location.assign(redirectPath);
  }

  async function completeSignupAfterRegister(
    userId: string,
    session: Awaited<ReturnType<typeof ensureSignupSession>>,
    account: "student" | "parent" | "teacher",
    afterSession?: () => Promise<void>,
  ) {
    if (session) {
      if (afterSession) await afterSession();
      if (account === "teacher") {
        toast.success(tr("auth_success_teacher_pending"));
        await supabase.auth.signOut();
        setSignupSuccessAlert(tr("auth_success_teacher_pending"));
        goLogin();
        return;
      }
      toast.success(tr("auth_success_login"));
      await finishSignupAndRedirect(userId);
      return;
    }

    await supabase.auth.signOut();

    if (ENABLE_EMAIL_VERIFICATION) {
      setSignupSuccessAlert(
        account === "parent"
          ? tr("auth_success_parent")
          : account === "teacher"
            ? tr("auth_success_teacher_pending")
            : tr("auth_success_student"),
      );
    } else {
      setSignupSuccessAlert(
        account === "teacher" ? tr("auth_success_teacher_pending") : tr("auth_signup_complete"),
      );
    }
    goLogin();
  }

  async function callSignUpOnce(
    label: "student" | "parent" | "teacher",
    params: Parameters<typeof supabase.auth.signUp>[0],
  ) {
    signUpCallCount.current += 1;
    const callId = signUpCallCount.current;
    console.debug(`[auth signup] auth.signUp call #${callId} START (${label})`, {
      email: params.email,
      emailRedirectTo: params.options?.emailRedirectTo ?? null,
      emailVerificationEnabled: ENABLE_EMAIL_VERIFICATION,
      totalCallsThisPage: callId,
    });
    const result = await supabase.auth.signUp(params);
    console.debug(`[auth signup] auth.signUp call #${callId} END (${label})`, {
      error: result.error?.message ?? null,
      userId: result.data.user?.id ?? null,
      hasSession: Boolean(result.data.session),
      emailConfirmed: Boolean(result.data.user?.email_confirmed_at),
      totalCallsThisPage: callId,
    });
    return result;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const isSignup = formMode === "signup";

    if (busy || (isSignup && signupInFlight.current)) {
      console.warn("[auth signup] submit blocked — request already in progress", {
        busy,
        signupInFlight: signupInFlight.current,
      });
      return;
    }

    if (isSignup) {
      signupInFlight.current = true;
      console.debug("[auth signup] submit handler entered", {
        accountType,
        signUpCallsSoFar: signUpCallCount.current,
      });
    }

    setBusy(true);
    setSignupAlert(null);
    setSignupSuccessAlert(null);
    setEmailConfirmedAlert(null);
    setEmailNotConfirmedAlert(null);
    setInvalidLinkAlert(null);
    setTeacherPendingAlert(null);
    setTeacherRejectedAlert(null);
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
      const submitPreferredLanguage = String(fd.get("preferred_language") ?? preferredLanguage).trim();

      if (formMode === "signup") {
        if (!isLang(submitPreferredLanguage)) {
          showSignupError(tr("auth_preferred_language_hint"), { step: "validation" });
          return;
        }
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

          const { data, error } = await callSignUpOnce("student", {
            email: submitEmail,
            password: submitPassword,
            options: signupAuthOptions({
              full_name: submitEnglishName,
              arabic_name: submitArabicName,
              english_name: submitEnglishName,
              role_intent: "student",
              grade: submitGrade,
              section: submitSection,
              islamic_group: submitIslamicGroup,
              preferred_language: submitPreferredLanguage,
            }),
          });
          if (error) {
            console.error("[auth signup] supabase signUp error", error);
            throw error;
          }
          if (!data.user) {
            showSignupError(tr("auth_err_email_password"), { step: "no_user" });
            return;
          }

          const session = await ensureSignupSession(submitEmail, submitPassword, { data, error });

          await completeSignupAfterRegister(data.user.id, session, "student", async () => {
            if (profilePhotoFile && session) {
              try {
                await uploadProfilePhoto(data.user!.id, profilePhotoFile);
                console.debug("[auth signup] profile photo uploaded during signup session");
              } catch (photoErr) {
                console.error("[auth signup] profile photo upload failed", photoErr);
              }
            }
          });
          return;
        }

        if (accountType === "teacher") {
          const submitTeacherFullName = String(fd.get("teacher_full_name") ?? teacherFullName).trim();
          const submitTeacherPhone = String(fd.get("teacher_phone") ?? teacherPhone).trim();
          const submitConfirmPassword = String(fd.get("confirm_password") ?? confirmPassword);

          if (!submitTeacherFullName) {
            showSignupError(tr("auth_err_teacher_name"), { step: "validation" });
            return;
          }
          if (!submitEmail || !submitPassword) {
            showSignupError(tr("auth_err_email_password"), { step: "validation" });
            return;
          }
          if (!submitConfirmPassword) {
            showSignupError(tr("auth_err_confirm_password"), { step: "validation" });
            return;
          }
          if (submitPassword !== submitConfirmPassword) {
            showSignupError(tr("auth_err_password_mismatch"), { step: "validation" });
            return;
          }
          if (submitPassword.length < 8) {
            showSignupError(tr("auth_err_password_length"), { step: "validation" });
            return;
          }

          const { data, error } = await callSignUpOnce("teacher", {
            email: submitEmail,
            password: submitPassword,
            options: signupAuthOptions({
              full_name: submitTeacherFullName,
              role_intent: "teacher",
              phone: submitTeacherPhone || undefined,
              preferred_language: submitPreferredLanguage,
            }),
          });
          if (error) {
            console.error("[auth signup] supabase signUp error (teacher)", error);
            throw error;
          }
          if (!data.user) {
            showSignupError(tr("auth_err_email_password"), { step: "no_user" });
            return;
          }

          const session = await ensureSignupSession(submitEmail, submitPassword, { data, error });
          persistLanguage(submitPreferredLanguage);
          await completeSignupAfterRegister(data.user.id, session, "teacher");
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

        const { data, error } = await callSignUpOnce("parent", {
          email: submitEmail,
          password: submitPassword,
          options: signupAuthOptions({
            full_name: submitParentFullName,
            role_intent: "parent",
            parent_link_code: submitParentLinkCode,
            preferred_language: submitPreferredLanguage,
          }),
        });
        if (error) {
          console.error("[auth signup] supabase signUp error (parent)", error);
          throw error;
        }
        if (!data.user) {
          showSignupError(tr("auth_err_email_password"), { step: "no_user" });
          return;
        }

        const session = await ensureSignupSession(submitEmail, submitPassword, { data, error });

        if (data.user) {
          const { error: profileError } = await supabase.from("parent_profiles").upsert(
            {
              user_id: data.user.id,
              full_name: submitParentFullName,
              email: submitEmail,
              student_name: "",
              student_grade: "",
              preferred_language: submitPreferredLanguage,
            },
            { onConflict: "user_id" },
          );
          if (profileError) {
            console.error("[auth signup] parent_profiles upsert error", profileError);
          }
        }

        await completeSignupAfterRegister(data.user.id, session, "parent");
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
        if (ENABLE_EMAIL_VERIFICATION && isEmailNotConfirmedError(error)) {
          setEmailNotConfirmedAlert(tr("auth_email_not_confirmed"));
          await supabase.auth.signOut();
          return;
        }
        throw error;
      }

      if (shouldRequireEmailConfirmation(loginData.user)) {
        setEmailNotConfirmedAlert(tr("auth_email_not_confirmed"));
        await supabase.auth.signOut();
        return;
      }

      toast.success(tr("auth_success_login"));
      await applyLanguageForUser(loginData.user.id);

      await ensureSessionPersisted(loginData.session);

      const role = await getAccountRole(loginData.user.id);
      const redirectPath =
        role === "teacher" ? postAuthPathForRole("teacher") : await getPostAuthPath(loginData.user.id);

      if (role === "teacher") {
        window.location.assign(postAuthPathForRole("teacher"));
        return;
      }

      const teacherRequest = await fetchTeacherRequestForUser(loginData.user.id);
      if (teacherRequest?.status === "pending") {
        setTeacherPendingAlert(tr("auth_teacher_pending_login"));
        await supabase.auth.signOut();
        return;
      }
      if (teacherRequest?.status === "rejected") {
        setTeacherRejectedAlert(tr("auth_teacher_rejected_login"));
        await supabase.auth.signOut();
        return;
      }

      window.location.assign(redirectPath);
    } catch (err) {
      if (formMode === "signup" && isEmailRateLimitError(err)) {
        showSignupError(tr("auth_err_rate_limit"), err);
        return;
      }
      if (formMode === "signup" && isDuplicateEmailError(err)) {
        showSignupError(tr("auth_duplicate_email"), err);
        return;
      }
      if (formMode === "login" && ENABLE_EMAIL_VERIFICATION && isEmailNotConfirmedError(err)) {
        setEmailNotConfirmedAlert(tr("auth_email_not_confirmed"));
        await supabase.auth.signOut();
        return;
      }
      if (formMode === "signup") {
        const message = err instanceof Error ? err.message : String(err);
        showSignupError(message, err);
        return;
      }
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      signupInFlight.current = false;
    }
  }


  function signupHeading() {
    if (accountType === "parent") return tr("auth_create_parent");
    if (accountType === "teacher") return tr("auth_create_teacher");
    return tr("auth_create_student");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="container-page py-10 md:py-14">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 items-start">
        {/* Form card */}
        <div className="rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
          {authStep === "landing" ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl text-foreground">{tr("auth_welcome")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{tr("auth_gateway_lead")}</p>
              </div>
              <div className="grid gap-3 pt-1">
                <button
                  type="button"
                  onClick={goLogin}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  <LogIn className="h-4 w-4" />
                  {tr("auth_login")}
                </button>
                <button
                  type="button"
                  onClick={goRoleChooser}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <UserPlus className="h-4 w-4" />
                  {tr("auth_create_account")}
                </button>
              </div>
            </div>
          ) : authStep === "role-chooser" ? (
            <div className="space-y-5">
              <button
                type="button"
                onClick={goAuthLanding}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <ArrowLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
                {tr("auth_back_to_auth_choice")}
              </button>
              <div>
                <h2 className="font-display text-xl text-foreground">{tr("auth_create_account")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{tr("auth_choose_account_type_lead")}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => goSignupRole("student")}
                  className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-start transition-colors hover:border-primary hover:bg-primary/10"
                >
                  <GraduationCap className="h-6 w-6 text-primary" />
                  <div className="mt-3 font-display text-lg font-semibold text-foreground">{tr("auth_role_student")}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{tr("auth_role_student_desc")}</p>
                </button>
                <button
                  type="button"
                  onClick={() => goSignupRole("teacher")}
                  className="rounded-2xl border border-border bg-background p-4 text-start transition-colors hover:border-primary hover:bg-muted/30"
                >
                  <School className="h-6 w-6 text-primary" />
                  <div className="mt-3 font-display text-lg font-semibold text-foreground">{tr("auth_role_teacher")}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{tr("auth_role_teacher_desc")}</p>
                </button>
                <button
                  type="button"
                  onClick={() => goSignupRole("parent")}
                  className="rounded-2xl border border-border bg-background p-4 text-start transition-colors hover:border-primary hover:bg-muted/30"
                >
                  <Users className="h-6 w-6 text-primary" />
                  <div className="mt-3 font-display text-lg font-semibold text-foreground">{tr("auth_role_parent")}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{tr("auth_role_parent_desc")}</p>
                </button>
                <button
                  type="button"
                  onClick={goAdminNotice}
                  className="rounded-2xl border border-gold/40 bg-gold/5 p-4 text-start transition-colors hover:border-gold hover:bg-gold/10"
                >
                  <Shield className="h-6 w-6 text-gold" />
                  <div className="mt-3 font-display text-lg font-semibold text-foreground">{tr("auth_role_admin")}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{tr("auth_role_admin_desc")}</p>
                </button>
              </div>
            </div>
          ) : authStep === "admin-notice" ? (
            <div className="space-y-5">
              <button
                type="button"
                onClick={goRoleChooser}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <ArrowLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
                {tr("auth_back_to_role_chooser")}
              </button>
              <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5">
                <div className="flex gap-3">
                  <Shield className="h-6 w-6 shrink-0 text-gold" aria-hidden />
                  <div className="space-y-3">
                    <h2 className="font-display text-lg font-semibold text-foreground">{tr("auth_role_admin")}</h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {tr("auth_admin_requires_authorization")}
                    </p>
                    <Link
                      to="/admin-login"
                      className="inline-flex rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      {tr("auth_admin_sign_in_link")}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
          <button
            type="button"
            onClick={() => {
              if (formMode === "signup") goRoleChooser();
              else goAuthLanding();
            }}
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
            {formMode === "signup" ? tr("auth_back_to_role_chooser") : tr("auth_back_to_auth_choice")}
          </button>

          <div className="mb-5">
            <h2 className="font-display text-xl text-foreground">
              {formMode === "login" ? tr("auth_login") : signupHeading()}
            </h2>
          </div>

          <div className="mb-6 inline-flex rounded-full border border-border p-1">
            <button
              type="button"
              onClick={() => {
                goRoleChooser();
                setSignupAlert(null);
                setSignupSuccessAlert(null);
              }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${formMode === "signup" ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}
            >
              <UserPlus className="h-4 w-4" />{" "}
              {formMode === "login"
                ? tr("auth_create_account")
                : accountType === "parent"
                  ? tr("auth_create_parent")
                  : accountType === "teacher"
                    ? tr("auth_create_teacher")
                    : tr("auth_create_student")}
            </button>
            <button
              type="button"
              onClick={() => {
                goLogin();
                setSignupAlert(null);
                setSignupSuccessAlert(null);
              }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${formMode === "login" ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}
            >
              <LogIn className="h-4 w-4" /> {tr("auth_login")}
            </button>
          </div>

          {teacherPendingAlert && formMode === "login" && (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-foreground"
            >
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                <p className="font-medium leading-relaxed">{teacherPendingAlert}</p>
              </div>
            </div>
          )}

          {teacherRejectedAlert && formMode === "login" && (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm text-destructive"
            >
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
                <p className="font-medium leading-relaxed">{teacherRejectedAlert}</p>
              </div>
            </div>
          )}

          {ENABLE_EMAIL_VERIFICATION && invalidLinkAlert && formMode === "login" && (
            <div className="mb-4 space-y-3">
              <div
                role="alert"
                className="rounded-2xl border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm text-destructive"
              >
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
                  <p className="font-medium leading-relaxed">{invalidLinkAlert}</p>
                </div>
              </div>
              {email.trim() ? <EmailVerificationRequired email={email} variant="auth" /> : null}
            </div>
          )}

          {ENABLE_EMAIL_VERIFICATION && emailNotConfirmedAlert && formMode === "login" && (
            <div className="mb-4 space-y-3">
              <div
                role="alert"
                className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-foreground"
              >
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                  <p className="font-medium leading-relaxed">{emailNotConfirmedAlert}</p>
                </div>
              </div>
              {email.trim() ? <EmailVerificationRequired email={email} variant="auth" /> : null}
            </div>
          )}

          {ENABLE_EMAIL_VERIFICATION && emailConfirmedAlert && formMode === "login" && (
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

          {signupAlert && formMode === "signup" && (
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
                    onClick={() => { goLogin(); setSignupAlert(null); }}
                    className="inline-flex rounded-full border border-destructive/40 bg-background px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    {tr("auth_login")}
                  </button>
                </div>
              </div>
            </div>
          )}

          <form
            noValidate
            onSubmit={(e) => {
              if (forgotMode) void handleForgotPassword(e);
              else void handleSubmit(e);
            }}
            className={`space-y-4${busy ? " pointer-events-none" : ""}`}
          >
            {forgotMode ? (
              <>
                <p className="text-sm text-muted-foreground">{tr("auth_forgot_password_lead")}</p>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{tr("auth_email")}</label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={255}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>
                {forgotSent ? (
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">{tr("auth_reset_email_sent")}</p>
                ) : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-60"
                >
                  {busy ? tr("auth_submitting") : tr("auth_send_reset_link")}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(false);
                      setForgotSent(false);
                    }}
                    className="text-xs text-muted-foreground underline hover:text-primary"
                  >
                    {tr("auth_to_login")}
                  </button>
                </div>
              </>
            ) : null}
            {!forgotMode && formMode === "signup" && accountType === "student" && (
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
                  file={profilePhotoFile}
                  onChange={setProfilePhotoFile}
                />
              </>
            )}
            {!forgotMode && formMode === "signup" && accountType === "parent" && (
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
            {!forgotMode && formMode === "signup" && accountType === "teacher" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{tr("auth_teacher_full_name")} *</label>
                  <input
                    type="text"
                    name="teacher_full_name"
                    autoComplete="name"
                    value={teacherFullName}
                    onChange={(e) => setTeacherFullName(e.target.value)}
                    maxLength={100}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{tr("auth_teacher_phone")}</label>
                  <input
                    type="tel"
                    name="teacher_phone"
                    autoComplete="tel"
                    value={teacherPhone}
                    onChange={(e) => setTeacherPhone(e.target.value)}
                    maxLength={30}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>
              </>
            )}
            {!forgotMode && formMode === "signup" && (
              <PreferredLanguageField
                value={preferredLanguage}
                onChange={setPreferredLanguage}
                required
              />
            )}
            {!forgotMode ? (
              <>
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
                autoComplete={formMode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
              {formMode === "login" ? (
                <div className="mt-2 text-end">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setForgotSent(false);
                      setSignupAlert(null);
                    }}
                    className="text-xs text-primary underline hover:text-primary-hover"
                  >
                    {tr("auth_forgot_password")}
                  </button>
                </div>
              ) : null}
            </div>
            {formMode === "signup" && accountType === "teacher" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">{tr("auth_confirm_password")} *</label>
                <input
                  type="password"
                  name="confirm_password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy
                ? tr("auth_submitting")
                : formMode === "signup"
                  ? accountType === "parent"
                    ? tr("auth_create_parent")
                    : accountType === "teacher"
                      ? tr("auth_create_teacher")
                      : tr("auth_submit_signup")
                  : tr("auth_submit_login")}
            </button>
              </>
            ) : null}
          </form>

          {!forgotMode ? (
          <div className="mt-5 text-center text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => {
                if (formMode === "login") goRoleChooser();
                else goLogin();
                setSignupAlert(null);
                setSignupSuccessAlert(null);
              }}
              className="underline hover:text-primary"
            >
              {formMode === "login" ? tr("auth_to_signup") : tr("auth_to_login")}
            </button>
          </div>
          ) : null}
            </>
          )}
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
        </section>
      </main>
      <SiteFooter />
      <AskMrAhmed />
    </div>
  );
}
