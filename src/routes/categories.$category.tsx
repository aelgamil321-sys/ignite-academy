import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  BookOpen, Video, FileText, Newspaper, ArrowRight, Play, Download,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";
import { useI18n } from "@/lib/i18n";
import { SUBJECT_CATEGORIES, type SubjectCategory } from "@/lib/categories";
import { useContentByCategory } from "@/lib/cms";
import { gradeDisplayName } from "@/lib/grade-utils";

export const Route = createFileRoute("/categories/$category")({
  loader: ({ params }) => {
    const cat = SUBJECT_CATEGORIES.find((c) => c.slug === params.category);
    if (!cat) throw notFound();
    return { category: cat };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.category.name.en ?? "Category"} — Ignite Islamic Academy` },
      { name: "description", content: loaderData?.category.desc.en ?? "" },
    ],
  }),
  component: CategoryPage,
  notFoundComponent: () => <div className="container-page py-20">Category not found.</div>,
});

function CategoryPage() {
  const { category } = Route.useLoaderData();
  const { lang, dir, tr } = useI18n();
  const { lessons, videos, files, articles } = useContentByCategory(category.slug as SubjectCategory);

  const hasContent = lessons.length + videos.length + files.length + articles.length > 0;

  return (
    <PageShell
      eyebrow={tr("cat_eyebrow")}
      title={category.name[locale]}
      lead={category.desc[locale]}
      crumbs={[{ label: tr("nav_home"), to: "/" }, { label: category.name[locale] }]}
    >
      {!hasContent ? (
        <EmptyState
          icon={BookOpen}
          title={lang === "ar" ? "لا يوجد محتوى بعد" : "No content yet"}
          description={lang === "ar"
            ? "سيظهر المحتوى هنا فور إضافته من لوحة الإدارة."
            : "Content will appear here once added from the Admin dashboard."}
        />
      ) : (
        <div className="space-y-12">
          {lessons.length > 0 && (
            <Section title={lang === "ar" ? "الدروس" : "Lessons"} icon={BookOpen}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {lessons.map((l) => (
                  <Link
                    key={l.id}
                    to="/grades/$grade/$lesson"
                    params={{ grade: l.grade, lesson: l.id }}
                    className="group rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors"
                  >
                    <div className="text-xs text-primary font-semibold uppercase tracking-wider">
                      {gradeDisplayName(l.grade, lang)}
                    </div>
                    <h3 className="mt-1 font-display text-lg text-foreground">{l.title[locale]}</h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{l.outcome[locale]}</p>
                    <div className="mt-3 inline-flex items-center gap-1 text-sm text-primary group-hover:text-primary">
                      {tr("open")} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {videos.length > 0 && (
            <Section title={lang === "ar" ? "الفيديوهات" : "Videos"} icon={Video}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {videos.map((v) => (
                  <Link
                    key={v.id}
                    to="/videos/$slug"
                    params={{ slug: v.id }}
                    className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary transition-colors"
                  >
                    <div className="aspect-video bg-gradient-to-br from-brand-dark to-primary grid place-content-center text-primary-foreground relative">
                      {v.thumbnailUrl ? (
                        <img src={v.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : null}
                      <Play className="h-10 w-10 relative" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-display text-lg text-foreground">{v.title[locale]}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{v.description[locale]}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {files.length > 0 && (
            <Section title={lang === "ar" ? "الملفات" : "Files"} icon={FileText}>
              <div className="grid gap-3 md:grid-cols-2">
                {files.map((f) => (
                  <a
                    key={f.id}
                    href={f.fileUrl}
                    download={f.fileName}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary transition-colors"
                  >
                    <Download className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-primary truncate">{f.title[locale]}</div>
                      <div className="text-xs text-muted-foreground">{f.type.toUpperCase()} · {f.size}</div>
                    </div>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {articles.length > 0 && (
            <Section title={lang === "ar" ? "المقالات" : "Articles"} icon={Newspaper}>
              <div className="grid gap-4 md:grid-cols-2">
                {articles.map((a) => (
                  <Link
                    key={a.id}
                    to={a.category === "announcement" ? "/announcements/$slug" : "/parent/$slug"}
                    params={{ slug: a.id }}
                    className="rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors"
                  >
                    <h3 className="font-display text-lg text-foreground">{a.title[locale]}</h3>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{a.content[locale]}</p>
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </PageShell>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof BookOpen; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl text-foreground mb-5 inline-flex items-center gap-2">
        <Icon className="h-6 w-6 text-primary" /> {title}
      </h2>
      {children}
    </section>
  );
}
