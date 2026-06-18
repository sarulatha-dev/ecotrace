import { Link, useLocation } from "wouter";
import { Leaf, PlusCircle, LayoutDashboard, Target, BarChart3, Trophy, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/log", label: "Log Activity", icon: PlusCircle },
  { href: "/challenges", label: "Challenges", icon: Target },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/coach", label: "AI Coach", icon: Sparkles },
  { href: "/report", label: "My Report", icon: FileText },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b flex items-center px-4 py-3 justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <Leaf className="h-6 w-6" />
          <span className="font-bold text-lg tracking-tight">EcoTrace</span>
        </Link>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card min-h-screen sticky top-0">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2 text-primary">
            <Leaf className="h-8 w-8" />
            <span className="font-bold text-xl tracking-tight">EcoTrace</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto">
          <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
            <h4 className="font-semibold text-accent-foreground text-sm mb-1">Make an Impact</h4>
            <p className="text-xs text-muted-foreground">Every small action counts towards a greener future.</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto min-h-[100dvh]">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t flex items-center justify-around px-2 py-2 pb-safe">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-lg transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-6 w-6", isActive && "fill-primary/20")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
