import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { Mail, Phone, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Ignite Islamic Academy" },
      { name: "description", content: "Get in touch with Ignite Islamic Academy — questions, enrollment, partnerships and feedback from students, parents and educators." },
      { property: "og:title", content: "Contact — Ignite Islamic Academy" },
      { property: "og:description", content: "Reach the Ignite Islamic Academy team for enrollment, partnerships and support." },
      { property: "og:url", content: "https://ignite-faith-learn.lovable.app/contact" },
    ],
    links: [{ rel: "canonical", href: "https://ignite-faith-learn.lovable.app/contact" }],
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
      <div className="grid gap-10 lg:grid-cols-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.success(tr("send") + " ✓");
            setForm({ name: "", email: "", message: "" });
          }}
          className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)] space-y-4"
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

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Mail className="h-5 w-5" /></div>
            <div><div className="text-sm text-muted-foreground">Email</div><div className="font-medium">hello@igniteislamic.academy</div></div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Phone className="h-5 w-5" /></div>
            <div><div className="text-sm text-muted-foreground">Phone</div><div className="font-medium">+1 (555) 010-2030</div></div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><MapPin className="h-5 w-5" /></div>
            <div><div className="text-sm text-muted-foreground">Location</div><div className="font-medium">{tr("ft_online")}</div></div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
