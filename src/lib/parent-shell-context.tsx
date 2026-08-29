import { createContext, useContext, type ReactNode } from "react";

export type ParentShellContextValue = {
  userId: string;
  email: string;
  displayName: string;
};

const ParentShellContext = createContext<ParentShellContextValue | null>(null);

export function ParentShellProvider({
  value,
  children,
}: {
  value: ParentShellContextValue;
  children: ReactNode;
}) {
  return <ParentShellContext.Provider value={value}>{children}</ParentShellContext.Provider>;
}

export function useParentShell(): ParentShellContextValue {
  const value = useContext(ParentShellContext);
  if (!value) {
    throw new Error("useParentShell must be used within ParentShellProvider");
  }
  return value;
}

export function useOptionalParentShell(): ParentShellContextValue | null {
  return useContext(ParentShellContext);
}
