export function StudentWorkspacePageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
}) {
  return (
    <header className="mb-6 border-b border-border pb-5">
      {eyebrow ? (
        <div className="mb-2 text-xs uppercase tracking-[0.22em] text-primary">{eyebrow}</div>
      ) : null}
      <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
      {lead ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{lead}</p> : null}
    </header>
  );
}
