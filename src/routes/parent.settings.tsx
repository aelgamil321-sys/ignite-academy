import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ParentLinkChildForm } from "@/components/parent-link-child-form";
import { ParentSettingsChildrenSection } from "@/components/parent-settings-children-section";
import { ParentSettingsPreferences } from "@/components/parent-settings-preferences";
import { ParentSettingsProfileCard } from "@/components/parent-settings-profile-card";
import { ParentWorkspacePageHeader } from "@/components/parent-workspace-page-header";
import { ParentGate } from "@/lib/parent-layout";
import { useI18n } from "@/lib/i18n";
import { fetchParentLinkedChildren, type ParentLinkedChild } from "@/lib/parent-children";
import { normalizePreferredLang, savePreferredLanguage as persistPreferredLanguage } from "@/lib/preferred-language";
import type { Lang } from "@/lib/i18n-config";
import { supabase } from "@/integrations/supabase/client";
import { useParentShell } from "@/lib/parent-shell-context";

export const Route = createFileRoute("/parent/settings")({
  head: () => ({
    meta: [
      { title: "Parent Profile — Ignite Islamic Academy" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ParentSettingsRoute,
});

function ParentSettingsRoute() {
  return (
    <ParentGate>
      <ParentSettingsPage />
    </ParentGate>
  );
}

function ParentSettingsPage() {
  const { userId } = useParentShell();
  const { tr, lang, setLang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [savingLang, setSavingLang] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<Lang>("ar");
  const [children, setChildren] = useState<ParentLinkedChild[]>([]);
  const [linkError, setLinkError] = useState<"none" | null>(null);

  const loadChildren = useCallback(async (parentUserId: string) => {
    const childrenResult = await fetchParentLinkedChildren(parentUserId);
    setChildren(childrenResult.children);
    setLinkError(childrenResult.linkError);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [{ data: profile }, childrenResult] = await Promise.all([
        supabase
          .from("parent_profiles")
          .select("full_name, email, preferred_language")
          .eq("user_id", userId)
          .maybeSingle(),
        fetchParentLinkedChildren(userId),
      ]);
      if (!active) return;
      setFullName(profile?.full_name ?? "");
      setEmail(profile?.email ?? "");
      setPreferredLanguage(normalizePreferredLang(profile?.preferred_language) ?? lang);
      setChildren(childrenResult.children);
      setLinkError(childrenResult.linkError);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId, lang]);

  async function handleSavePreferredLanguage() {
    setSavingLang(true);
    try {
      await persistPreferredLanguage(userId, preferredLanguage, "parent");
      setLang(preferredLanguage);
      toast.success(tr("profile_preferred_language_saved"));
    } catch {
      toast.error(tr("parent_link_code_error_generic"));
    } finally {
      setSavingLang(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl">
        <ParentWorkspacePageHeader title={tr("parent_nav_profile")} lead={tr("parent_profile_lead")} />
        <p className="text-sm text-foreground/60">{tr("parent_profile_loading")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <ParentWorkspacePageHeader title={tr("parent_nav_profile")} lead={tr("parent_profile_lead")} />

      <ParentSettingsProfileCard fullName={fullName} email={email} />

      <ParentSettingsChildrenSection parentUserId={userId} children={children} linkError={linkError} />

      <ParentLinkChildForm
        onLinked={() => {
          void loadChildren(userId);
        }}
      />

      <ParentSettingsPreferences
        preferredLanguage={preferredLanguage}
        onPreferredLanguageChange={setPreferredLanguage}
        saving={savingLang}
        onSave={() => void handleSavePreferredLanguage()}
      />
    </div>
  );
}
