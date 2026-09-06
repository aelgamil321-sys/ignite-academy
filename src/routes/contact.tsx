import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { toast } from "sonner";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  head: () =>
    publicPageHead({
      title: "Contact — Ignite Islamic Academy",
      description:
        "Contact Ignite Islamic Academy at Ignite School in Dubai, UAE — questions about Islamic education, enrollment, and partnerships.",
      path: "/contact",
      ogTitle: "Contact — Ignite Islamic Academy",
      ogDescription: "Reach Ignite Islamic Academy for enrollment, partnerships, and support.",
    }),
  component: ContactPage,
});

function ContactPage() {
  const { tr } = useI18n();
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  return (
    <PageShell
      eyebrow={tr("nav_contact")}
      title={tr("contact_title")}
      lead={tr("contact_lead")}
      crumbs={[{ label: tr("nav_contact") }]}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          toast.success(tr("send") + " ✓");
          setForm({ name: "", email: "", message: "" });
        }}
        className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)] space-y-4"
      >
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={tr("your_name")}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm"
        />
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder={tr("your_email")}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm"
        />
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder={tr("your_message")}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm"
        />
        <button className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors">
          {tr("send")}
        </button>
      </form>
    </PageShell>
  );
}
