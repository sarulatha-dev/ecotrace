import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Leaf, LayoutDashboard, PlusCircle, ScanLine, CreditCard,
  Home, Coins, TrendingDown, Target, BarChart3, Trophy,
  Sparkles, FileText, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen,
  Activity, Wrench, Star, User2, TreePine
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./language-switcher";

// ── Tooltip for collapsed mode ───────────────────────────────────────────────
function SidebarTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none"
          >
            <div className="bg-foreground text-background text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
              {label}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-foreground" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({
  href, label, icon: Icon, active, collapsed, badge,
}: {
  href: string; label: string; icon: any; active: boolean; collapsed: boolean; badge?: string;
}) {
  const inner = (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 w-full relative",
        active
          ? "bg-[#DCFCE7] text-[#15803D] font-semibold border-l-[3px] border-[#22C55E] pl-[calc(0.75rem-3px)]"
          : "text-[#6B7280] hover:text-[#1F2937] hover:bg-[rgba(0,0,0,0.04)]",
        collapsed && "justify-center px-0 border-l-0 pl-0"
      )}
    >
      <Icon className={cn("shrink-0 transition-transform duration-200 group-hover:scale-110", collapsed ? "h-5 w-5" : "h-4 w-4", active ? "text-[#16A34A]" : "")} />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && badge && (
        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#16A34A]/10 text-[#16A34A]">{badge}</span>
      )}
    </Link>
  );

  return collapsed ? <SidebarTooltip label={label}>{inner}</SidebarTooltip> : inner;
}

// ── Collapsible Group ─────────────────────────────────────────────────────────
function NavGroup({
  label, icon: GroupIcon, items, collapsed, currentPath,
}: {
  label: string;
  icon: any;
  items: { href: string; label: string; icon: any }[];
  collapsed: boolean;
  currentPath: string;
}) {
  const hasActive = items.some((i) => i.href === currentPath);
  const [open, setOpen] = useState(hasActive);

  useEffect(() => { if (hasActive) setOpen(true); }, [hasActive]);

  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={currentPath === item.href}
            collapsed
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-widest uppercase transition-colors duration-150",
          hasActive ? "text-[#16A34A]" : "text-[#9CA3AF] hover:text-[#6B7280]"
        )}
      >
        <div className="flex items-center gap-2">
          <GroupIcon className="h-3 w-3" />
          {label}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-3 w-3" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="mt-0.5 pl-1 space-y-0.5 pb-1">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 w-full relative",
                    currentPath === item.href
                      ? "bg-[#DCFCE7] text-[#15803D] font-semibold border-l-[3px] border-[#22C55E] pl-[calc(0.75rem-3px)]"
                      : "text-[#6B7280] hover:text-[#1F2937] hover:bg-[rgba(0,0,0,0.04)]"
                  )}
                >
                  <item.icon className={cn("h-3.5 w-3.5 shrink-0", currentPath === item.href ? "text-[#16A34A]" : "")} />
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sidebar Divider ───────────────────────────────────────────────────────────
function Divider({ collapsed }: { collapsed: boolean }) {
  return <div className={cn("border-t border-border/50 my-2", collapsed && "mx-2")} />;
}

// ── Sidebar content ───────────────────────────────────────────────────────────
function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const [location] = useLocation();
  const { t } = useTranslation();

  const topLevel = [
    { href: "/dashboard",  label: t("nav.dashboard"),   icon: LayoutDashboard },
    { href: "/challenges", label: t("nav.challenges"),  icon: Target,         badge: "CTA" },
    { href: "/insights",   label: t("nav.insights"),    icon: BarChart3 },
    { href: "/leaderboard",label: t("nav.leaderboard"), icon: Trophy },
  ];

  const groups = [
    {
      key: "activity",
      label: t("nav.activity"),
      icon: Activity,
      items: [
        { href: "/log",  label: t("nav.log"),  icon: PlusCircle },
        { href: "/scan", label: t("nav.scan"), icon: ScanLine },
        { href: "/bank", label: t("nav.bank"), icon: CreditCard },
      ],
    },
    {
      key: "smart",
      label: t("nav.smartTools"),
      icon: Wrench,
      items: [
        { href: "/smart-home",     label: t("nav.smartHome"),     icon: Home },
        { href: "/bill-optimizer", label: t("nav.billOptimizer"), icon: TrendingDown },
      ],
    },
    {
      key: "rewards",
      label: t("nav.rewards"),
      icon: Star,
      items: [
        { href: "/rewards",       label: t("nav.ecoRewards"),  icon: Coins    },
        { href: "/passive-plant", label: t("nav.passivePlant"), icon: TreePine },
      ],
    },
    {
      key: "myspace",
      label: t("nav.mySpace"),
      icon: User2,
      items: [
        { href: "/coach",  label: t("nav.aiCoach"),  icon: Sparkles },
        { href: "/report", label: t("nav.myReport"), icon: FileText },
      ],
    },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 gap-0.5">
      {topLevel.map((item) => (
        <NavItem
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          active={location === item.href}
          collapsed={collapsed}
          badge={item.badge}
        />
      ))}

      <Divider collapsed={collapsed} />

      <div className="space-y-0.5">
        {groups.map((group) => (
          <NavGroup
            key={group.key}
            label={group.label}
            icon={group.icon}
            items={group.items}
            collapsed={collapsed}
            currentPath={location}
          />
        ))}
      </div>
    </div>
  );
}

// ── Full Layout ───────────────────────────────────────────────────────────────
export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useTranslation();
  const isDarkPage = false;

  const stars = useMemo(() =>
    Array.from({ length: 120 }).map((_, i) => ({
      id: i,
      w: Math.random() * 2.2 + 0.4,
      top: Math.random() * 100,
      left: Math.random() * 100,
      op: Math.random() * 0.7 + 0.15,
      dur: 2 + Math.random() * 3,
      delay: Math.random() * 5,
    })), []);

  return (
    <div className={cn(
      "min-h-screen flex flex-col md:flex-row transition-colors duration-300",
      isDarkPage ? "dark bg-[#020c12] text-white" : "bg-background text-foreground"
    )}>
      {/* Mobile Header */}
      <header className={cn(
        "md:hidden sticky top-0 z-50 backdrop-blur-md flex items-center justify-between px-4 py-3 transition-colors duration-300",
        isDarkPage ? "bg-[#020c12]/90 border-b border-emerald-950/40 text-white" : "bg-background/90 border-b text-foreground"
      )}>
        <Link href="/" className={cn("flex items-center gap-2", isDarkPage ? "text-emerald-400" : "text-primary")}>
          <Leaf className="h-6 w-6" />
          <span className="font-bold text-lg tracking-tight">EcoTrace</span>
        </Link>
        <LanguageSwitcher dark={isDarkPage} />
      </header>

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className={cn(
          "hidden md:flex flex-col border-r min-h-screen sticky top-0 overflow-hidden transition-colors duration-300",
          isDarkPage ? "bg-[#040e12] border-emerald-950/40" : "bg-card border-border/50"
        )}
      >
        {/* Logo + collapse toggle */}
        <div className={cn(
          "flex items-center border-b border-border/50 h-16 shrink-0 px-4",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <Link href="/" className={cn("flex items-center gap-2", isDarkPage ? "text-emerald-400" : "text-primary")}>
              <Leaf className="h-6 w-6" />
              <span className="font-bold text-lg tracking-tight">EcoTrace</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/" className={isDarkPage ? "text-emerald-400" : "text-primary"}>
              <Leaf className="h-6 w-6" />
            </Link>
          )}
          <button
            onClick={() => setCollapsed((p) => !p)}
            className={cn(
              "text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary",
              collapsed && "mt-0"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <SidebarContent collapsed={collapsed} />

        {/* Bottom eco card */}
        <div className="p-4 shrink-0 flex flex-col gap-2 border-t border-[#E5E7EB]">
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="pt-2"
              >
                <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">🌱</span>
                    <span className="text-xs font-semibold text-[#15803D]">{t("sidebar.makeImpact")}</span>
                  </div>
                  <p className="text-xs text-[#6B7280] leading-relaxed">{t("sidebar.impactText")}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto min-h-[100dvh] relative">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-end px-6 py-3 border-b border-border/40 bg-card/45 backdrop-blur-md sticky top-0 z-40 h-16 shrink-0">
          <LanguageSwitcher dark={isDarkPage} />
        </header>
        {isDarkPage && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-[#020c12]"
            style={{
              background: "radial-gradient(ellipse 110% 110% at 55% 52%, #03141b 0%, #020c12 100%)"
            }}>
            {stars.map((s) => (
              <div key={s.id} className="absolute rounded-full bg-white"
                style={{
                  width: s.w,
                  height: s.w,
                  top: s.top + "%",
                  left: s.left + "%",
                  opacity: s.op,
                  animation: `eco-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`
                }}
              />
            ))}
            {/* Glowing atmospheric green overlays */}
            <div className="absolute inset-0"
              style={{ background: "radial-gradient(circle at 50% 50%, rgba(16,185,129,0.08) 0%, transparent 80%)" }} />
          </div>
        )}
        <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t flex items-center justify-around px-1 py-1 pb-safe">
        {[
          { href: "/dashboard",  icon: LayoutDashboard, label: t("nav.home") },
          { href: "/log",        icon: PlusCircle,      label: t("nav.log_short") },
          { href: "/smart-home", icon: Home,            label: t("nav.smart") },
          { href: "/insights",   icon: BarChart3,       label: t("nav.insights_short") },
          { href: "/rewards",    icon: Coins,           label: t("nav.rewards_short") },
        ].map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 p-2 min-w-[52px] rounded-xl transition-all duration-200",
                isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
