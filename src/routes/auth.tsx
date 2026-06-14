import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { getAccountRole, getPostAuthPath, postAuthPathForRole } from "@/lib/account-role";
import { parseAuthAccountType } from "@/lib/parent-corner-access";
import { redeemParentLinkCode } from "@/lib/parent-link-code";
import { toast } from "sonner";
import { GraduationCap, LogIn, UserPlus, AlertCircle, Users } from "lucide-react";
import { grades } from "@/lib/curriculum";
import { StudentAcademicFields } from "@/components/student-academic-fields";
import { ProfilePhotoField } from "@/components/profile-photo-field";
import { uploadProfilePhoto } from "@/lib/profile-photo";
import type { IslamicGroup, StudentSection } from "@/lib/student-academics";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s.mode === "signup" ? "signup" : "login",
    accountType: parseAuthAccountType(s),
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
  const { mode: initialMode, accountType: initialAccountType } = Route.useSearch();
  const { lang } = useI18n();
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

  useEffect(() => { setMode(initialMode); }, [initialMode]);
  useEffect(() => { setAccountType(initialAccountType); }, [initialAccountType]);

  function isDuplicateEmailError(err: unknown): boolean {
    if (err && typeof err === "object" && "code" in err) {
      return (err as { code?: string }).code === "user_already_exists";
    }
    if (err instanceof Error) {
      return err.message.toLowerCase().includes("already registered");
    }
    return false;
  }

  // If already signed in, send to the correct dashboard (unless switching account type)
  useEffect(() => {
    let active = true;
    const redirectSignedInUser = async (userId: string) => {
      const role = await getAccountRole(userId);
      if (!active) return;
      if (initialAccountType === "parent" && role === "student") return;
      if (initialAccountType === "student" && role === "parent") return;
      const path = postAuthPathForRole(role);
      window.location.replace(path);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session?.user) void redirectSignedInUser(session.user.id);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session?.user) void redirectSignedInUser(data.session.user.id);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [initialAccountType]);


  const T = {
    title: lang === "ar" ? "حساب الطالب" : "Student Account",
    lead: lang === "ar"
      ? "أنشئ حسابك أو سجّل الدخول للوصول إلى الدروس والاختبارات وتتبع تقدمك."
      : "Create your account or sign in to access your lessons, quizzes, and progress.",
    signup: lang === "ar" ? "إنشاء حساب طالب" : "Create Student Account",
    parentSignup: lang === "ar" ? "إنشاء حساب ولي أمر" : "Create Parent Account",
    login: lang === "ar" ? "تسجيل الدخول" : "Login",
    accountType: lang === "ar" ? "نوع الحساب" : "Account type",
    studentAccount: lang === "ar" ? "حساب طالب" : "Student Account",
    parentAccount: lang === "ar" ? "حساب ولي أمر" : "Parent Account",
    parentFullName: lang === "ar" ? "الاسم الكامل لولي الأمر" : "Parent full name",
    parentLinkCode: lang === "ar" ? "كود الطالب / Student Link Code" : "Student Link Code",
    parentLinkCodeHint: lang === "ar"
      ? "أدخل الكود من لوحة الطالب"
      : "Enter the code from your child's student dashboard",
    arabicName: lang === "ar" ? "اسم الطالب بالعربية" : "Arabic Student Name",
    arabicNameHint: lang === "ar" ? "اسم الطالب بالعربية" : "Arabic Student Name / اسم الطالب بالعربية",
    englishName: lang === "ar" ? "اسم الطالب بالإنجليزية" : "English Student Name",
    englishNameHint: lang === "ar" ? "اسم الطالب بالإنجليزية" : "English Student Name / اسم الطالب بالإنجليزية",
    email: lang === "ar" ? "البريد الإلكتروني" : "Email",
    password: lang === "ar" ? "كلمة المرور" : "Password",
    grade: lang === "ar" ? "الصف الدراسي" : "Grade",
    submitSignup: lang === "ar" ? "إنشاء الحساب" : "Create account",
    submitLogin: lang === "ar" ? "دخول" : "Sign in",
    toLogin: lang === "ar" ? "لديك حساب؟ سجّل الدخول" : "Have an account? Sign in",
    toSignup: lang === "ar" ? "جديد هنا؟ أنشئ حسابًا" : "New here? Create an account",
    welcome: lang === "ar" ? "مرحبًا بك في الأكاديمية" : "Welcome to the Academy",
    duplicateEmail: lang === "ar"
      ? "هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول أو استخدام بريد إلكتروني آخر."
      : "This email is already registered. Please sign in or use a different email.",
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setSignupAlert(null);
    try {
      const fd = new FormData(e.currentTarget);
      const submitEmail = String(fd.get("email") ?? email).trim();
      const submitPassword = String(fd.get("password") ?? password);
      const submitArabicName = String(fd.get("arabic_name") ?? arabicName).trim();
      const submitEnglishName = String(fd.get("english_name") ?? englishName).trim();
      const submitGrade = String(fd.get("grade") ?? grade).trim();
      const submitSection = String(fd.get("section") ?? section).trim();
      const submitIslamicGroup = String(fd.get("islamic_group") ?? islamicGroup).trim();

      if (!submitEmail || !submitPassword) {
        toast.error(lang === "ar"
          ? "يرجى إدخال البريد الإلكتروني وكلمة المرور."
          : "Please enter your email and password.");
        return;
      }

      if (mode === "signup") {
        if (accountType === "student") {
          if (!submitArabicName) {
            toast.error(lang === "ar" ? "يرجى إدخال اسم الطالب بالعربية." : "Please enter the Arabic student name.");
            return;
          }
          if (!submitEnglishName) {
            toast.error(lang === "ar" ? "يرجى إدخال اسم الطالب بالإنجليزية." : "Please enter the English student name.");
            return;
          }
          if (!submitSection) {
            toast.error(lang === "ar" ? "يرجى اختيار الشعبة." : "Please select your section.");
            return;
          }
          if (!submitIslamicGroup) {
            toast.error(lang === "ar" ? "يرجى اختيار المجموعة الإسلامية." : "Please select your Islamic group.");
            return;
          }
          if (!profilePhotoFile) {
            toast.error(lang === "ar" ? "يرجى رفع صورة الملف الشخصي." : "Please upload a profile photo.");
            return;
          }

          const completeStudentSignup = async (userId: string) => {
            await uploadProfilePhoto(userId, profilePhotoFile);
            toast.success(T.welcome);
            window.location.assign("/student");
          };

          const { data, error } = await supabase.auth.signUp({
            email: submitEmail,
            password: submitPassword,
            options: {
              emailRedirectTo: `${window.location.origin}/student-dashboard`,
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
          if (error) throw error;

          if (data.session && data.user) {
            await completeStudentSignup(data.user.id);
            return;
          }

          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: submitEmail,
            password: submitPassword,
          });
          if (!loginError && loginData.session?.user) {
            await completeStudentSignup(loginData.user.id);
            return;
          }

          toast.success(lang === "ar"
            ? "تم إنشاء حسابك. يرجى مراجعة بريدك الإلكتروني لتأكيده ثم تسجيل الدخول."
            : "Your account was created. Please check your email to confirm it, then sign in.");
          setMode("login");
          return;
        }

        const submitParentFullName = String(fd.get("parent_full_name") ?? parentFullName).trim();
        const submitParentLinkCode = String(fd.get("parent_link_code") ?? parentLinkCode).trim();

        if (!submitParentFullName) {
          toast.error(lang === "ar" ? "يرجى إدخال اسم ولي الأمر." : "Please enter the parent full name.");
          return;
        }
        if (!submitParentLinkCode) {
          toast.error(lang === "ar" ? "يرجى إدخال رمز ربط ولي الأمر." : "Please enter the Parent Link Code.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: submitEmail,
          password: submitPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/parent/dashboard`,
            data: {
              full_name: submitParentFullName,
              role_intent: "parent",
              parent_link_code: submitParentLinkCode,
            },
          },
        });
        if (error) throw error;

        if (data.user) {
          await supabase.from("parent_profiles").upsert(
            {
              user_id: data.user.id,
              full_name: submitParentFullName,
              email: submitEmail,
              student_name: "",
              student_grade: "",
            },
            { onConflict: "user_id" },
          );
        }

        const completeParentSignup = async () => {
          const redeem = await redeemParentLinkCode(submitParentLinkCode);
          if (!redeem.ok) {
            toast.error(
              lang === "ar"
                ? "كود الطالب غير صالح. تحقق من الكود في إعدادات ولي الأمر بعد تسجيل الدخول."
                : "That student link code is not valid. Check the code in Parent Settings after signing in.",
            );
          } else if (redeem.alreadyLinked) {
            toast.success(lang === "ar" ? "هذا الطالب مرتبط بالفعل." : "This student is already linked.");
          } else {
            toast.success(lang === "ar" ? "تم ربط الطالب بنجاح." : "Student linked successfully.");
          }
          await supabase.auth.updateUser({ data: { parent_link_code: null } });
          window.location.assign("/parent/dashboard");
        };

        if (data.session) {
          toast.success(T.welcome);
          await completeParentSignup();
          return;
        }

        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: submitEmail,
          password: submitPassword,
        });
        if (!loginError && loginData.session) {
          toast.success(T.welcome);
          await completeParentSignup();
          return;
        }

        toast.success(lang === "ar"
          ? "تم إنشاء حسابك. يرجى مراجعة بريدك الإلكتروني لتأكيده ثم تسجيل الدخول."
          : "Your account was created. Please check your email to confirm it, then sign in.");
        setMode("login");
        return;
      }

      const { data: loginData, error } = await supabase.auth.signInWithPassword({
        email: submitEmail,
        password: submitPassword,
      });
      if (error) throw error;
      toast.success(T.welcome);
      const redirectPath = loginData.user
        ? await getPostAuthPath(loginData.user.id)
        : "/student";
      window.location.assign(redirectPath);
    } catch (err) {
      if (mode === "signup" && isDuplicateEmailError(err)) {
        setSignupAlert(T.duplicateEmail);
        return;
      }
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }


  return (
    <PageShell
      eyebrow={lang === "ar" ? "بوابة الطالب" : "Student Portal"}
      title={T.title}
      lead={T.lead}
      crumbs={[{ label: T.title }]}
    >
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 items-start">
        {/* Form card */}
        <div className="rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
          <div className="inline-flex rounded-full border border-border p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode("signup"); setSignupAlert(null); }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}
            >
              <UserPlus className="h-4 w-4" /> {accountType === "parent" ? T.parentSignup : T.signup}
            </button>
            <button
              type="button"
              onClick={() => { setMode("login"); setSignupAlert(null); }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${mode === "login" ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}
            >
              <LogIn className="h-4 w-4" /> {T.login}
            </button>
          </div>

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
                    {T.login}
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">{T.accountType}</label>
                <div className="mt-2 inline-flex w-full rounded-full border border-border p-1">
                  <button
                    type="button"
                    onClick={() => setAccountType("student")}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${accountType === "student" ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}
                  >
                    <GraduationCap className="h-4 w-4" /> {T.studentAccount}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType("parent")}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${accountType === "parent" ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}
                  >
                    <Users className="h-4 w-4" /> {T.parentAccount}
                  </button>
                </div>
              </div>
            )}
            {mode === "signup" && accountType === "student" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{T.arabicNameHint} *</label>
                  <input
                    type="text"
                    name="arabic_name"
                    autoComplete="additional-name"
                    required
                    value={arabicName}
                    onChange={(e) => setArabicName(e.target.value)}
                    maxLength={100}
                    dir="rtl"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{T.englishNameHint} *</label>
                  <input
                    type="text"
                    name="english_name"
                    autoComplete="name"
                    required
                    value={englishName}
                    onChange={(e) => setEnglishName(e.target.value)}
                    maxLength={100}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{T.grade}</label>
                  <select
                    name="grade"
                    required
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    {grades.map((g) => (
                      <option key={g.slug} value={g.slug}>{g.name[locale]}</option>
                    ))}
                  </select>
                </div>
                <StudentAcademicFields
                  lang={lang}
                  section={section}
                  islamicGroup={islamicGroup}
                  onSectionChange={setSection}
                  onIslamicGroupChange={setIslamicGroup}
                  required
                />
                <ProfilePhotoField
                  lang={lang}
                  file={profilePhotoFile}
                  onChange={setProfilePhotoFile}
                  required
                />
              </>
            )}
            {mode === "signup" && accountType === "parent" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{T.parentFullName}</label>
                  <input
                    type="text"
                    name="parent_full_name"
                    autoComplete="name"
                    required
                    value={parentFullName}
                    onChange={(e) => setParentFullName(e.target.value)}
                    maxLength={100}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{T.parentLinkCode}</label>
                  <input
                    type="text"
                    name="parent_link_code"
                    required
                    value={parentLinkCode}
                    onChange={(e) => setParentLinkCode(e.target.value.toUpperCase())}
                    maxLength={20}
                    placeholder="IIA-X7K92A"
                    autoComplete="off"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono tracking-wider uppercase"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{T.parentLinkCodeHint}</p>
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">{T.email}</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setSignupAlert(null); }}
                maxLength={255}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{T.password}</label>
              <input
                type="password"
                name="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={8}
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
              {busy ? "…" : mode === "signup" ? (accountType === "parent" ? T.parentSignup : T.submitSignup) : T.submitLogin}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setSignupAlert(null); }}
              className="underline hover:text-primary"
            >
              {mode === "login" ? T.toSignup : T.toLogin}
            </button>
          </div>
        </div>

        {/* Side panel */}
        <div className="rounded-3xl bg-gradient-to-br from-brand-dark to-primary text-primary-foreground p-8 shadow-[var(--shadow-elegant)]">
          <GraduationCap className="h-10 w-10 text-gold" />
          <h3 className="mt-4 font-display text-2xl">
            {lang === "ar" ? "ابدأ رحلتك التعليمية" : "Start your learning journey"}
          </h3>
          <ul className="mt-5 space-y-3 text-sm opacity-90">
            {(lang === "ar"
              ? ["دروسي ومتابعتي", "اختباراتي وتقدمي", "مكتبة الفيديوهات والملفات", "ركن الوالدين"]
              : ["My lessons & tracking", "My quizzes & progress", "Videos & files library", "Parent corner"]
            ).map((x) => (
              <li key={x} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {x}
              </li>
            ))}
          </ul>
          <Link to="/grades" className="mt-8 inline-flex rounded-full border border-primary-foreground/30 px-5 py-2.5 text-sm font-semibold hover:bg-primary-foreground/10">
            {lang === "ar" ? "استكشف الأكاديمية" : "Explore the Academy"}
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
