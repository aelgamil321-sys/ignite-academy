import { useState } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function AskMrAhmed() {
  const [open, setOpen] = useState(false);
  const { tr, dir } = useI18n();
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={tr("ask_label")}
        className={`fixed bottom-6 ${dir === "rtl" ? "left-6" : "right-6"} z-50 flex items-center gap-2 rounded-full bg-gradient-to-br from-brand-dark to-primary px-5 py-3.5 text-primary-foreground shadow-[var(--shadow-elegant)] hover:scale-105 transition-transform`}
      >
        <MessageCircle className="h-5 w-5" />
        <span className="hidden sm:inline font-semibold text-sm">{tr("ask_label")}</span>
      </button>

      {open && (
        <div className={`fixed bottom-24 ${dir === "rtl" ? "left-6" : "right-6"} z-50 w-[calc(100vw-3rem)] sm:w-96 rounded-2xl bg-card border border-border shadow-[var(--shadow-elegant)] overflow-hidden`}>
          <div className="bg-gradient-to-br from-brand-dark to-primary p-4 text-primary-foreground flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gold flex items-center justify-center text-gold-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">{tr("ask_label")}</div>
                <div className="text-xs opacity-80">{tr("ask_sub")}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="hover:opacity-80">
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
              className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-hover transition-colors">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
