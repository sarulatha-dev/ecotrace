import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Leaf, LayoutDashboard, PlusCircle, ScanLine, CreditCard,
  Home, Coins, TrendingDown, Target, BarChart3, Trophy,
  Sparkles, FileText, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen,
  Activity, Wrench, Star, User2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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

// ── Nav Item (simple, no group) ───────────────────────────────────────────────
function NavItem({
  href, label, icon: Icon, active, collapsed, badge,
}: {
  href: string; label: string; icon: React.ElementType; active: boolean; collapsed: boolean; badge?: string;
}) {
  const inner = (
    <Link
      href={href}
      className={cn(
        "nav-glow group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full",
        active
          ? "nav-active bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        collapsed && "justify-center px-0"
      )}
    >
      <Icon className={cn("shrink-0 transition-transform duration-200 group-hover:scale-110", collapsed ? "h-5 w-5" : "h-4 w-4")} />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && badge && (
        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{badge}</span>
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
  icon: React.ElementType;
  items: { href: string; label: string; icon: React.ElementType }[];
  collapsed: boolean;
  currentPath: string;
}) {
  const hasActive = items.some((i) => i.href === currentPath);
  const [open, setOpen] = useState(hasActive);

  // Open group if child becomes active
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
          "flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-semibold tracking-widest uppercase transition-colors duration-150",
          hasActive ? "text-primary" : "text-muted-foreground/60 hover:text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-2">
          <GroupIcon className="h-3.5 w-3.5" />
          {label}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-3.5 w-3.5" />
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
            <div className="mt-0.5 pl-2 border-l-2 border-border/60 ml-3 space-y-0.5 pb-1">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "nav-glow flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 w-full",
                    currentPath === item.href
                      ? "nav-active bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
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

  const topLevel = [
    { href: "/dashboard", label: "Dashboard",   icon: LayoutDashboard },
    { href: "/challenges", label: "Challenges",  icon: Target,         badge: "CTA" },
    { href: "/insights",   label: "Insights",    icon: BarChart3 },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  const groups = [
    {
      key: "activity",
      label: "Activity",
      icon: Activity,
      items: [
        { href: "/log",  label: "Log Activity", icon: PlusCircle },
        { href: "/scan", label: "Photo Scan",   icon: ScanLine },
        { href: "/bank", label: "Bank Import",  icon: CreditCard },
      ],
    },
    {
      key: "smart",
      label: "Smart Tools",
      icon: Wrench,
      items: [
        { href: "/smart-home",     label: "Smart Home",     icon: Home },
        { href: "/bill-optimizer", label: "Bill Optimizer", icon: TrendingDown },
      ],
    },
    {
      key: "rewards",
      label: "Rewards",
      icon: Star,
      items: [
        { href: "/rewards", label: "Eco Rewards", icon: Coins },
      ],
    },
    {
      key: "myspace",
      label: "My Space",
      icon: User2,
      items: [
        { href: "/coach",  label: "AI Coach",  icon: Sparkles },
        { href: "/report", label: "My Report", icon: FileText },
      ],
    },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 gap-0.5">
      {/* Top-level items */}
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

      {/* Grouped sections */}
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b flex items-center px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <Leaf className="h-6 w-6" />
          <span className="font-bold text-lg tracking-tight">EcoTrace</span>
        </Link>
      </header>

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="hidden md:flex flex-col border-r bg-card min-h-screen sticky top-0 overflow-hidden"
      >
        {/* Logo + collapse toggle */}
        <div className={cn(
          "flex items-center border-b border-border/50 h-16 shrink-0 px-4",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 text-primary">
              <Leaf className="h-6 w-6" />
              <span className="font-bold text-lg tracking-tight">EcoTrace</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/" className="text-primary">
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

        {/* Bottom eco card — only when expanded */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="p-4 shrink-0"
            >
              <div className="p-3 rounded-xl bg-primary/8 border border-primary/15">
                <div className="flex items-center gap-2 mb-1">
                  <Leaf className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">Make an Impact</span>
                </div>
                <p className="text-xs text-muted-foreground">Every small action counts towards a greener future.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto min-h-[100dvh]">
        {children}
      </main>

      {/* Mobile bottom nav — show only top-level + key items */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t flex items-center justify-around px-1 py-1 pb-safe">
        {[
          { href: "/dashboard",  icon: LayoutDashboard, label: "Home" },
          { href: "/log",        icon: PlusCircle,      label: "Log" },
          { href: "/smart-home", icon: Home,            label: "Smart" },
          { href: "/insights",   icon: BarChart3,       label: "Insights" },
          { href: "/rewards",    icon: Coins,           label: "Rewards" },
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
