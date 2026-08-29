import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import type { StudentShellContextValue } from "@/lib/student-shell-context";
import {
  clearStudentShellCache,
  peekStudentShell,
  resolveStudentWorkspace,
} from "@/lib/student-workspace-session";

export type StudentWorkspaceChromeState =
  | { status: "pending"; shell: StudentShellContextValue | null }
  | { status: "public" }
  | { status: "student"; shell: StudentShellContextValue };

export function useStudentWorkspaceChrome(): StudentWorkspaceChromeState {
  const { lang } = useI18n();
  const [state, setState] = useState<StudentWorkspaceChromeState>(() => {
    const cached = peekStudentShell(lang);
    if (cached) return { status: "student", shell: cached };
    return { status: "pending", shell: null };
  });

  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await resolveStudentWorkspace(lang);
      if (!active) return;
      if (result.status === "student") {
        setState({ status: "student", shell: result.shell });
        return;
      }
      setState({ status: "public" });
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        clearStudentShellCache();
        setState({ status: "public" });
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [lang]);

  return state;
}
