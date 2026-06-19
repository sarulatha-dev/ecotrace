import { Link } from "wouter";
import { Leaf, BarChart3, Target, Sparkles, ArrowRight, Globe, CreditCard, Flame, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: BarChart3,
    title: "Track Every Activity",
    description: "Log transport, energy, food and shopping. See your CO₂ footprint build in real time with beautiful charts.",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: CreditCard,
    title: "Auto-Import Transactions",
    description: "Connect your bank account and we automatically detect carbon-emitting purchases and import them as activities.",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: Target,
    title: "Set Daily Goals",
    description: "Define a daily CO₂ budget. A live progress bar shows how close you are to your limit throughout the day.",
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Coaching",
    description: "Get personalized, actionable tips from your AI sustainability coach based on your real carbon data.",
    color: "bg-purple-500/10 text-purple-600",
  },
];

const steps = [
  { number: "01", title: "Log or Import", body: "Add activities manually or connect your bank to auto-detect purchases." },
  { number: "02", title: "Analyze Patterns", body: "See breakdowns, heatmaps, and trends across your full history." },
  { number: "03", title: "Take Action", body: "Join challenges, set goals, and let your AI coach guide reductions." },
];

const stats = [
  { value: "4.7t", label: "Average annual footprint" },
  { value: "40%", label: "Reduction possible with tracking" },
  { value: "2°C", label: "Target we're working toward" },
];

export default function Landing() {
  const fade = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
  const container = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border/40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <Leaf className="h-6 w-6" />
            EcoTrace
          </div>
          <Link href="/dashboard">
            <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5">
              Open App <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_60%_50%,rgba(255,255,255,0.3),transparent_70%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

        <motion.div
          className="max-w-5xl mx-auto px-6 py-24 md:py-36 text-center"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fade} className="inline-flex items-center gap-2 text-emerald-300 text-sm font-medium bg-emerald-400/10 border border-emerald-400/20 rounded-full px-4 py-1.5 mb-8">
            <Flame className="h-3.5 w-3.5" /> Streak tracking, AI coaching, bank import — all in one place
          </motion.div>
          <motion.h1 variants={fade} className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6">
            Track Your Carbon.
            <br />
            <span className="text-emerald-300">Change Your World.</span>
          </motion.h1>
          <motion.p variants={fade} className="text-emerald-100/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            EcoTrace turns your daily habits into measurable climate action. Connect your bank, log activities, and watch your footprint shrink — day by day.
          </motion.p>
          <motion.div variants={fade} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold px-8 gap-2 shadow-xl shadow-emerald-900/40">
                Start Tracking Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/bank">
              <Button size="lg" variant="outline" className="border-emerald-400/40 text-emerald-100 hover:bg-emerald-800/50 bg-transparent px-8 gap-2">
                <CreditCard className="h-4 w-4" /> Connect Bank
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="bg-emerald-50 dark:bg-emerald-950/20 border-y border-emerald-100 dark:border-emerald-900/40">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-3 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-3xl md:text-4xl font-extrabold text-emerald-700 dark:text-emerald-400">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Everything you need to go green</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">From first log to lasting habits — EcoTrace covers the whole journey.</p>
        </div>
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={fade}>
              <div className="h-full rounded-2xl border border-border/60 bg-card p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.color}`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 border-y border-border/40 py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">How it works</h2>
            <p className="text-muted-foreground text-lg">Three simple steps to a smaller footprint.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="text-5xl font-black text-emerald-200 dark:text-emerald-900 mb-4">{s.number}</div>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why section */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-700 text-white p-10 md:p-14 flex flex-col md:flex-row gap-10 items-center shadow-xl">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-4 leading-tight">The planet can't wait. Start today.</h2>
            <p className="text-emerald-100/80 mb-6 leading-relaxed">
              No sign-up required. Your data lives in your session — private, fast, and always yours. 
              Every log is a step toward a measurable impact.
            </p>
            <ul className="space-y-2.5">
              {["No account required", "Real CO₂ factors from IPCC data", "Bank import with automatic CO₂ mapping", "AI coach powered by xAI Grok"].map((t) => (
                <li key={t} className="flex items-center gap-2.5 text-sm text-emerald-50">
                  <CheckCircle className="h-4 w-4 text-emerald-300 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="shrink-0 flex flex-col gap-3">
            <Link href="/dashboard">
              <Button size="lg" className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold px-10 w-full gap-2 shadow-lg">
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/bank">
              <Button size="lg" variant="outline" className="border-emerald-300/50 text-white hover:bg-emerald-600/50 bg-transparent w-full gap-2">
                <CreditCard className="h-4 w-4" /> Connect Bank
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Leaf className="h-4 w-4 text-emerald-600" />
          <span className="font-semibold text-foreground">EcoTrace</span>
        </div>
        <p>Built to help you understand and reduce your carbon footprint.</p>
        <div className="flex justify-center gap-6 mt-4">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <Link href="/insights" className="hover:text-foreground transition-colors">Insights</Link>
          <Link href="/challenges" className="hover:text-foreground transition-colors">Challenges</Link>
          <Link href="/coach" className="hover:text-foreground transition-colors">AI Coach</Link>
        </div>
      </footer>
    </div>
  );
}
