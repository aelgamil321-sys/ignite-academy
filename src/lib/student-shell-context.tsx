import { createContext, useContext, type ReactNode } from "react";
import type { IslamicGroup, StudentSection } from "@/lib/student-academics";

export type StudentShellContextValue = {
  userId: string;
  email: string;
  displayName: string;
  arabicName: string;
  englishName: string;
  profilePhotoPath: string | null;
  gradeSlug: string;
  hasGrade: boolean;
  section: StudentSection | null;
  islamicGroup: IslamicGroup | null;
  profileComplete: boolean;
};

const StudentShellContext = createContext<StudentShellContextValue | null>(null);

export function StudentShellProvider({
  value,
  children,
}: {
  value: StudentShellContextValue;
  children: ReactNode;
}) {
  return <StudentShellContext.Provider value={value}>{children}</StudentShellContext.Provider>;
}

export function useStudentShell(): StudentShellContextValue {
  const value = useContext(StudentShellContext);
  if (!value) {
    throw new Error("useStudentShell must be used within StudentShellProvider");
  }
  return value;
}

export function useOptionalStudentShell(): StudentShellContextValue | null {
  return useContext(StudentShellContext);
}
