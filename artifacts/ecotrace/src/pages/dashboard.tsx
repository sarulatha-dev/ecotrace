import { useState, useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
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
import CursorGlow from "@/components/cursor-glow";
import {
  X, Plus, Zap, Leaf, Trophy, Flame, CheckCircle2, Circle,
  TreePine, Plane, Activity,
} from "lucide-react";

// ─── Carbon Level ────────────────────────────────────────────────────────────
type CarbonLevel = "low" | "medium" | "high";
type ModuleKey   = "carbon" | "energy" | "travel" | "ecoscore" | null;

const CARBON_COLORS: Record<CarbonLevel, string> = {
  low:    "#00ff88",
  medium: "#ffaa00",
  high:   "#ff4444",
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

// ─── Ring Progress ───────────────────────────────────────────────────────────
function RingProgress({
  value, max, color, size = 80, thick = 6,
}: { value: number; max: number; color: string; size?: number; thick?: number }) {
  const r    = (size - thick) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,0.07)" strokeWidth={thick} />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={thick} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct) }}
        transition={{ duration: 1.6, ease: "easeOut" }}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
    </svg>
  );
}

// ─── Glass Card Wrapper ──────────────────────────────────────────────────────
function GlassCard({
  children, className = "", onClick, color = "#00ff88", delay = 0,
}: {
  children: React.ReactNode; className?: string; onClick?: () => void;
  color?: string; delay?: number;
}) {
  return (
    <motion.div
      className={`relative cursor-pointer select-none rounded-2xl overflow-hidden ${className}`}
      animate={{ y: [0, -7, 0] }}
      transition={{ duration: 3.5 + delay * 0.4, repeat: Infinity, ease: "easeInOut", delay }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      data-cursor="pointer"
      style={{
        background: "rgba(3, 10, 6, 0.72)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
        border: `1px solid ${color}22`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.65), inset 0 1px 0 ${color}12`,
      }}
    >
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        style={{ boxShadow: `0 0 40px ${color}44`, border: `1px solid ${color}50` }}
      />
      {children}
    </motion.div>
  );
}

// ─── 3-D Earth ───────────────────────────────────────────────────────────────
function Earth({ level }: { level: CarbonLevel }) {
  const earthRef = useRef<THREE.Mesh>(null!);
  const wireRef  = useRef<THREE.Mesh>(null!);
  const atmRef   = useRef<THREE.Mesh>(null!);
  const color    = CARBON_COLORS[level];

  useFrame((state, delta) => {
    earthRef.current.rotation.y += delta * 0.07;
    wireRef.current.rotation.y  += delta * 0.044;
    wireRef.current.rotation.x   = Math.sin(state.clock.elapsedTime * 0.35) * 0.04;
    const mat = atmRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.04 + Math.sin(state.clock.elapsedTime * 1.4) * 0.018;
  });

  const c   = new THREE.Color(color);
  const cDim = new THREE.Color(color).multiplyScalar(0.22);

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshPhongMaterial
          color="#051018"
          emissive={c} emissiveIntensity={0.13}
          shininess={55} specular={cDim}
        />
      </mesh>
      <mesh ref={wireRef} scale={1.004}>
        <sphereGeometry args={[1.5, 22, 22]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.07} />
      </mesh>
      <mesh ref={atmRef} scale={1.22}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function GlobeScene({ level }: { level: CarbonLevel }) {
  const color = CARBON_COLORS[level];
  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 3, 5]} intensity={0.8} />
      <pointLight position={[2, 1, 3]} intensity={0.6} color={color} />
      <Stars radius={100} depth={50} count={2500} factor={4} saturation={0} fade speed={0.35} />
      <Suspense fallback={null}>
        <Earth level={level} />
      </Suspense>
      <OrbitControls
        enableZoom={false} enablePan={false}
        rotateSpeed={0.4}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.8}
      />
    </Canvas>
  );
}

// ─── Module: Carbon Tracker ──────────────────────────────────────────────────
function CarbonTrackerCard({
  totalCo2, dailyAverage, level, color, onClick,
}: {
  totalCo2: number; dailyAverage: number; level: CarbonLevel; color: string; onClick: () => void;
}) {
  return (
    <GlassCard color={color} delay={0} onClick={onClick} className="w-[195px]">
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Activity className="w-3 h-3" style={{ color }} />
          <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color }}>Carbon Tracker</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <RingProgress value={totalCo2} max={Math.max(totalCo2, 100)} color={color} size={76} thick={6} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-bold text-white leading-none">{totalCo2.toFixed(0)}</span>
              <span className="text-[8px] text-white/35 mt-0.5">kg</span>
            </div>
          </div>
          <div>
            <div className="text-[9px] text-white/35 mb-0.5">7-day total</div>
            <motion.div
              className="text-xl font-black leading-none"
              style={{ color, textShadow: `0 0 18px ${color}77` }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
            >
              {totalCo2.toFixed(1)}
            </motion.div>
            <div className="text-[8px] text-white/35">kg CO₂</div>
            <div className="mt-1.5 text-[8px] font-bold tracking-widest" style={{ color }}>
              {CARBON_LABELS[level]}
            </div>
            <div className="text-[8px] text-white/25 mt-0.5">avg {dailyAverage.toFixed(1)}/day</div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Module: Eco Score ───────────────────────────────────────────────────────
function EcoScoreCard({
  score, streak, color, onClick,
}: {
  score: number; streak: number; color: string; onClick: () => void;
}) {
  return (
    <GlassCard color={color} delay={0.6} onClick={onClick} className="w-[155px]">
      <div className="p-4 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1.5">
          <Trophy className="w-3 h-3" style={{ color }} />
          <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color }}>Eco Score</span>
        </div>
        <motion.div
          className="text-5xl font-black leading-none"
          style={{ color, textShadow: `0 0 28px ${color}99, 0 0 50px ${color}44` }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", delay: 0.25, stiffness: 130 }}
        >
          {score}
        </motion.div>
        <div className="text-[9px] text-white/25 mb-2">/ 100</div>
        <div className="flex items-center justify-center gap-1 text-[9px] mb-2">
          <Flame className="w-3 h-3 text-orange-400" />
          <span className="text-white/45">{streak} day streak</span>
        </div>
        <div
          className="text-[8px] font-bold tracking-widest px-2 py-1 rounded-full inline-block"
          style={{ color, background: `${color}14`, border: `1px solid ${color}28` }}
        >
          {score >= 70 ? "ECO HERO 🌟" : score >= 40 ? "IMPROVING 🌱" : "NEEDS WORK ⚠️"}
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Module: Energy Usage ────────────────────────────────────────────────────
function EnergyUsageCard({
  activities, color, onClick,
}: {
  activities: { category: string; co2Amount: number }[]; color: string; onClick: () => void;
}) {
  const cats = [
    { cat: "transport", icon: "🚗" },
    { cat: "energy",    icon: "⚡" },
    { cat: "food",      icon: "🥩" },
    { cat: "shopping",  icon: "🛍️" },
  ];
  const totals = cats.map(({ cat, icon }) => ({
    cat, icon,
    val: activities.filter(a => a.category === cat).reduce((s, a) => s + a.co2Amount, 0),
  }));
  const maxVal = Math.max(...totals.map(d => d.val), 1);

  return (
    <GlassCard color={color} delay={1} onClick={onClick} className="w-[200px]">
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Zap className="w-3 h-3" style={{ color }} />
          <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color }}>Energy Usage</span>
        </div>
        <div className="space-y-2.5">
          {totals.map(({ cat, icon, val }, i) => (
            <div key={cat} className="flex items-center gap-2">
              <span className="text-xs w-4 shrink-0">{icon}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(val / maxVal) * 100}%` }}
                  transition={{ duration: 1.1, delay: i * 0.1, ease: "easeOut" }}
                  style={{ background: color, boxShadow: `0 0 8px ${color}80` }}
                />
              </div>
              <span className="text-[9px] text-white/35 w-8 text-right shrink-0">{val.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Module: Travel Impact ───────────────────────────────────────────────────
function TravelImpactCard({
  flightHours, trees, color, onClick,
}: {
  flightHours: number; trees: number; color: string; onClick: () => void;
}) {
  return (
    <GlassCard color={color} delay={1.4} onClick={onClick} className="w-[185px]">
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Plane className="w-3 h-3" style={{ color }} />
          <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color }}>Travel Impact</span>
        </div>
        <svg viewBox="0 0 160 36" className="w-full mb-2.5" height={36}>
          <motion.path
            d="M 8 28 Q 40 6 80 18 Q 120 30 152 6"
            fill="none" stroke={color} strokeWidth={1.5}
            strokeDasharray="4 3" opacity={0.5}
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
            <motion.div
              className="text-xl font-black text-white leading-none"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
            >
              {flightHours.toFixed(1)}
              <span className="text-[9px] text-white/35 font-normal ml-1">hr</span>
            </motion.div>
            <div className="text-[9px] text-white/35">flight equiv</div>
          </div>
          <div className="w-px self-stretch" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div>
            <motion.div
              className="text-xl font-black leading-none"
              style={{ color }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }}
            >
              {trees.toFixed(0)}
            </motion.div>
            <div className="text-[9px] text-white/35 flex items-center gap-0.5">
              <TreePine className="w-2.5 h-2.5" style={{ color }} /> trees
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Detail Modal ────────────────────────────────────────────────────────────
function DetailModal({
  module, onClose, color, totalCo2, dailyAverage, flightHours, trees, streak, score, activities,
}: {
  module: ModuleKey; onClose: () => void; color: string;
  totalCo2: number; dailyAverage: number; flightHours: number;
  trees: number; streak: number; score: number;
  activities: { category: string; activityLabel: string; co2Amount: number; loggedAt: string }[];
}) {
  if (!module) return null;

  const panels: Record<NonNullable<ModuleKey>, React.ReactNode> = {
    carbon: (
      <>
        <p className="text-xl font-bold text-white mb-4">Carbon Breakdown</p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: "7-Day Total",   value: `${totalCo2.toFixed(2)} kg`   },
            { label: "Daily Average", value: `${dailyAverage.toFixed(2)} kg` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="text-[9px] text-white/35 mb-1">{label}</div>
              <div className="text-base font-bold" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
          {activities.slice(0, 10).map((a, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div>
                <div className="text-xs font-medium text-white/80">{a.activityLabel}</div>
                <div className="text-[9px] text-white/30">{new Date(a.loggedAt).toLocaleDateString()}</div>
              </div>
              <div className="text-xs font-semibold" style={{ color }}>{a.co2Amount.toFixed(2)} kg</div>
            </div>
          ))}
          {activities.length === 0 && (
            <p className="text-sm text-white/30 text-center py-6">No activities logged yet.</p>
          )}
        </div>
      </>
    ),
    energy: (
      <>
        <p className="text-xl font-bold text-white mb-4">Energy Breakdown</p>
        {["transport", "energy", "food", "shopping"].map(cat => {
          const val = activities.filter(a => a.category === cat).reduce((s, a) => s + a.co2Amount, 0);
          const icons: Record<string, string> = { transport: "🚗", energy: "⚡", food: "🥩", shopping: "🛍️" };
          return (
            <div key={cat} className="flex items-center justify-between py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <span className="text-sm text-white/60">{icons[cat]} {cat}</span>
              <span className="text-sm font-bold" style={{ color }}>{val.toFixed(2)} kg CO₂</span>
            </div>
          );
        })}
      </>
    ),
    travel: (
      <>
        <p className="text-xl font-bold text-white mb-5">Travel Impact Details</p>
        <div className="space-y-4">
          {[
            { Icon: Plane,    value: `${flightHours.toFixed(1)} hours`, label: "equivalent commercial flight time" },
            { Icon: TreePine, value: `${trees.toFixed(0)} trees`,        label: "needed 1 year to absorb your CO₂" },
          ].map(({ Icon, value, label }) => (
            <div key={label} className="flex items-center gap-4 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
              <Icon className="w-8 h-8 shrink-0" style={{ color }} />
              <div>
                <div className="text-xl font-black text-white">{value}</div>
                <div className="text-[10px] text-white/35">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </>
    ),
    ecoscore: (
      <>
        <p className="text-xl font-bold text-white mb-4">Your Eco Score</p>
        <div className="flex flex-col items-center py-2 mb-4">
          <div className="text-7xl font-black mb-1" style={{ color, textShadow: `0 0 40px ${color}88` }}>{score}</div>
          <div className="text-white/35 text-sm">out of 100</div>
        </div>
        <div className="space-y-1">
          {[
            { label: "Current Streak", value: `${streak} days 🔥` },
            { label: "Rating", value: score >= 70 ? "ECO HERO 🌟" : score >= 40 ? "IMPROVING 🌱" : "NEEDS WORK ⚠️" },
            { label: "Tip", value: "Log daily to improve your score" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <span className="text-sm text-white/45">{label}</span>
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
        <div className="absolute inset-0 bg-black/75 backdrop-blur-lg" />
        <motion.div
          className="relative z-10 w-full max-w-md p-6 rounded-3xl"
          initial={{ scale: 0.86, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.86, y: 24, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 220 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: "rgba(3, 10, 6, 0.94)",
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            border: `1px solid ${color}28`,
            boxShadow: `0 0 80px ${color}18, 0 32px 80px rgba(0,0,0,0.85)`,
          }}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-xl transition-colors hover:bg-white/10"
            onClick={onClose}
          >
            <X className="w-4 h-4 text-white/50" />
          </button>
          {panels[module!]}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Challenges Strip ────────────────────────────────────────────────────────
function ChallengesStrip({
  challenges, completions, onComplete, color,
}: {
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
        <span className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color }}>
          Active Challenges
        </span>
        <span className="text-[10px] text-white/25 ml-1">tap to complete</span>
      </div>

      <div
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        {challenges.slice(0, 8).map((ch, i) => {
          const completed = done.has(ch.id);
          const c = completed ? "#00ff88" : color;
          return (
            <motion.div
              key={ch.id}
              className="flex-shrink-0 w-48 rounded-2xl p-4 cursor-pointer"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => !completed && onComplete(ch.id)}
              style={{
                background: completed ? "rgba(0,255,136,0.07)" : "rgba(3, 10, 6, 0.68)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: `1px solid ${c}22`,
                boxShadow: completed
                  ? `0 0 22px rgba(0,255,136,0.14), 0 4px 16px rgba(0,0,0,0.5)`
                  : "0 4px 16px rgba(0,0,0,0.5)",
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{ch.icon}</span>
                {completed
                  ? <CheckCircle2 className="w-4 h-4 text-[#00ff88]" />
                  : <Circle className="w-4 h-4 text-white/15" />
                }
              </div>
              <div className="text-xs font-semibold text-white/88 mb-1 leading-tight">{ch.title}</div>
              <div className="text-[9px] text-white/32 mb-2 leading-tight">{ch.description}</div>
              <div className="text-[10px] font-bold" style={{ color: c }}>
                -{ch.co2Reduction} kg CO₂
              </div>
              <div className="text-[8px] text-white/22 mt-0.5 capitalize">{ch.difficulty}</div>
            </motion.div>
          );
        })}
        {challenges.length === 0 && (
          <p className="text-sm text-white/25 py-4">No challenges available.</p>
        )}
      </div>
    </div>
  );
}

// ─── Quick Log FAB ────────────────────────────────────────────────────────────
function QuickLogFAB({
  color, sessionId, onLogged,
}: { color: string; sessionId: string; onLogged: () => void }) {
  const [open, setOpen]     = useState(false);
  const [km, setKm]         = useState("");
  const [kwh, setKwh]       = useState("");
  const [meals, setMeals]   = useState("");
  const [busy, setBusy]     = useState(false);
  const createActivity      = useCreateActivity();
  const { toast }           = useToast();

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
      toast({ title: "Logged ✓", description: "Emissions recorded successfully." });
      onLogged();
    } catch {
      toast({ title: "Failed to log", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const fieldStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${color}18`,
    borderRadius: 12,
    color: "white",
    padding: "9px 12px",
    width: "100%",
    fontSize: 13,
    outline: "none",
  };

  return (
    <div className="fixed bottom-24 md:bottom-8 right-5 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-16 right-0 w-72 p-5 rounded-3xl"
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.92 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            style={{
              background: "rgba(3, 10, 6, 0.94)",
              backdropFilter: "blur(30px)",
              WebkitBackdropFilter: "blur(30px)",
              border: `1px solid ${color}22`,
              boxShadow: `0 0 60px ${color}14, 0 24px 60px rgba(0,0,0,0.85)`,
            }}
          >
            <div className="text-sm font-bold text-white/88 mb-4 flex items-center gap-2">
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
                  style={fieldStyle}
                />
              ))}
              <motion.button
                onClick={handleLog}
                disabled={busy}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-black"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: color,
                  opacity: busy ? 0.6 : 1,
                  boxShadow: `0 0 20px ${color}55`,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                {busy ? "Logging…" : "Log Emissions"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className="w-14 h-14 rounded-full flex items-center justify-center text-black font-bold"
        style={{ background: color, boxShadow: `0 0 22px ${color}90, 0 8px 20px rgba(0,0,0,0.45)` }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        animate={{ boxShadow: [`0 0 18px ${color}70`, `0 0 38px ${color}bb`, `0 0 18px ${color}70`] }}
        transition={{ duration: 2.2, repeat: Infinity }}
        onClick={() => setOpen(o => !o)}
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus className="w-6 h-6" />
        </motion.div>
      </motion.button>
    </div>
  );
}

// ─── WebGL Check ──────────────────────────────────────────────────────────────
function hasWebGL() {
  try {
    const c  = document.createElement("canvas");
    const gl = c.getContext("webgl") ?? c.getContext("experimental-webgl");
    return !!gl;
  } catch { return false; }
}

// ─── CSS Globe Fallback ───────────────────────────────────────────────────────
function CSSGlobe({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative" style={{ width: 220, height: 220 }}>
        <div className="absolute -inset-6 rounded-full" style={{ background: `radial-gradient(circle, ${color}09 0%, transparent 65%)` }} />
        <div className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background: `radial-gradient(circle at 34% 30%, #0d2a1f 0%, #051018 50%, #020c14 100%)`,
            boxShadow: `0 0 60px ${color}22, inset -20px -12px 40px rgba(0,0,0,0.5)`,
            animation: "spin 24s linear infinite",
          }}
        />
        <div className="absolute inset-0 rounded-full" style={{ border: `1px solid ${color}14` }} />
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const sessionId  = useSessionId();
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

  return (
    <div className="relative" style={{ background: "#050505", minHeight: "100dvh" }}>
      <CursorGlow />

      {/* ── Globe Hero ──────────────────────────────────────────────── */}
      <div className="relative" style={{ height: "clamp(300px, 60vh, 640px)" }}>

        {/* Globe (WebGL or CSS fallback) */}
        <div className="absolute inset-0">
          {webGL ? <GlobeScene level={carbonLevel} /> : <CSSGlobe color={color} />}
        </div>

        {/* Radial vignette keeps cards readable */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 72% 72% at 50% 50%, transparent 28%, #050505 82%)` }}
        />

        {/* Status badge */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 pointer-events-none z-10 text-center">
          <motion.div
            className="text-[9px] font-bold tracking-[0.3em] uppercase mb-1"
            style={{ color }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          >
            Carbon Status
          </motion.div>
          <motion.div
            className="text-[10px] px-3 py-1 rounded-full font-bold tracking-widest"
            style={{ color, background: `${color}12`, border: `1px solid ${color}28` }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            {CARBON_LABELS[carbonLevel]}
          </motion.div>
        </div>

        {/* ── Floating Cards ── */}

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
          <EcoScoreCard
            score={ecoScore} streak={streak}
            color={color}
            onClick={() => setActiveModule("ecoscore")}
          />
        </div>

        {/* Energy Usage — bottom-left (desktop only) */}
        <div className="hidden md:block absolute bottom-6 left-5 z-10">
          <EnergyUsageCard
            activities={activities} color={color}
            onClick={() => setActiveModule("energy")}
          />
        </div>

        {/* Travel Impact — bottom-right (desktop only) */}
        <div className="hidden md:block absolute bottom-6 right-5 z-10">
          <TravelImpactCard
            flightHours={flightHours} trees={trees}
            color={color}
            onClick={() => setActiveModule("travel")}
          />
        </div>
      </div>

      {/* ── Mobile: Energy + Travel below globe ── */}
      <div className="md:hidden grid grid-cols-2 gap-2.5 px-2.5 mt-2.5">
        <EnergyUsageCard
          activities={activities} color={color}
          onClick={() => setActiveModule("energy")}
        />
        <TravelImpactCard
          flightHours={flightHours} trees={trees}
          color={color}
          onClick={() => setActiveModule("travel")}
        />
      </div>

      {/* Divider */}
      <div
        className="mx-4 md:mx-6 my-6"
        style={{ height: 1, background: `linear-gradient(90deg, transparent, ${color}28, transparent)` }}
      />

      {/* ── Challenges ── */}
      <ChallengesStrip
        challenges={challenges}
        completions={completions}
        color={color}
        onComplete={id => {
          if (!sessionId || completeChallenge.isPending) return;
          completeChallenge.mutate({ id, data: { sessionId } });
        }}
      />

      {/* ── FAB ── */}
      {sessionId && (
        <QuickLogFAB color={color} sessionId={sessionId} onLogged={invalidateAll} />
      )}

      {/* ── Detail Modal ── */}
      {activeModule && (
        <DetailModal
          module={activeModule}
          onClose={() => setActiveModule(null)}
          color={color}
          totalCo2={totalCo2}
          dailyAverage={dailyAverage}
          flightHours={flightHours}
          trees={trees}
          streak={streak}
          score={ecoScore}
          activities={activities}
        />
      )}
    </div>
  );
}
