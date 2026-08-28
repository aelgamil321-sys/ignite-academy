import { useLayoutEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  markPasswordRecoveryPending,
  redirectToResetPasswordIfRecovery,
} from "@/lib/password-recovery";

/** Redirect recovery sessions to /reset-password before route guards run. */
export function PasswordRecoveryGuard() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useLayoutEffect(() => {
    if (pathname === "/reset-password") return;
    redirectToResetPasswordIfRecovery();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        markPasswordRecoveryPending();
        if (window.location.pathname !== "/reset-password") {
          window.location.replace("/reset-password");
        }
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [pathname]);

  return null;
}
