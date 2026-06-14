import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const fabInset = "max(1rem, env(safe-area-inset-bottom, 0px))";
const panelBottom = "max(5.5rem, calc(env(safe-area-inset-bottom, 0px) + 4.5rem))";

export function AskMrAhmed() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { tr, dir } = useI18n();

  useEffect(() => {
    setMounted(true);
  }, []);

  const sideStyle =
    dir === "rtl"
      ? {
          left: "max(1rem, env(safe-area-inset-left, 0px))",
          right: "auto",
        }
      : {
          right: "max(1rem, env(safe-area-inset-right, 0px))",
          left: "auto",
        };

  if (!mounted) return null;

  return createPortal(
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={tr("ask_label")}
        style={{ bottom: fabInset, ...sideStyle }}
        className="fixed z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full bg-gradient-to-br from-brand-dark to-primary px-4 py-3 text-primary-foreground shadow-[var(--shadow-elegant)] hover:scale-105 transition-transform sm:px-5 sm:py-3.5"
      >
        <MessageCircle className="h-5 w-5 shrink-0" />
        <span className="hidden sm:inline font-semibold text-sm">{tr("ask_label")}</span>
      </button>

      {open && (
        <div
          style={{ bottom: panelBottom, ...sideStyle }}
          className="fixed z-50 w-[min(24rem,calc(100vw-2rem))] rounded-2xl bg-card border border-border shadow-[var(--shadow-elegant)] overflow-hidden"
        >
          <div className="bg-gradient-to-br from-brand-dark to-primary p-4 text-primary-foreground flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-gold flex items-center justify-center text-gold-foreground shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">{tr("ask_label")}</div>
                <div className="text-xs opacity-80 truncate">{tr("ask_sub")}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="hover:opacity-80 shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-4 space-y-3 h-72 overflow-y-auto bg-cream">
            <div className="bg-card rounded-2xl rounded-tl-sm p-3 text-sm max-w-[85%] shadow-sm">
              {tr("ask_greet")}
            </div>
          </div>
          <div className="border-t border-border p-3 flex items-center gap-2">
            <input
              placeholder={tr("ask_placeholder")}
              className="flex-1 min-w-0 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-hover transition-colors shrink-0">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
