import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

// ─── Stage typing ─────────────────────────────────────────────────────────────
type ForestStage = "dead" | "sprout" | "growth" | "forest";

function getStage(score: number): ForestStage {
  if (score <= 25) return "dead";
  if (score <= 50) return "sprout";
  if (score <= 75) return "growth";
  return "forest";
}

const STAGE_STYLES: Record<ForestStage, {
  sky: string; ground: string; groundColor: string;
  treeFill: string; trunkColor: string; glowColor: string;
  textColor: string; badgeBg: string;
}> = {
  dead: {
    sky: "linear-gradient(180deg, #c8bfb0 0%, #e0d4c3 60%, #c4b49a 100%)",
    ground: "linear-gradient(180deg, #a89070 0%, #8b7355 100%)",
    groundColor: "#8b7355",
    treeFill: "#5a4a38",
    trunkColor: "#4a3a28",
    glowColor: "rgba(139,115,85,0.15)",
    textColor: "#6b5a45",
    badgeBg: "rgba(139,115,85,0.12)",
  },
  sprout: {
    sky: "linear-gradient(180deg, #bbf7d0 0%, #d1fae5 60%, #a7f3d0 100%)",
    ground: "linear-gradient(180deg, #4ade80 0%, #22c55e 100%)",
    groundColor: "#22c55e",
    treeFill: "#22c55e",
    trunkColor: "#92400e",
    glowColor: "rgba(34,197,94,0.2)",
    textColor: "#15803d",
    badgeBg: "rgba(34,197,94,0.12)",
  },
  growth: {
    sky: "linear-gradient(180deg, #86efac 0%, #bbf7d0 50%, #6ee7b7 100%)",
    ground: "linear-gradient(180deg, #16a34a 0%, #15803d 100%)",
    groundColor: "#16a34a",
    treeFill: "#16a34a",
    trunkColor: "#78350f",
    glowColor: "rgba(22,163,74,0.25)",
    textColor: "#14532d",
    badgeBg: "rgba(22,163,74,0.14)",
  },
  forest: {
    sky: "linear-gradient(180deg, #4ade80 0%, #86efac 40%, #34d399 100%)",
    ground: "linear-gradient(180deg, #14532d 0%, #166534 100%)",
    groundColor: "#14532d",
    treeFill: "#14532d",
    trunkColor: "#451a03",
    glowColor: "rgba(20,83,45,0.35)",
    textColor: "#14532d",
    badgeBg: "rgba(20,83,45,0.12)",
  },
};

// ─── SVG Tree ─────────────────────────────────────────────────────────────────
// ─── SVG Tree ─────────────────────────────────────────────────────────────────
function Tree({
  cx, stage, size = 1, delay = 0, isRed,
}: { cx: number; stage: ForestStage; size?: number; delay?: number; isRed?: boolean }) {
  const s = isRed ? {
    sky: "linear-gradient(180deg, #fee2e2 0%, #fef2f2 60%, #fca5a5 100%)",
    ground: "linear-gradient(180deg, #ef4444 0%, #dc2626 100%)",
    groundColor: "#dc2626",
    treeFill: "#ef4444",
    trunkColor: "#7f1d1d",
    glowColor: "rgba(239,68,68,0.25)",
    textColor: "#991b1b",
    badgeBg: "rgba(239,68,68,0.12)",
  } : STAGE_STYLES[stage];
  const h  = 44 * size;   // total height above ground-line (y=90)
  const tw = 32 * size;   // triangle half-width at base
  const sw = 22 * size;   // second layer half-width
  const gx = cx - 2 * size;

  if (stage === "dead") {
    return (
      <motion.g
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ delay, duration: 0.5, ease: "easeOut" }}
        style={{ transformOrigin: `${cx}px 90px` }}
      >
        {/* trunk */}
        <line x1={cx} y1={90} x2={cx} y2={90 - h} stroke={s.trunkColor} strokeWidth={2.5 * size} strokeLinecap="round" />
        {/* branches */}
        <line x1={cx} y1={90 - h * 0.38} x2={cx - h * 0.34} y2={90 - h * 0.66} stroke={s.trunkColor} strokeWidth={1.6 * size} strokeLinecap="round" />
        <line x1={cx} y1={90 - h * 0.52} x2={cx + h * 0.28} y2={90 - h * 0.78} stroke={s.trunkColor} strokeWidth={1.4 * size} strokeLinecap="round" />
        <line x1={cx} y1={90 - h * 0.28} x2={cx + h * 0.22} y2={90 - h * 0.5}  stroke={s.trunkColor} strokeWidth={1.2 * size} strokeLinecap="round" />
      </motion.g>
    );
  }

  if (stage === "sprout") {
    const r = 10 * size;
    return (
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, duration: 0.7, type: "spring", stiffness: 200 }}
        style={{ transformOrigin: `${cx}px 90px` }}
      >
        {/* tiny trunk */}
        <rect x={cx - 1.5 * size} y={90 - r * 1.6} width={3 * size} height={r * 1.6} rx={1} fill={s.trunkColor} />
        {/* round bush */}
        <circle cx={cx} cy={90 - r * 1.6} r={r} fill={s.treeFill} opacity={0.92} />
        {/* highlight */}
        <circle cx={cx - r * 0.3} cy={90 - r * 1.6 - r * 0.25} r={r * 0.35} fill="rgba(255,255,255,0.18)" />
      </motion.g>
    );
  }

  // growth / forest — layered triangle fir tree
  return (
    <motion.g
      initial={{ opacity: 0, scaleY: 0 }}
      animate={{ opacity: 1, scaleY: 1 }}
      transition={{ delay, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
      style={{ transformOrigin: `${cx}px 90px` }}
    >
      {/* trunk */}
      <rect x={gx} y={90 - h * 0.25} width={4 * size} height={h * 0.25} rx={1} fill={s.trunkColor} />

      {/* bottom layer — widest */}
      <polygon
        points={`${cx},${90 - h * 0.55} ${cx - tw},${90 - h * 0.2} ${cx + tw},${90 - h * 0.2}`}
        fill={s.treeFill} opacity={0.88}
      />
      {/* mid layer */}
      <polygon
        points={`${cx},${90 - h * 0.8} ${cx - sw},${90 - h * 0.48} ${cx + sw},${90 - h * 0.48}`}
        fill={s.treeFill} opacity={0.94}
      />
      {/* top layer */}
      <polygon
        points={`${cx},${90 - h} ${cx - sw * 0.6},${90 - h * 0.72} ${cx + sw * 0.6},${90 - h * 0.72}`}
        fill={s.treeFill}
      />
      {/* highlight shimmer */}
      <polygon
        points={`${cx - 2 * size},${90 - h * 0.95} ${cx - sw * 0.55},${90 - h * 0.72} ${cx},${90 - h * 0.75}`}
        fill="rgba(255,255,255,0.1)"
      />
    </motion.g>
  );
}

// ─── Floating leaf particle ───────────────────────────────────────────────────
function Leaf({ x, delay, stage, isRed }: { x: number; delay: number; stage: ForestStage; isRed?: boolean }) {
  const colors = { growth: "#22c55e", forest: "#16a34a", dead: "#8b7355", sprout: "#4ade80" };
  const c = isRed ? "#ef4444" : colors[stage];
  const drift = (Math.random() - 0.5) * 60;
  const rot   = Math.random() * 360;

  return (
    <motion.div
      className="absolute pointer-events-none select-none text-xs"
      style={{ left: x, top: 10, fontSize: 10 }}
      initial={{ y: 0, x: 0, opacity: 0.9, rotate: rot }}
      animate={{
        y: [0, 90, 120],
        x: [0, drift, drift * 1.2],
        opacity: [0.9, 0.7, 0],
        rotate: [rot, rot + 180, rot + 280],
      }}
      transition={{ duration: 3 + Math.random() * 2, delay, repeat: Infinity, repeatDelay: Math.random() * 4, ease: "easeIn" }}
    >
      {isRed ? "🍁" : stage === "forest" ? "🍃" : "🌿"}
    </motion.div>
  );
}

// ─── Light ray ───────────────────────────────────────────────────────────────
function LightRay({ x, delay, isRed }: { x: number; delay: number; isRed?: boolean }) {
  return (
    <motion.div
      className="absolute top-0 pointer-events-none"
      style={{
        left: x, width: 2, height: "70%",
        background: isRed 
          ? "linear-gradient(180deg, rgba(239,68,68,0.15) 0%, transparent 100%)" 
          : "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)",
        transform: `rotate(${(Math.random() - 0.5) * 20}deg)`,
        transformOrigin: "top center",
      }}
      animate={{ opacity: [0, 0.8, 0] }}
      transition={{ duration: 3.5, delay, repeat: Infinity, repeatDelay: 2 + Math.random() * 4 }}
    />
  );
}

// ─── Pollen/dust particle ─────────────────────────────────────────────────────
function Pollen({ x, y, delay, isRed }: { x: number; y: number; delay: number; isRed?: boolean }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: x, top: y, width: 3, height: 3, background: isRed ? "rgba(239,68,68,0.6)" : "rgba(255,255,200,0.6)" }}
      animate={{
        y: [0, -20, -35],
        x: [0, (Math.random() - 0.5) * 30],
        opacity: [0.6, 0.4, 0],
        scale: [1, 1.2, 0.5],
      }}
      transition={{ duration: 2.5 + Math.random(), delay, repeat: Infinity, repeatDelay: Math.random() * 5 }}
    />
  );
}

// ─── Tree layout per stage ────────────────────────────────────────────────────
const TREE_LAYOUTS: Record<ForestStage, { cx: number; size: number; delay: number }[]> = {
  dead: [
    { cx: 80,  size: 0.95, delay: 0 },
    { cx: 200, size: 1.1,  delay: 0.1 },
    { cx: 320, size: 0.9,  delay: 0.2 },
  ],
  sprout: [
    { cx: 60,  size: 0.7,  delay: 0 },
    { cx: 140, size: 1.0,  delay: 0.15 },
    { cx: 230, size: 0.85, delay: 0.08 },
    { cx: 320, size: 0.75, delay: 0.25 },
    { cx: 390, size: 0.9,  delay: 0.12 },
  ],
  growth: [
    { cx: 50,  size: 0.75, delay: 0    },
    { cx: 110, size: 1.0,  delay: 0.1  },
    { cx: 175, size: 0.88, delay: 0.2  },
    { cx: 240, size: 1.05, delay: 0.05 },
    { cx: 305, size: 0.82, delay: 0.15 },
    { cx: 365, size: 0.95, delay: 0.3  },
    { cx: 420, size: 0.78, delay: 0.08 },
  ],
  forest: [
    { cx: 35,  size: 0.72, delay: 0    },
    { cx: 80,  size: 1.0,  delay: 0.08 },
    { cx: 128, size: 0.88, delay: 0.16 },
    { cx: 176, size: 1.1,  delay: 0.04 },
    { cx: 224, size: 0.82, delay: 0.2  },
    { cx: 272, size: 1.05, delay: 0.12 },
    { cx: 320, size: 0.9,  delay: 0.28 },
    { cx: 368, size: 0.78, delay: 0.06 },
    { cx: 416, size: 1.0,  delay: 0.18 },
    { cx: 456, size: 0.85, delay: 0.1  },
  ],
};

// ─── Living Forest main component ────────────────────────────────────────────
export function LivingForest({ score, isRed }: { score: number; isRed?: boolean }) {
  const { t } = useTranslation();
  // Forced green state by default (stage forest) unless isRed is activated.
  const stage  = isRed ? getStage(score) : "forest";
  
  let s = STAGE_STYLES[stage];
  if (isRed) {
    s = {
      sky: "linear-gradient(180deg, #fee2e2 0%, #fef2f2 60%, #fca5a5 100%)",
      ground: "linear-gradient(180deg, #ef4444 0%, #dc2626 100%)",
      groundColor: "#dc2626",
      treeFill: "#ef4444",
      trunkColor: "#7f1d1d",
      glowColor: "rgba(239,68,68,0.25)",
      textColor: "#991b1b",
      badgeBg: "rgba(239,68,68,0.12)",
    };
  }
  const trees  = TREE_LAYOUTS[stage];
  const prevScore = useRef(score);
  const [showBurst, setShowBurst] = useState(false);

  // Delight: show burst when score jumps significantly
  useEffect(() => {
    if (score - prevScore.current >= 8) setShowBurst(true);
    prevScore.current = score;
  }, [score]);

  useEffect(() => {
    if (showBurst) {
      const timer = setTimeout(() => setShowBurst(false), 1800);
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [showBurst]);

  const leaves = stage === "growth" || stage === "forest" || isRed
    ? Array.from({ length: stage === "forest" || isRed ? 8 : 4 }, (_, i) => ({
        x: 30 + i * (stage === "forest" || isRed ? 56 : 110) + Math.random() * 30,
        delay: i * 0.6 + Math.random() * 1.2,
      }))
    : [];

  const pollens = stage === "forest" || isRed
    ? Array.from({ length: 6 }, (_, i) => ({
        x: 60 + i * 70 + Math.random() * 30,
        y: 20 + Math.random() * 50,
        delay: i * 0.8 + Math.random(),
      }))
    : [];

  const rays = stage === "forest" || isRed
    ? Array.from({ length: 4 }, (_, i) => ({
        x: 60 + i * 105,
        delay: i * 0.9,
      }))
    : [];

  const stageKey = isRed ? "Emissions Alert 🚨" : (t(`forest.${stage}`) as string);
  const tagline  = isRed ? "Your logged activities have increased carbon levels, warming the atmosphere." : (t(`forest.tagline.${stage}`) as string);

  return (
    <motion.div
      className="relative overflow-hidden mx-4 md:mx-6 rounded-2xl"
      style={{ height: 148 }}
      layout
    >
      {/* Sky gradient */}
      <motion.div
        className="absolute inset-0"
        animate={{ background: s.sky }}
        transition={{ duration: 1.4, ease: "easeInOut" }}
      />

      {/* Light rays */}
      {rays.map((r, i) => <LightRay key={i} x={r.x} delay={r.delay} isRed={isRed} />)}

      {/* Leaf particles */}
      {leaves.map((l, i) => (
        <Leaf key={i} x={l.x} delay={l.delay} stage={stage} isRed={isRed} />
      ))}

      {/* Pollen particles */}
      {pollens.map((p, i) => (
        <Pollen key={i} x={p.x} y={p.y} delay={p.delay} isRed={isRed} />
      ))}

      {/* Tree SVG scene */}
      <svg
        viewBox="0 0 480 100"
        preserveAspectRatio="xMidYMax meet"
        className="absolute inset-0 w-full h-full"
        style={{ overflow: "visible" }}
      >
        {/* Ground */}
        <defs>
          <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.groundColor} />
            <stop offset="100%" stopColor={s.groundColor} stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <rect x={0} y={88} width={480} height={12} fill="url(#groundGrad)" rx={1} />

        {/* Trees */}
        {trees.map((tr, i) => (
          <Tree key={i} cx={tr.cx} stage={stage} size={tr.size} delay={tr.delay} isRed={isRed} />
        ))}
      </svg>

      {/* Overlay info */}
      <div className="absolute top-3 right-4 flex flex-col items-end gap-1 z-10">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
          style={{ color: s.textColor, background: s.badgeBg, backdropFilter: "blur(8px)" }}
        >
          {stageKey}
        </motion.div>
        <motion.div
          className="text-[11px] font-semibold"
          style={{ color: s.textColor, opacity: 0.75 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.75 }}
          transition={{ delay: 0.3 }}
        >
          {t("forest.score")}: {score}
        </motion.div>
      </div>

      {/* Tagline */}
      <motion.div
        key={stage + "-tag"}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="absolute bottom-3 left-4 text-[11px] font-medium z-10"
        style={{ color: s.textColor, opacity: 0.85 }}
      >
        {tagline}
      </motion.div>

      {/* Growth burst delight */}
      <AnimatePresence>
        {showBurst && !isRed && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1.15 }}
            exit={{ opacity: 0, scale: 1.4 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="text-4xl select-none">🌳✨</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Carbon degradation overlay — subtle when score is low */}
      {score < 30 && !isRed && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: Math.max(0, (30 - score) / 30) * 0.25 }}
          transition={{ duration: 1 }}
          style={{ background: "rgba(180,150,100,0.3)", mixBlendMode: "multiply" }}
        />
      )}
    </motion.div>
  );
}
