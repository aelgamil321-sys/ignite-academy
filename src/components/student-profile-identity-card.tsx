import { Mail, UserRound } from "lucide-react";
import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import { useI18n } from "@/lib/i18n";
import { gradeDisplayName } from "@/lib/grade-utils";
import { islamicGroupLabel, sectionLabel, type IslamicGroup, type StudentSection } from "@/lib/student-academics";

type StudentProfileIdentityCardProps = {
  profilePhotoPath: string | null;
  arabicName: string;
  englishName: string;
  email: string;
  grade: string;
  section: StudentSection | "";
  islamicGroup: IslamicGroup | "";
};

export function StudentProfileIdentityCard({
  profilePhotoPath,
  arabicName,
  englishName,
  email,
  grade,
  section,
  islamicGroup,
}: StudentProfileIdentityCardProps) {
  const { tr, lang } = useI18n();

  const gradeLabel = grade ? gradeDisplayName(grade, lang) : tr("not_set");
  const sectionLabelText = section ? sectionLabel(section, lang) : tr("not_set");
  const groupLabelText = islamicGroup ? islamicGroupLabel(islamicGroup, lang) : tr("not_set");

  const academicItems = [
    { key: "grade", label: tr("auth_grade"), value: gradeLabel },
    { key: "section", label: tr("auth_section"), value: sectionLabelText },
    { key: "group", label: tr("auth_islamic_group"), value: groupLabelText },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand-dark/25 bg-brand-dark text-white shadow-[var(--shadow-soft)]">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-dark to-primary/20"
        aria-hidden
      />
      <div className="relative p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <StudentProfileAvatar
            profilePhotoPath={profilePhotoPath}
            alt={englishName || arabicName}
            className="h-20 w-20 shrink-0 rounded-2xl border-2 border-primary/40 shadow-md sm:h-24 sm:w-24"
          />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2 text-primary">
              <UserRound className="h-4 w-4" aria-hidden />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                {tr("student_profile_identity_title")}
              </span>
            </div>
            {englishName ? (
              <p className="font-display text-xl font-semibold leading-tight text-white sm:text-2xl">
                {englishName}
              </p>
            ) : null}
            {arabicName ? (
              <p className="mt-1 text-base text-white/85" dir="rtl">
                {arabicName}
              </p>
            ) : null}
            <p className="mt-2 inline-flex max-w-full items-center gap-2 text-sm text-white/70">
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{email}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            {tr("student_profile_academic_identity")}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {academicItems.map((item) => (
              <div
                key={item.key}
                className="rounded-lg border border-white/10 bg-black/10 px-3 py-2"
              >
                <p className="text-[10px] uppercase tracking-wide text-white/55">{item.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
