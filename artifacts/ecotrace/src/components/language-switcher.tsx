import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Globe2 } from "lucide-react";

const LANGS = [
  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
  { code: "ta", label: "Tamil",   native: "தமிழ்",   flag: "🇮🇳" },
  { code: "hi", label: "Hindi",   native: "हिन्दी",  flag: "🇮🇳" },
];

const FONT_MAP: Record<string, string> = {
  ta: "'Noto Sans Tamil', sans-serif",
  hi: "'Noto Sans Devanagari', sans-serif",
  en: "'Inter', sans-serif",
};

export default function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const current = LANGS.find((l) => l.code === i18n.language) ?? LANGS[0];

  const switchTo = (code: string) => {
    i18n.changeLanguage(code);
    // Update body font for script support
    document.body.style.fontFamily = FONT_MAP[code] ?? FONT_MAP.en;
    setOpen(false);
  };

  return (
    <div className="relative" data-cursor="pointer">
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border backdrop-blur-sm transition-colors ${
          dark
            ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
            : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
        }`}
      >
        <Globe2 className="h-3.5 w-3.5" />
        <span>{current.flag} {current.native}</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -8 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="absolute right-0 top-full mt-2 w-44 rounded-xl overflow-hidden z-50"
              style={{
                background: "rgba(10,20,24,0.92)",
                border: "1px solid rgba(16,185,129,0.25)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(16,185,129,0.1)",
              }}
            >
              {LANGS.map((lang) => {
                const active = lang.code === i18n.language;
                return (
                  <motion.button
                    key={lang.code}
                    whileHover={{ backgroundColor: "rgba(16,185,129,0.12)" }}
                    onClick={() => switchTo(lang.code)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      active ? "text-emerald-400" : "text-white/80"
                    }`}
                  >
                    <span className="text-base">{lang.flag}</span>
                    <div>
                      <p className="text-sm font-semibold leading-none mb-0.5">{lang.native}</p>
                      <p className="text-[10px] text-white/40">{lang.label}</p>
                    </div>
                    {active && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
