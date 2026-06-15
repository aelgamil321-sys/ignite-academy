import { Link } from "@tanstack/react-router";
import { BookOpen, Mail, MapPin, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAccountRole } from "@/hooks/use-account-role";

export function SiteFooter() {
  const { tr, locale } = useI18n();
  const { isParent } = useAccountRole();

  const learn: Array<{ label: string; to: string }> = isParent
    ? []
    : [
        { label: tr("stage_kg"), to: "/grades" },
        { label: tr("stage_elem"), to: "/grades" },
        { label: tr("stage_mid"), to: "/grades" },
        { label: tr("stage_high"), to: "/grades" },
      ];

  const explore: Array<{ label: string; to: string }> = isParent
    ? [
        { label: tr("nav_parent"), to: "/parent" },
        { label: tr("parent_dashboard_title"), to: "/parent/dashboard" },
        { label: tr("nav_announcements"), to: "/announcements" },
        { label: tr("nav_hall_of_fame"), to: "/hall-of-fame" },
        { label: tr("admin_title"), to: "/admin" },
      ]
    : [
        { label: tr("nav_resources"), to: "/resources" },
        { label: tr("nav_videos"), to: "/videos" },
        { label: tr("nav_quizzes"), to: "/quizzes" },
        { label: tr("nav_assignments"), to: "/assignments" },
        { label: tr("nav_hall_of_fame"), to: "/hall-of-fame" },
        { label: tr("nav_parent"), to: "/parent" },
        { label: tr("nav_announcements"), to: "/announcements" },
        { label: tr("admin_title"), to: "/admin" },
      ];

  return (
    <footer className="mt-24 border-t border-brand-dark/20 bg-brand-dark text-brand-dark-foreground">
      <div className="container-page py-16 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-lg">{tr("brand_name")}</div>
              <div className="text-[11px] uppercase tracking-[0.18em] opacity-70">{tr("brand_org")}</div>
            </div>
          </div>
          <p className="mt-4 text-sm opacity-80 leading-relaxed">{tr("ft_desc")}</p>
        </div>

        {!isParent && (
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary mb-4">{tr("ft_learn")}</h4>
            <ul className="space-y-2 text-sm opacity-85">
              {learn.map((l, i) => (
                <li key={i}><Link to={l.to} className="transition-colors hover:text-primary">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        )}

        <div className={isParent ? "md:col-start-2" : ""}>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-primary mb-4">{tr("ft_explore")}</h4>
          <ul className="space-y-2 text-sm opacity-85">
            {explore.map((l, i) => (
              <li key={i}><Link to={l.to} className="transition-colors hover:text-primary">{l.label}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-primary mb-4">{tr("ft_contact")}</h4>
          <ul className="space-y-3 text-sm opacity-85">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello@igniteislamic.academy</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> +1 (555) 010-2030</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {tr("ft_online")}</li>
            <li><Link to="/contact" className="underline hover:text-primary">{tr("nav_contact")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page py-5 text-xs opacity-70 flex flex-col md:flex-row gap-2 justify-between">
          <span>© {new Date().getFullYear()} {tr("brand_name")}. {tr("ft_rights")}</span>
          <span>{tr("ft_built")}</span>
        </div>
      </div>
    </footer>
  );
}
