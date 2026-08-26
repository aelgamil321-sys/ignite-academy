import { supabaseProjectHost } from "@/lib/account-role";
import { useAccountRole, type HomeVariant } from "@/hooks/use-account-role";

type AuthDebugPanelProps = {
  homeVariant?: HomeVariant;
};

export function AuthDebugPanel({ homeVariant }: AuthDebugPanelProps) {
  const {
    authLoading,
    sessionExists,
    authUserId,
    authEmail,
    authEvents,
    authStorageKeyPresent,
    loginSnapshot,
    role,
    rawUserRoles,
    roleLoading,
    roleQueryError,
    roleQueryStatus,
    isTeacher,
    isStudent,
  } = useAccountRole();

  const currentPath =
    typeof window !== "undefined" ? window.location.pathname + window.location.search : "";

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t-2 border-amber-500 bg-amber-50 text-amber-950 shadow-lg"
      aria-label="Auth debug panel (temporary)"
    >
      <div className="container-page py-3 text-xs font-mono leading-relaxed max-h-[45vh] overflow-auto">
        <div className="font-bold text-sm mb-2 text-amber-900">AUTH DEBUG (temporary)</div>
        <div>supabaseHost: {supabaseProjectHost()}</div>
        <div>currentPath: {currentPath}</div>
        <div>sessionExists: {sessionExists}</div>
        <div>authUserId: {authUserId ?? "—"}</div>
        <div>authEmail: {authEmail ?? "—"}</div>
        <div>authLoading: {authLoading}</div>
        <div>authStorageKeyPresent: {authStorageKeyPresent}</div>
        <div>authEvents: {authEvents.length ? authEvents.join(", ") : "—"}</div>
        <div>loginSnapshot: {loginSnapshot ? JSON.stringify(loginSnapshot) : "—"}</div>
        <div>roleLoading: {roleLoading}</div>
        <div>roleQueryStatus: {roleQueryStatus ?? "—"}</div>
        <div>roleQueryError: {roleQueryError ?? "—"}</div>
        <div>rawUserRoles: {JSON.stringify(rawUserRoles)}</div>
        <div>resolvedRole: {role ?? "null"}</div>
        <div>isTeacher: {isTeacher}</div>
        <div>isStudent: {isStudent}</div>
        <div>homeVariant: {homeVariant ?? "—"}</div>
      </div>
    </div>
  );
}
