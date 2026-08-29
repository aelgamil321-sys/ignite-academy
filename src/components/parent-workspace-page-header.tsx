export function ParentWorkspacePageHeader({
  title,
  lead,
}: {
  title: string;
  lead?: string;
}) {
  return (
    <header className="mb-5 border-b border-border/90 pb-4">
      <h1 className="font-display text-xl font-semibold text-foreground sm:text-2xl">{title}</h1>
      {lead ? <p className="mt-1.5 max-w-2xl text-sm text-foreground/65">{lead}</p> : null}
    </header>
  );
}
