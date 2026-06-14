import { supabase } from "@/integrations/supabase/client";

export type RedeemParentLinkCodeResult =
  | { ok: true; studentUserId: string; alreadyLinked: boolean }
  | { ok: false; errorCode: ParentLinkCodeError };

export type ParentLinkCodeError =
  | "invalid_code"
  | "not_authenticated"
  | "not_parent"
  | "unknown";

type RpcPayload = {
  ok?: boolean;
  error?: string;
  student_user_id?: string;
  already_linked?: boolean;
};

export function normalizeParentLinkCodeInput(code: string): string {
  return code.trim().toUpperCase();
}

export function mapParentLinkCodeError(errorCode: string | undefined): ParentLinkCodeError {
  if (errorCode === "invalid_code") return "invalid_code";
  if (errorCode === "not_authenticated") return "not_authenticated";
  if (errorCode === "not_parent") return "not_parent";
  return "unknown";
}

export async function redeemParentLinkCode(code: string): Promise<RedeemParentLinkCodeResult> {
  const trimmed = code.trim();
  if (!trimmed) {
    return { ok: false, errorCode: "invalid_code" };
  }

  const { data, error } = await supabase.rpc("redeem_parent_link_code", {
    p_code: trimmed,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("invalid_code") || message.includes("not found")) {
      return { ok: false, errorCode: "invalid_code" };
    }
    return { ok: false, errorCode: "unknown" };
  }

  const payload = (data ?? {}) as RpcPayload;
  if (!payload.ok) {
    return { ok: false, errorCode: mapParentLinkCodeError(payload.error) };
  }

  if (!payload.student_user_id) {
    return { ok: false, errorCode: "unknown" };
  }

  return {
    ok: true,
    studentUserId: payload.student_user_id,
    alreadyLinked: Boolean(payload.already_linked),
  };
}

export async function redeemPendingParentLinkCodeFromMetadata(): Promise<RedeemParentLinkCodeResult | null> {
  const { data: auth } = await supabase.auth.getUser();
  const pending = auth.user?.user_metadata?.parent_link_code;
  if (!pending || typeof pending !== "string" || !pending.trim()) {
    return null;
  }

  const result = await redeemParentLinkCode(pending);
  if (result.ok || result.errorCode === "invalid_code") {
    await supabase.auth.updateUser({
      data: { parent_link_code: null },
    });
  }
  return result;
}

export async function adminRegenerateParentLinkCode(studentUserId: string): Promise<{
  ok: boolean;
  code?: string;
  error?: string;
}> {
  const { data, error } = await supabase.rpc("admin_regenerate_parent_link_code", {
    p_student_user_id: studentUserId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const payload = (data ?? {}) as { ok?: boolean; parent_link_code?: string; error?: string };
  if (!payload.ok) {
    return { ok: false, error: payload.error ?? "unknown" };
  }

  return { ok: true, code: payload.parent_link_code };
}
