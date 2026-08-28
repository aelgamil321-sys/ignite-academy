import type { AnnouncementAudience } from "@/lib/announcement-audience";
import type { AnnouncementTopic } from "@/lib/announcement-topics";
import { grades } from "@/lib/curriculum";
import {
  ANNOUNCEMENT_AUDIENCES,
  announcementAudienceLabel,
} from "@/lib/announcement-audience";
import { ANNOUNCEMENT_TOPIC_LABELS, type AnnouncementTopic as Topic } from "@/lib/announcement-topics";
import { STUDENT_SECTIONS, sectionLabel, type StudentSection } from "@/lib/student-academics";
import { useI18n, L } from "@/lib/i18n";

export function AnnouncementTargetingFields({
  grade,
  setGrade,
  targetSection,
  setTargetSection,
  audience,
  setAudience,
  topic,
  setTopic,
  gradeOptions,
  requireGrade = false,
  sectionOptions,
  audienceOptions,
}: {
  grade: string;
  setGrade: (value: string) => void;
  targetSection: StudentSection | "";
  setTargetSection: (value: StudentSection | "") => void;
  audience: AnnouncementAudience;
  setAudience: (value: AnnouncementAudience) => void;
  topic: AnnouncementTopic;
  setTopic: (value: AnnouncementTopic) => void;
  gradeOptions?: string[];
  requireGrade?: boolean;
  /** When set, limits section choices to teacher assignment scope. */
  sectionOptions?: {
    allowAllSections: boolean;
    sections: StudentSection[];
  };
  /** When set, limits audience choices (teacher UI should match RLS). */
  audienceOptions?: AnnouncementAudience[];
}) {
  const { lang, bi } = useI18n();
  const gradesList = gradeOptions ?? grades.map((g) => g.slug);
  const sectionChoices = sectionOptions
    ? sectionOptions.sections
    : [...STUDENT_SECTIONS];
  const audienceChoices = audienceOptions ?? ANNOUNCEMENT_AUDIENCES;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {L("Grade", "الصف")[lang]}
            {requireGrade ? " *" : ""}
          </span>
          <select
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          >
            {!requireGrade ? <option value="">{L("All grades", "جميع الصفوف")[lang]}</option> : null}
            {gradesList.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {L("Section", "الشعبة")[lang]}
          </span>
          <select
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={targetSection}
            onChange={(e) => setTargetSection(e.target.value as StudentSection | "")}
          >
            {sectionOptions?.allowAllSections !== false ? (
              <option value="">{L("All sections", "جميع الشعب")[lang]}</option>
            ) : null}
            {sectionChoices.map((s) => (
              <option key={s} value={s}>{sectionLabel(s, lang)}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {L("Audience", "الجمهور")[lang]}
          </span>
          <select
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={audience}
            onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}
          >
            {audienceChoices.map((a) => (
              <option key={a} value={a}>{bi(announcementAudienceLabel(a))}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {L("Topic", "الموضوع")[lang]}
          </span>
          <select
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={topic}
            onChange={(e) => setTopic(e.target.value as Topic)}
          >
            {(Object.keys(ANNOUNCEMENT_TOPIC_LABELS) as AnnouncementTopic[]).map((t) => (
              <option key={t} value={t}>{bi(ANNOUNCEMENT_TOPIC_LABELS[t])}</option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}
