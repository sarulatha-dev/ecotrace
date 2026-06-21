import { useState, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { useSessionId } from "@/hooks/use-session";
import {
  useGetActivitySummary, getGetActivitySummaryQueryKey,
  useListActivities, getListActivitiesQueryKey,
  useGetActivityStreak,
  useListChallenges, getListChallengesQueryKey,
  useListChallengeCompletions, getListChallengeCompletionsQueryKey,
  useCompleteChallenge,
  useCreateActivity,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  X, Plus, Zap, Trophy, Flame, CheckCircle2, Circle,
  TreePine, Plane, Activity,
} from "lucide-react";
import { LivingForest } from "@/components/living-forest";

// ─── Carbon Level ────────────────────────────────────────────────────────────
type CarbonLevel = "low" | "medium" | "high";
type ModuleKey   = "carbon" | "energy" | "travel" | "ecoscore" | null;

const CARBON_COLORS: Record<CarbonLevel, string> = {
  low:    "#059669",
  medium: "#d97706",
  high:   "#dc2626",
};
const CARBON_LABELS: Record<CarbonLevel, string> = {
  low:    "LOW IMPACT",
  medium: "MODERATE",
  high:   "HIGH IMPACT",
};
function getCarbonLevel(kg: number): CarbonLevel {
  if (kg < 50)  return "low";
  if (kg < 150) return "medium";
  return "high";
}

// ─── Pop-out card ────────────────────────────────────────────────────────────
function FloatCard({
  children, className = "", onClick, color = "#059669", delay = 0,
}: {
  children: React.ReactNode; className?: string; onClick?: () => void;
  color?: string; delay?: number;
}) {
  return (
    <motion.div
      className={`bg-white rounded-2xl cursor-pointer select-none overflow-hidden ${className}`}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3.5 + delay * 0.4, repeat: Infinity, ease: "easeInOut", delay }}
      whileHover={{
        scale: 1.06,
        y: -10,
        boxShadow: "0 16px 40px rgba(0,0,0,0.14)",
        transition: { duration: 0.18, ease: "easeOut" },
      }}
      whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
      onClick={onClick}
      style={{
        border: "1px solid #e5e7eb",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Ring Progress ───────────────────────────────────────────────────────────
function RingProgress({
  value, max, color, size = 76, thick = 6,
}: { value: number; max: number; color: string; size?: number; thick?: number }) {
  const r    = (size - thick) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thick} />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={thick} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct) }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </svg>
  );
}

// ─── Earth mesh ───────────────────────────────────────────────────────────────
function Earth({ level }: { level: CarbonLevel }) {
  const earthRef = useRef<THREE.Mesh>(null!);
  const wireRef  = useRef<THREE.Mesh>(null!);
  const color    = CARBON_COLORS[level];

  useFrame((state, delta) => {
    earthRef.current.rotation.y += delta * 0.07;
    wireRef.current.rotation.y  += delta * 0.044;
    wireRef.current.rotation.x   = Math.sin(state.clock.elapsedTime * 0.35) * 0.04;
  });

  const c = new THREE.Color(color);
  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshPhongMaterial color="#0c3a20" emissive={c} emissiveIntensity={0.08} shininess={40} />
      </mesh>
      <mesh ref={wireRef} scale={1.004}>
        <sphereGeometry args={[1.5, 22, 22]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

function GlobeScene({ level }: { level: CarbonLevel }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 3, 5]} intensity={1.1} />
      <Suspense fallback={null}>
        <Earth level={level} />
      </Suspense>
      <OrbitControls
        enableZoom={false} enablePan={false} rotateSpeed={0.4}
        minPolarAngle={Math.PI * 0.2} maxPolarAngle={Math.PI * 0.8}
      />
    </Canvas>
  );
}

// ─── Modules ─────────────────────────────────────────────────────────────────
function CarbonTrackerCard({ totalCo2, dailyAverage, level, color, onClick }: {
  totalCo2: number; dailyAverage: number; level: CarbonLevel; color: string; onClick: () => void;
}) {
  return (
    <FloatCard color={color} delay={0} onClick={onClick} className="w-[195px]">
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Activity className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500">Carbon Tracker</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <RingProgress value={totalCo2} max={Math.max(totalCo2, 100)} color={color} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-bold text-gray-800 leading-none">{totalCo2.toFixed(0)}</span>
              <span className="text-[8px] text-gray-400 mt-0.5">kg</span>
            </div>
          </div>
          <div>
            <div className="text-[9px] text-gray-400 mb-0.5">7-day total</div>
            <div className="text-xl font-black leading-none" style={{ color }}>{totalCo2.toFixed(1)}</div>
            <div className="text-[8px] text-gray-400">kg CO₂</div>
            <div className="mt-1.5 text-[8px] font-bold tracking-widest" style={{ color }}>
              {CARBON_LABELS[level]}
            </div>
            <div className="text-[8px] text-gray-400 mt-0.5">avg {dailyAverage.toFixed(1)}/day</div>
          </div>
        </div>
      </div>
    </FloatCard>
  );
}

function EcoScoreCard({ score, streak, color, onClick }: {
  score: number; streak: number; color: string; onClick: () => void;
}) {
  return (
    <FloatCard color={color} delay={0.6} onClick={onClick} className="w-[155px]">
      <div className="p-4 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1.5">
          <Trophy className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500">Eco Score</span>
        </div>
        <motion.div
          className="text-5xl font-black leading-none"
          style={{ color }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", delay: 0.25, stiffness: 130 }}
        >
          {score}
        </motion.div>
        <div className="text-[9px] text-gray-400 mb-2">/ 100</div>
        <div className="flex items-center justify-center gap-1 text-[9px] mb-2">
          <Flame className="w-3 h-3 text-orange-400" />
          <span className="text-gray-500">{streak} day streak</span>
        </div>
        <div
          className="text-[8px] font-bold tracking-widest px-2 py-1 rounded-full inline-block"
          style={{ color, background: `${color}12`, border: `1px solid ${color}25` }}
        >
          {score >= 70 ? "ECO HERO 🌟" : score >= 40 ? "IMPROVING 🌱" : "NEEDS WORK ⚠️"}
        </div>
      </div>
    </FloatCard>
  );
}

function EnergyUsageCard({ activities, color, onClick }: {
  activities: { category: string; co2Amount: number }[]; color: string; onClick: () => void;
}) {
  const cats = [
    { cat: "transport", icon: "🚗" },
    { cat: "energy",    icon: "⚡" },
    { cat: "food",      icon: "🥩" },
    { cat: "shopping",  icon: "🛍️" },
  ];
  const totals  = cats.map(({ cat, icon }) => ({
    cat, icon,
    val: activities.filter(a => a.category === cat).reduce((s, a) => s + a.co2Amount, 0),
  }));
  const maxVal = Math.max(...totals.map(d => d.val), 1);

  return (
    <FloatCard color={color} delay={1} onClick={onClick} className="w-[200px]">
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Zap className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500">Energy Usage</span>
        </div>
        <div className="space-y-2.5">
          {totals.map(({ cat, icon, val }, i) => (
            <div key={cat} className="flex items-center gap-2">
              <span className="text-xs w-4 shrink-0">{icon}</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(val / maxVal) * 100}%` }}
                  transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                  style={{ background: color }}
                />
              </div>
              <span className="text-[9px] text-gray-400 w-8 text-right shrink-0">{val.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
    </FloatCard>
  );
}

function TravelImpactCard({ flightHours, trees, color, onClick }: {
  flightHours: number; trees: number; color: string; onClick: () => void;
}) {
  return (
    <FloatCard color={color} delay={1.4} onClick={onClick} className="w-[185px]">
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Plane className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500">Travel Impact</span>
        </div>
        <svg viewBox="0 0 160 36" className="w-full mb-2.5" height={36}>
          <motion.path
            d="M 8 28 Q 40 6 80 18 Q 120 30 152 6"
            fill="none" stroke={color} strokeWidth={1.5}
            strokeDasharray="4 3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
          <motion.text x={147} y={11} fontSize={11}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.4 }}
          >✈</motion.text>
        </svg>
        <div className="flex gap-3">
          <div>
            <div className="text-xl font-black text-gray-800 leading-none">
              {flightHours.toFixed(1)}
              <span className="text-[9px] text-gray-400 font-normal ml-1">hr</span>
            </div>
            <div className="text-[9px] text-gray-400">flight equiv</div>
          </div>
          <div className="w-px self-stretch bg-slate-100" />
          <div>
            <div className="text-xl font-black leading-none" style={{ color }}>{trees.toFixed(0)}</div>
            <div className="text-[9px] text-gray-400 flex items-center gap-0.5">
              <TreePine className="w-2.5 h-2.5" style={{ color }} /> trees
            </div>
          </div>
        </div>
      </div>
    </FloatCard>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ module, onClose, color, totalCo2, dailyAverage, flightHours, trees, streak, score, activities }: {
  module: ModuleKey; onClose: () => void; color: string;
  totalCo2: number; dailyAverage: number; flightHours: number;
  trees: number; streak: number; score: number;
  activities: { category: string; activityLabel: string; co2Amount: number; loggedAt: string }[];
}) {
  if (!module) return null;

  const panels: Record<NonNullable<ModuleKey>, React.ReactNode> = {
    carbon: (
      <>
        <p className="text-xl font-bold text-gray-900 mb-4">Carbon Breakdown</p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: "7-Day Total",   value: `${totalCo2.toFixed(2)} kg` },
            { label: "Daily Average", value: `${dailyAverage.toFixed(2)} kg` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3 bg-gray-50 border border-gray-100">
              <div className="text-[9px] text-gray-400 mb-1">{label}</div>
              <div className="text-base font-bold" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
          {activities.slice(0, 10).map((a, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <div className="text-xs font-medium text-gray-700">{a.activityLabel}</div>
                <div className="text-[9px] text-gray-400">{new Date(a.loggedAt).toLocaleDateString()}</div>
              </div>
              <div className="text-xs font-semibold" style={{ color }}>{a.co2Amount.toFixed(2)} kg</div>
            </div>
          ))}
          {activities.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No activities logged yet.</p>}
        </div>
      </>
    ),
    energy: (
      <>
        <p className="text-xl font-bold text-gray-900 mb-4">Energy Breakdown</p>
        {["transport", "energy", "food", "shopping"].map(cat => {
          const val  = activities.filter(a => a.category === cat).reduce((s, a) => s + a.co2Amount, 0);
          const icons: Record<string, string> = { transport: "🚗", energy: "⚡", food: "🥩", shopping: "🛍️" };
          return (
            <div key={cat} className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">{icons[cat]} {cat}</span>
              <span className="text-sm font-bold" style={{ color }}>{val.toFixed(2)} kg CO₂</span>
            </div>
          );
        })}
      </>
    ),
    travel: (
      <>
        <p className="text-xl font-bold text-gray-900 mb-5">Travel Impact Details</p>
        <div className="space-y-4">
          {[
            { Icon: Plane,    val: `${flightHours.toFixed(1)} hours`, sub: "equivalent commercial flight time" },
            { Icon: TreePine, val: `${trees.toFixed(0)} trees`,       sub: "needed 1 year to absorb your CO₂" },
          ].map(({ Icon, val, sub }) => (
            <div key={sub} className="flex items-center gap-4 rounded-xl p-4 bg-gray-50 border border-gray-100">
              <Icon className="w-7 h-7 shrink-0" style={{ color }} />
              <div>
                <div className="text-xl font-black text-gray-900">{val}</div>
                <div className="text-[10px] text-gray-400">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </>
    ),
    ecoscore: (
      <>
        <p className="text-xl font-bold text-gray-900 mb-4">Your Eco Score</p>
        <div className="flex flex-col items-center py-2 mb-4">
          <div className="text-7xl font-black mb-1" style={{ color }}>{score}</div>
          <div className="text-gray-400 text-sm">out of 100</div>
        </div>
        <div className="space-y-1">
          {[
            { label: "Current Streak", value: `${streak} days 🔥` },
            { label: "Rating",         value: score >= 70 ? "ECO HERO 🌟" : score >= 40 ? "IMPROVING 🌱" : "NEEDS WORK ⚠️" },
            { label: "Tip",            value: "Log daily to improve your score" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-semibold" style={{ color }}>{value}</span>
            </div>
          ))}
        </div>
      </>
    ),
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        <motion.div
          className="relative z-10 w-full max-w-md p-6 rounded-3xl bg-white"
          initial={{ scale: 0.88, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.88, y: 20, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 240 }}
          onClick={e => e.stopPropagation()}
          style={{
            border: `1px solid ${color}25`,
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-xl transition-colors hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
          {panels[module!]}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Challenges Strip ─────────────────────────────────────────────────────────
function ChallengesStrip({ challenges, completions, onComplete, color }: {
  challenges: { id: number; title: string; description: string; icon: string; co2Reduction: number; difficulty: string }[];
  completions: { challengeId: number }[];
  onComplete: (id: number) => void;
  color: string;
}) {
  const done = new Set(completions.map(c => c.challengeId));

  return (
    <div className="px-4 md:px-6 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4" style={{ color }} />
        <span className="text-xs font-bold tracking-[0.22em] uppercase text-gray-500">Active Challenges</span>
        <span className="text-xs text-gray-400 ml-1">— tap to complete</span>
      </div>

      <div
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none" } as React.CSSProperties}
      >
        {challenges.slice(0, 8).map((ch, i) => {
          const completed = done.has(ch.id);
          const c = completed ? "#059669" : color;
          return (
            <motion.div
              key={ch.id}
              className="flex-shrink-0 w-48 rounded-2xl p-4 cursor-pointer bg-white"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
              whileHover={{
                scale: 1.06, y: -8,
                boxShadow: "0 12px 32px rgba(0,0,0,0.13)",
                transition: { duration: 0.18 },
              }}
              whileTap={{ scale: 0.97 }}
              onClick={() => !completed && onComplete(ch.id)}
              style={{
                border: "1px solid #e5e7eb",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                background: completed ? "#f0fdf4" : "white",
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{ch.icon}</span>
                {completed
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  : <Circle className="w-4 h-4 text-gray-200" />
                }
              </div>
              <div className="text-xs font-semibold text-gray-800 mb-1 leading-tight">{ch.title}</div>
              <div className="text-[9px] text-gray-400 mb-2 leading-tight">{ch.description}</div>
              <div className="text-[10px] font-bold" style={{ color: c }}>-{ch.co2Reduction} kg CO₂</div>
              <div className="text-[8px] text-gray-300 mt-0.5 capitalize">{ch.difficulty}</div>
            </motion.div>
          );
        })}
        {challenges.length === 0 && (
          <p className="text-sm text-gray-400 py-4">No challenges available.</p>
        )}
      </div>
    </div>
  );
}

// ─── Quick Log FAB ────────────────────────────────────────────────────────────
function QuickLogFAB({ color, sessionId, onLogged }: {
  color: string; sessionId: string; onLogged: () => void;
}) {
  const [open, setOpen]   = useState(false);
  const [km, setKm]       = useState("");
  const [kwh, setKwh]     = useState("");
  const [meals, setMeals] = useState("");
  const [busy, setBusy]   = useState(false);
  const createActivity    = useCreateActivity();
  const { toast }         = useToast();

  const handleLog = async () => {
    if (!km && !kwh && !meals) return;
    try {
      setBusy(true);
      const tasks = [];
      if (km    && +km    > 0) tasks.push(createActivity.mutateAsync({ data: { sessionId, category: "transport", activityType: "car_km",        value: +km    } }));
      if (kwh   && +kwh   > 0) tasks.push(createActivity.mutateAsync({ data: { sessionId, category: "energy",    activityType: "electricity_kwh", value: +kwh   } }));
      if (meals && +meals > 0) tasks.push(createActivity.mutateAsync({ data: { sessionId, category: "food",      activityType: "beef_meal",       value: +meals } }));
      await Promise.all(tasks);
      setKm(""); setKwh(""); setMeals("");
      setOpen(false);
      toast({ title: "Logged ✓", description: "Emissions recorded." });
      onLogged();
    } catch {
      toast({ title: "Failed to log", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed bottom-24 md:bottom-8 right-5 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-16 right-0 w-72 p-5 rounded-3xl bg-white"
            initial={{ opacity: 0, y: 10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.94 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            style={{
              border: `1px solid ${color}25`,
              boxShadow: "0 16px 48px rgba(0,0,0,0.13)",
            }}
          >
            <div className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" style={{ color }} /> Quick Log
            </div>
            <div className="space-y-2.5">
              {[
                { placeholder: "🚗 Transport km",    value: km,    set: setKm    },
                { placeholder: "⚡ Electricity kWh", value: kwh,   set: setKwh   },
                { placeholder: "🥩 Meat meals",      value: meals, set: setMeals },
              ].map(({ placeholder, value, set }) => (
                <input
                  key={placeholder}
                  type="number" step="any" min="0"
                  placeholder={placeholder}
                  value={value}
                  onChange={e => set(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-800 outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                />
              ))}
              <motion.button
                onClick={handleLog}
                disabled={busy}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: color,
                  opacity: busy ? 0.65 : 1,
                  cursor: busy ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                }}
              >
                {busy ? "Logging…" : "Log Emissions"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold shadow-lg"
        style={{ background: color, boxShadow: "0 6px 20px rgba(0,0,0,0.18)" }}
        whileHover={{ scale: 1.1, boxShadow: "0 10px 28px rgba(0,0,0,0.22)", transition: { duration: 0.18 } }}
        whileTap={{ scale: 0.93 }}
        onClick={() => setOpen(o => !o)}
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus className="w-6 h-6" />
        </motion.div>
      </motion.button>
    </div>
  );
}

// ─── CSS Globe Fallback ───────────────────────────────────────────────────────
function hasWebGL() {
  try {
    const c  = document.createElement("canvas");
    return !!(c.getContext("webgl") ?? c.getContext("experimental-webgl"));
  } catch { return false; }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const sessionId   = useSessionId();
  const queryClient = useQueryClient();
  const [activeModule, setActiveModule] = useState<ModuleKey>(null);
  const [webGL] = useState(() => typeof window !== "undefined" ? hasWebGL() : false);

  const summaryQ = useGetActivitySummary(
    { sessionId: sessionId!, days: 7 },
    { query: { enabled: !!sessionId, queryKey: getGetActivitySummaryQueryKey({ sessionId: sessionId!, days: 7 }) } }
  );
  const activitiesQ = useListActivities(
    { sessionId: sessionId! },
    { query: { enabled: !!sessionId, queryKey: getListActivitiesQueryKey({ sessionId: sessionId! }) } }
  );
  const streakQ = useGetActivityStreak(
    { sessionId: sessionId! },
    { query: { enabled: !!sessionId } }
  );
  const challengesQ = useListChallenges(
    { query: { queryKey: getListChallengesQueryKey() } }
  );
  const completionsQ = useListChallengeCompletions(
    { sessionId: sessionId! },
    { query: { enabled: !!sessionId, queryKey: getListChallengeCompletionsQueryKey({ sessionId: sessionId! }) } }
  );
  const completeChallenge = useCompleteChallenge({
    mutation: {
      onSuccess: () => {
        if (sessionId) queryClient.invalidateQueries({ queryKey: getListChallengeCompletionsQueryKey({ sessionId }) });
      },
    },
  });

  const totalCo2     = summaryQ.data?.totalCo2            ?? 0;
  const dailyAverage = summaryQ.data?.dailyAverage         ?? 0;
  const trees        = summaryQ.data?.treeEquivalent        ?? 0;
  const flightHours  = summaryQ.data?.flightHoursEquivalent ?? 0;
  const activities   = activitiesQ.data ?? [];
  const streak       = streakQ.data?.currentStreak          ?? 0;
  const challenges   = challengesQ.data ?? [];
  const completions  = completionsQ.data ?? [];

  const carbonLevel = getCarbonLevel(totalCo2);
  const color       = CARBON_COLORS[carbonLevel];
  const ecoScore    = Math.max(0, Math.min(100, Math.round(100 - totalCo2 / 2)));

  const invalidateAll = () => {
    if (!sessionId) return;
    queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey({ sessionId }) });
    queryClient.invalidateQueries({ queryKey: getGetActivitySummaryQueryKey({ sessionId, days: 7 }) });
  };

  const globeBg = {
    low:    "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #ecfdf5 100%)",
    medium: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fffbeb 100%)",
    high:   "linear-gradient(135deg, #fff5f5 0%, #fee2e2 50%, #fff5f5 100%)",
  }[carbonLevel];

  const vignette = {
    low:    "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 25%, #ecfdf5 80%)",
    medium: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 25%, #fffbeb 80%)",
    high:   "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 25%, #fff5f5 80%)",
  }[carbonLevel];

  return (
    <div className="relative bg-background" style={{ minHeight: "100dvh" }}>

      {/* ── Globe Hero ── */}
      <div className="relative" style={{ height: "clamp(300px, 60vh, 640px)", background: globeBg }}>

        {/* Globe */}
        <div className="absolute inset-0">
          {webGL
            ? <GlobeScene level={carbonLevel} />
            : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full" style={{
                  width: 220, height: 220,
                  background: "radial-gradient(circle at 34% 30%, #1a5f4a 0%, #0c3a20 60%, #071a0e 100%)",
                  boxShadow: `0 0 50px ${color}22, 0 20px 40px rgba(0,0,0,0.1)`,
                }} />
              </div>
            )
          }
        </div>

        {/* Vignette fade to bg color */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: vignette }} />

        {/* Status badge */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 pointer-events-none z-10 text-center">
          <motion.div
            className="text-[9px] font-bold tracking-[0.3em] uppercase mb-1 text-gray-500"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          >
            Carbon Status
          </motion.div>
          <motion.div
            className="text-[10px] px-3 py-1 rounded-full font-bold tracking-widest"
            style={{ color, background: `${color}14`, border: `1px solid ${color}30` }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            {CARBON_LABELS[carbonLevel]}
          </motion.div>
        </div>

        {/* Carbon Tracker — top-left */}
        <div className="absolute top-14 left-2 md:top-16 md:left-5 z-10">
          <CarbonTrackerCard
            totalCo2={totalCo2} dailyAverage={dailyAverage}
            level={carbonLevel} color={color}
            onClick={() => setActiveModule("carbon")}
          />
        </div>

        {/* Eco Score — top-right */}
        <div className="absolute top-14 right-2 md:top-16 md:right-5 z-10">
          <EcoScoreCard score={ecoScore} streak={streak} color={color} onClick={() => setActiveModule("ecoscore")} />
        </div>

        {/* Energy Usage — desktop bottom-left */}
        <div className="hidden md:block absolute bottom-6 left-5 z-10">
          <EnergyUsageCard activities={activities} color={color} onClick={() => setActiveModule("energy")} />
        </div>

        {/* Travel Impact — desktop bottom-right */}
        <div className="hidden md:block absolute bottom-6 right-5 z-10">
          <TravelImpactCard flightHours={flightHours} trees={trees} color={color} onClick={() => setActiveModule("travel")} />
        </div>
      </div>

      {/* Mobile: Energy + Travel below globe */}
      <div className="md:hidden grid grid-cols-2 gap-2.5 px-2.5 mt-2.5">
        <EnergyUsageCard activities={activities} color={color} onClick={() => setActiveModule("energy")} />
        <TravelImpactCard flightHours={flightHours} trees={trees} color={color} onClick={() => setActiveModule("travel")} />
      </div>

      {/* Living Forest System */}
      <div className="mt-5 mb-2">
        <LivingForest score={ecoScore} />
      </div>

      {/* Divider */}
      <div className="mx-4 md:mx-6 my-4 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}30, transparent)` }} />

      {/* Challenges */}
      <ChallengesStrip
        challenges={challenges} completions={completions} color={color}
        onComplete={id => {
          if (!sessionId || completeChallenge.isPending) return;
          completeChallenge.mutate({ id, data: { sessionId } });
        }}
      />

      {/* FAB */}
      {sessionId && <QuickLogFAB color={color} sessionId={sessionId} onLogged={invalidateAll} />}

      {/* Detail Modal */}
      {activeModule && (
        <DetailModal
          module={activeModule} onClose={() => setActiveModule(null)}
          color={color} totalCo2={totalCo2} dailyAverage={dailyAverage}
          flightHours={flightHours} trees={trees} streak={streak}
          score={ecoScore} activities={activities}
        />
      )}
    </div>
  );
}
