import { createContext, useContext, type ReactNode } from "react";
import type { TeacherContext } from "@/lib/teacher-dashboard";

export type TeacherShellContextValue = {
  context: TeacherContext | null;
  teacherName: string;
  email: string;
  profilePhotoPath: string | null;
};

const TeacherShellContext = createContext<TeacherShellContextValue | null>(null);

export function TeacherShellProvider({
  value,
  children,
}: {
  value: TeacherShellContextValue;
  children: ReactNode;
}) {
  return <TeacherShellContext.Provider value={value}>{children}</TeacherShellContext.Provider>;
}

export function useTeacherShell(): TeacherShellContextValue {
  const value = useContext(TeacherShellContext);
  if (!value) {
    throw new Error("useTeacherShell must be used within TeacherShellProvider");
  }
  return value;
}
