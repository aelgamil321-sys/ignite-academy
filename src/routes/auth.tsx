import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { GraduationCap, LogIn, UserPlus } from "lucide-react";
import { grades } from "@/lib/curriculum";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s.mode === "signup" ? "signup" : "login",
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
  const navigate = useNavigate();
  const { mode: initialMode } = Route.useSearch();
  const { lang } = useI18n();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState(grades.find((g) => g.slug === "8")?.slug ?? grades[0]?.slug ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setMode(initialMode); }, [initialMode]);

  // If already signed in, send to student dashboard
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (active && data.user) navigate({ to: "/student-dashboard" });
    })();
    return () => { active = false; };
  }, [navigate]);


  const T = {
    title: lang === "ar" ? "حساب الطالب" : "Student Account",
    lead: lang === "ar"
      ? "أنشئ حسابك أو سجّل الدخول للوصول إلى الدروس والاختبارات وتتبع تقدمك."
      : "Create your account or sign in to access your lessons, quizzes, and progress.",
    signup: lang === "ar" ? "إنشاء حساب طالب" : "Create Student Account",
    login: lang === "ar" ? "تسجيل الدخول" : "Login",
    name: lang === "ar" ? "الاسم الكامل" : "Full name",
    email: lang === "ar" ? "البريد الإلكتروني" : "Email",
    password: lang === "ar" ? "كلمة المرور" : "Password",
    grade: lang === "ar" ? "الصف الدراسي" : "Grade",
    submitSignup: lang === "ar" ? "إنشاء الحساب" : "Create account",
    submitLogin: lang === "ar" ? "دخول" : "Sign in",
    toLogin: lang === "ar" ? "لديك حساب؟ سجّل الدخول" : "Have an account? Sign in",
    toSignup: lang === "ar" ? "جديد هنا؟ أنشئ حساب طالب" : "New here? Create a student account",
    welcome: lang === "ar" ? "مرحبًا بك في الأكاديمية" : "Welcome to the Academy",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/student-dashboard`,
            data: { full_name: name, role_intent: "student", grade },
          },
        });
        if (error) throw error;
        if (!data.session) {
          // Email confirmation required
          toast.success(lang === "ar"
            ? "يرجى مراجعة بريدك الإلكتروني لتأكيد حسابك."
            : "Please check your email to confirm your account.");
          return;
        }
        toast.success(T.welcome);
        navigate({ to: "/student-dashboard" });
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success(T.welcome);
      navigate({ to: "/student-dashboard" });
    } catch (err) {
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
              onClick={() => setMode("signup")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}
            >
              <UserPlus className="h-4 w-4" /> {T.signup}
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${mode === "login" ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}
            >
              <LogIn className="h-4 w-4" /> {T.login}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{T.name}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{T.grade}</label>
                  <select
                    required
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    {grades.map((g) => (
                      <option key={g.slug} value={g.slug}>{g.name[lang]}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">{T.email}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{T.password}</label>
              <input
                type="password"
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
              className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-emerald transition-colors disabled:opacity-60"
            >
              {busy ? "…" : mode === "signup" ? T.submitSignup : T.submitLogin}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="underline hover:text-primary"
            >
              {mode === "login" ? T.toSignup : T.toLogin}
            </button>
          </div>
        </div>

        {/* Side panel */}
        <div className="rounded-3xl bg-gradient-to-br from-primary to-emerald text-primary-foreground p-8 shadow-[var(--shadow-elegant)]">
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
