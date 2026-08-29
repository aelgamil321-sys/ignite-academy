import { useNavigate } from "@tanstack/react-router";
import { GraduationCap, TrendingUp, Users } from "lucide-react";
import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import { useI18n } from "@/lib/i18n";
import { grades } from "@/lib/curriculum";
import { gradeDisplayName } from "@/lib/grade-utils";
import { storeParentChildId, type ParentLinkedChild } from "@/lib/parent-children";
import {
  PARENT_DASH_EMPTY,
  PARENT_DASH_SECTION,
  PARENT_DASH_SECTION_LEAD,
  PARENT_DASH_SECTION_TITLE,
} from "@/lib/parent-dashboard-ui";
import { islamicGroupLabel, sectionLabel } from "@/lib/student-academics";

type ParentSettingsChildrenSectionProps = {
  parentUserId: string;
  children: ParentLinkedChild[];
  linkError: "none" | null;
};

export function ParentSettingsChildrenSection({
  parentUserId,
  children,
  linkError,
}: ParentSettingsChildrenSectionProps) {
  const navigate = useNavigate();
  const { tr, lang, bi, biMaybe } = useI18n();

  function handleViewProgress(studentUserId: string) {
    storeParentChildId(parentUserId, studentUserId);
    navigate({ to: "/parent/dashboard" });
  }

  return (
    <section className="space-y-3" aria-labelledby="parent-settings-children-heading">
      <div>
        <h2 id="parent-settings-children-heading" className={PARENT_DASH_SECTION_TITLE}>
          {tr("parent_settings_my_children_title")}
        </h2>
        <p className={`mt-1 ${PARENT_DASH_SECTION_LEAD}`}>{tr("parent_linked_children_lead")}</p>
      </div>

      {linkError === "none" || children.length === 0 ? (
        <div className={`${PARENT_DASH_EMPTY} flex-col items-start sm:flex-row sm:items-center`}>
          <span className="flex-1">{tr("parent_settings_children_empty")}</span>
          <a
            href="#parent-link-child-form"
            className="inline-flex shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            {tr("parent_add_child_submit")}
          </a>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {children.map((child) => {
            const gradeName =
              gradeDisplayName(child.gradeSlug, lang) ||
              biMaybe(grades.find((g) => g.slug === child.gradeSlug)?.name) ||
              child.gradeSlug;
            const section = sectionLabel(child.section, lang);
            const islamic = islamicGroupLabel(child.islamicGroup, lang);
            const arabicName = child.studentName.ar?.trim();
            const englishName = child.studentName.en?.trim();

            return (
              <article key={child.studentUserId} className={PARENT_DASH_SECTION}>
                <div className="flex items-start gap-3">
                  <StudentProfileAvatar
                    profilePhotoPath={child.profilePhotoPath}
                    alt={arabicName || englishName || ""}
                    className="h-12 w-12 rounded-xl"
                    fallbackClassName="rounded-xl text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    {arabicName ? (
                      <div className="font-display text-base font-semibold leading-snug text-foreground" dir="rtl">
                        {arabicName}
                      </div>
                    ) : null}
                    {englishName ? (
                      <div
                        className={`text-sm font-medium text-foreground/85 ${arabicName ? "mt-0.5" : "font-display text-base font-semibold"}`}
                      >
                        {englishName}
                      </div>
                    ) : null}
                    {!arabicName && !englishName ? (
                      <div className="font-display text-base font-semibold text-foreground">
                        {bi(child.studentName)}
                      </div>
                    ) : null}

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background px-2 py-0.5 text-[11px] font-semibold text-primary">
                        <GraduationCap className="h-3 w-3" aria-hidden />
                        {gradeName}
                      </span>
                      {section ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/70">
                          <Users className="h-3 w-3" aria-hidden />
                          {section}
                        </span>
                      ) : null}
                      {islamic ? (
                        <span className="inline-flex items-center rounded-full border border-border/80 bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/70">
                          {islamic}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleViewProgress(child.studentUserId)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/8 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground sm:w-auto"
                >
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                  {tr("parent_settings_view_progress")}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
