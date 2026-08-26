import { supabaseProjectHost } from "@/lib/account-role";
import { useAccountRole, type HomeVariant } from "@/hooks/use-account-role";

type AuthDebugPanelProps = {
  homeVariant?: HomeVariant;
};

export function AuthDebugPanel({ homeVariant }: AuthDebugPanelProps) {
  const {
    sessionReady,
    userId,
    email,
    role,
    rawUserRoles,
    roleLoading,
    roleQueryError,
    roleQueryStatus,
    isTeacher,
    isStudent,
  } = useAccountRole();

  if (!sessionReady || !userId) return null;

  const currentPath =
    typeof window !== "undefined" ? window.location.pathname + window.location.search : "";

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t-2 border-amber-500 bg-amber-50 text-amber-950 shadow-lg"
      aria-label="Auth debug panel (temporary)"
    >
      <div className="container-page py-3 text-xs font-mono leading-relaxed max-h-[40vh] overflow-auto">
        <div className="font-bold text-sm mb-2 text-amber-900">AUTH DEBUG (temporary)</div>
        <div>supabaseHost: {supabaseProjectHost()}</div>
        <div>userId: {userId}</div>
        <div>email: {email ?? "—"}</div>
        <div>sessionReady: {sessionReady}</div>
        <div>roleLoading: {roleLoading}</div>
        <div>roleQueryStatus: {roleQueryStatus ?? "—"}</div>
        <div>roleQueryError: {roleQueryError ?? "—"}</div>
        <div>rawUserRoles: {JSON.stringify(rawUserRoles)}</div>
        <div>resolvedRole: {role ?? "null"}</div>
        <div>isTeacher: {isTeacher}</div>
        <div>isStudent: {isStudent}</div>
        <div>currentPath: {currentPath}</div>
        <div>homeVariant: {homeVariant ?? "—"}</div>
      </div>
    </div>
  );
}
