import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Content kinds where a reliable `created_by` column exists in the current schema. */
export type AdminOwnedContentKind =
  | "article"
  | "assignment"
  | "lesson"
  | "video"
  | "file"
  | "quiz";

/** All content tables expose `created_by` after ownership migration. Quizzes inherit lesson ownership. */
export function hasReliableOwnershipColumn(kind: AdminOwnedContentKind): boolean {
  return kind !== "quiz";
}

export function canAdminMutateOwnedContent(
  createdBy: string | null | undefined,
  actorId: string | null | undefined,
): boolean {
  if (!actorId || !createdBy) return false;
  return createdBy === actorId;
}

/** True when admin must not edit/delete/publish this row. */
export function adminContentIsReadOnly(
  _kind: AdminOwnedContentKind,
  createdBy: string | null | undefined,
  actorId: string | null | undefined,
): boolean {
  return !canAdminMutateOwnedContent(createdBy, actorId);
}

export function adminContentReadOnlyReason(
  _kind: AdminOwnedContentKind,
  createdBy: string | null | undefined,
  actorId?: string | null,
): "teacher-owned" | "legacy" | "own" {
  if (!createdBy) return "legacy";
  if (actorId && createdBy === actorId) return "own";
  return "teacher-owned";
}

export function useAdminContentActor(): string | null {
  const [actorId, setActorId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setActorId(data.user?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, []);
  return actorId;
}
