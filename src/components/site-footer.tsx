import { Link } from "@tanstack/react-router";
import { BookOpen, Mail, MapPin, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { tr } = useI18n();
  const learn: Array<{ label: string; to: string }> = [
    { label: tr("stage_kg"), to: "/grades" },
    { label: tr("stage_elem"), to: "/grades" },
    { label: tr("stage_mid"), to: "/grades" },
    { label: tr("stage_high"), to: "/grades" },
  ];
  const explore: Array<{ label: string; to: string }> = [
    { label: tr("nav_resources"), to: "/resources" },
    { label: tr("nav_videos"), to: "/videos" },
    { label: tr("nav_quizzes"), to: "/quizzes" },
    { label: tr("nav_parent"), to: "/parent" },
    { label: tr("nav_announcements"), to: "/announcements" },
    { label: tr("admin_title"), to: "/admin" },
  ];
  return (
    <footer className="mt-24 border-t border-border bg-primary text-primary-foreground">
      <div className="container-page py-16 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold text-gold-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-lg">{tr("brand_name")}</div>
              <div className="text-[11px] uppercase tracking-[0.18em] opacity-70">{tr("brand_sub")}</div>
            </div>
          </div>
          <p className="mt-4 text-sm opacity-80 leading-relaxed">{tr("ft_desc")}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-gold mb-4">{tr("ft_learn")}</h4>
          <ul className="space-y-2 text-sm opacity-85">
            {learn.map((l, i) => (
              <li key={i}><Link to={l.to} className="hover:text-gold transition-colors">{l.label}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-gold mb-4">{tr("ft_explore")}</h4>
          <ul className="space-y-2 text-sm opacity-85">
            {explore.map((l, i) => (
              <li key={i}><Link to={l.to} className="hover:text-gold transition-colors">{l.label}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-gold mb-4">{tr("ft_contact")}</h4>
          <ul className="space-y-3 text-sm opacity-85">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello@igniteislamic.academy</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> +1 (555) 010-2030</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {tr("ft_online")}</li>
            <li><Link to="/contact" className="underline hover:text-gold">{tr("nav_contact")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page py-5 text-xs opacity-70 flex flex-col md:flex-row gap-2 justify-between">
          <span>© {new Date().getFullYear()} {tr("brand_name")} {tr("brand_sub")}. {tr("ft_rights")}</span>
          <span>{tr("ft_built")}</span>
        </div>
      </div>
    </footer>
  );
}
