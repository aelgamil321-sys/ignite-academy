import { Link, useNavigate } from "@tanstack/react-router";
import { LogIn, UserPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export function ParentAccountRequired() {
  const { tr } = useI18n();
  const navigate = useNavigate();

  async function signOutForParentLogin() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "login", accountType: "parent" } });
  }

  return (
    <div className="mb-8 rounded-2xl border border-amber-300/60 bg-amber-50 px-5 py-5 text-sm text-amber-950 shadow-[var(--shadow-soft)]">
      <p className="font-medium">{tr("parent_corner_student_msg")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void signOutForParentLogin();
          }}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-emerald transition-colors"
        >
          <LogIn className="h-3.5 w-3.5" />
          {tr("parent_corner_parent_login")}
        </button>
        <Link
          to="/auth"
          search={{ mode: "signup", accountType: "parent" }}
          onClick={(e) => {
            e.preventDefault();
            void (async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", search: { mode: "signup", accountType: "parent" } });
            })();
          }}
          className="inline-flex items-center gap-2 rounded-full border border-amber-400/80 bg-white px-4 py-2 text-xs font-semibold hover:border-emerald hover:text-emerald transition-colors"
        >
          <UserPlus className="h-3.5 w-3.5" />
          {tr("parent_corner_parent_signup")}
        </Link>
      </div>
    </div>
  );
}
