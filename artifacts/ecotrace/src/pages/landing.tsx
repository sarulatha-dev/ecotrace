import { useRef, useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import * as THREE from "three";
import { Leaf, ChevronRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import LanguageSwitcher from "../components/language-switcher";

// ─── Direction config — all use eco-green to match reference ─────────────────
const DIRS = {
  right: { path: "/challenges", key: "right" },
  left:  { path: "/insights",   key: "left"  },
  up:    { path: "/dashboard",  key: "up"    },
  down:  { path: "/rewards",    key: "down"  },
} as const;
type Dir = keyof typeof DIRS;

const ECO = "#10b981";

// ─── Bullet data per direction ───────────────────────────────────────────────
const BULLETS: Record<Dir, { icon: string; text: string }[]> = {
  right: [
    { icon: "🚗", text: "Driving" },
    { icon: "⚡", text: "Electricity" },
    { icon: "🛍️", text: "Shopping" },
  ],
  left: [
    { icon: "🌡️", text: "Rising Temperatures" },
    { icon: "🧊", text: "Melting Ice Caps" },
    { icon: "⛈️", text: "Extreme Weather" },
    { icon: "🌿", text: "Loss of Biodiversity" },
  ],
  up: [
    { icon: "💡", text: "Save Energy" },
    { icon: "♻️", text: "Use Reusable Items" },
    { icon: "🚫", text: "Reduce Plastic" },
    { icon: "🌱", text: "Plant More Trees" },
    { icon: "🚌", text: "Use Public Transport" },
  ],
  down: [
    { icon: "📊", text: "Footprint Tracker" },
    { icon: "🤖", text: "Smart Recommendations" },
    { icon: "🎯", text: "Daily Challenges" },
    { icon: "🌍", text: "Community Impact" },
    { icon: "🏆", text: "Rewards & Badges" },
  ],
};

// ─── WebGL check ─────────────────────────────────────────────────────────────
function checkWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    if (!gl) return false;
    const buf = (gl as WebGLRenderingContext).createBuffer();
    if (!buf) return false;
    (gl as WebGLRenderingContext).deleteBuffer(buf);
    return true;
  } catch { return false; }
}

// ─── CSS Globe fallback ───────────────────────────────────────────────────────
function CSSGlobe() {
  const stars = useMemo(() =>
    Array.from({ length: 160 }).map((_, i) => ({
      id: i, w: Math.random() * 2.2 + 0.4,
      top: Math.random() * 100, left: Math.random() * 100,
      op: Math.random() * 0.7 + 0.15,
      dur: 2 + Math.random() * 3, delay: Math.random() * 5,
    })), []);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
      style={{ background: "radial-gradient(ellipse 110% 110% at 55% 52%, #041922 0%, #020c12 100%)" }}>
      {stars.map((s) => (
        <div key={s.id} className="absolute rounded-full bg-white"
          style={{ width: s.w, height: s.w, top: s.top + "%", left: s.left + "%",
            opacity: s.op, animation: `eco-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite` }} />
      ))}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 50% 35% at 28% 62%, rgba(16,185,129,0.06) 0%, transparent 60%)" }} />
      <div className="relative" style={{ width: 380, height: 380 }}>
        <div className="absolute -inset-10 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 65%)" }} />
        <div className="absolute -inset-5 rounded-full"
          style={{ border: "1px solid rgba(16,185,129,0.09)", animation: "eco-spin-slow 45s linear infinite" }} />
        <div className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background: "radial-gradient(circle at 34% 30%, #0d9488 0%, #0a5c6e 26%, #052e3c 62%, #020c12 100%)",
            boxShadow: "0 0 80px rgba(16,185,129,0.28), inset -28px -16px 52px rgba(0,0,0,0.6), inset 8px 8px 24px rgba(52,211,153,0.07)",
            animation: "eco-globe-spin 26s linear infinite",
          }}>
          {[20,40,60,80].map((p) => (
            <div key={`h${p}`} className="absolute left-0 right-0 border-t border-emerald-400/[0.07]" style={{ top: p + "%" }} />
          ))}
          {[20,40,60,80].map((p) => (
            <div key={`v${p}`} className="absolute top-0 bottom-0 border-l border-emerald-400/[0.07]" style={{ left: p + "%" }} />
          ))}
          <div className="absolute rounded-full bg-emerald-700/40" style={{ width:"34%", height:"27%", top:"20%", left:"22%", filter:"blur(6px)" }} />
          <div className="absolute rounded-full bg-emerald-600/32" style={{ width:"24%", height:"19%", top:"44%", left:"53%", filter:"blur(5px)" }} />
          <div className="absolute rounded-full bg-emerald-700/36" style={{ width:"28%", height:"22%", top:"26%", left:"56%", filter:"blur(5px)" }} />
          <div className="absolute rounded-full bg-emerald-600/24" style={{ width:"17%", height:"14%", top:"66%", left:"16%", filter:"blur(3px)" }} />
          {/* Night side city lights */}
          {[
            { top:"30%", left:"62%", size:3 }, { top:"42%", left:"70%", size:2 },
            { top:"55%", left:"66%", size:2 }, { top:"35%", left:"74%", size:1.5 },
            { top:"48%", left:"59%", size:2 }, { top:"63%", left:"72%", size:1.5 },
          ].map((c,i) => (
            <div key={i} className="absolute rounded-full bg-yellow-200/60"
              style={{ width:c.size, height:c.size, top:c.top, left:c.left, filter:"blur(0.5px)" }} />
          ))}
          {/* Cloud streaks */}
          <div className="absolute rounded-full bg-white/12" style={{ width:"40%", height:"8%", top:"15%", left:"30%", filter:"blur(5px)", transform:"rotate(-12deg)" }} />
          <div className="absolute rounded-full bg-white/8"  style={{ width:"25%", height:"6%", top:"55%", left:"40%", filter:"blur(4px)", transform:"rotate(8deg)" }} />
          <div className="absolute left-0 right-0 top-0 bg-white/12" style={{ height:"8%", filter:"blur(5px)", borderRadius:"50%" }} />
          <div className="absolute left-0 right-0 bottom-0 bg-white/9"  style={{ height:"7%", filter:"blur(5px)", borderRadius:"50%" }} />
        </div>
        <div className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.08) 0%, transparent 42%)" }} />
        {/* Atmosphere glow */}
        <div className="absolute -inset-3 rounded-full"
          style={{ boxShadow: "0 0 40px rgba(59,130,246,0.35), 0 0 80px rgba(16,185,129,0.18)", borderRadius:"50%" }} />
        <div className="absolute inset-0 rounded-full"
          style={{ boxShadow: "0 0 60px rgba(16,185,129,0.32), 0 0 120px rgba(16,185,129,0.12)" }} />
      </div>
    </div>
  );
}

// ─── 3D Globe mesh ────────────────────────────────────────────────────────────
function GlobeMesh({ rotRef, isDraggingRef }: {
  rotRef: React.MutableRefObject<{ x: number; y: number }>;
  isDraggingRef: React.MutableRefObject<boolean>;
}) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const wireRef   = useRef<THREE.Mesh>(null);
  const cloudRef  = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!sphereRef.current) return;
    if (!isDraggingRef.current) rotRef.current.y += delta * 0.14;
    sphereRef.current.rotation.y = rotRef.current.y;
    sphereRef.current.rotation.x = rotRef.current.x;
    if (wireRef.current) {
      wireRef.current.rotation.y = rotRef.current.y;
      wireRef.current.rotation.x = rotRef.current.x;
    }
    if (cloudRef.current) {
      cloudRef.current.rotation.y = rotRef.current.y + state.clock.elapsedTime * 0.038;
      cloudRef.current.rotation.x = rotRef.current.x * 0.88;
    }
  });

  return (
    <>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial color="#0a5c6e" emissive="#041e2a" emissiveIntensity={0.6} shininess={100} specular="#20e8c0" />
      </mesh>
      <mesh ref={wireRef}>
        <sphereGeometry args={[2.012, 28, 18]} />
        <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.11} />
      </mesh>
      <mesh ref={cloudRef} scale={[1.034, 1.034, 1.034]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#e8f8f5" transparent opacity={0.07} side={THREE.FrontSide} />
      </mesh>
      <mesh scale={[1.08, 1.08, 1.08]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.075} side={THREE.BackSide} />
      </mesh>
      <mesh scale={[1.19, 1.19, 1.19]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
      <mesh scale={[1.36, 1.36, 1.36]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#1d4ed8" transparent opacity={0.025} side={THREE.BackSide} />
      </mesh>
    </>
  );
}

// ─── Premium glassmorphism content card ───────────────────────────────────────
function ContentCard({ dir, progress }: { dir: Dir; progress: number }) {
  const { t } = useTranslation();
  const d = DIRS[dir];
  const visible  = progress > 0.3;
  const bullets  = BULLETS[dir];
  const isDown   = dir === "down";

  const pos = {
    right:  { right: "3%",  top: "50%", transform: "translateY(-50%)", maxWidth: 290 },
    left:   { left: "3%",   top: "50%", transform: "translateY(-50%)", maxWidth: 290 },
    up:     { top: "12%",   left: "50%", transform: "translateX(-50%)", maxWidth: 320 },
    down:   { bottom: "10%",left: "50%", transform: "translateX(-50%)", maxWidth: 320 },
  }[dir];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={dir}
          className="absolute z-30 pointer-events-none"
          style={pos}
          initial={{ opacity: 0, scale: 0.9, y: dir === "up" ? -18 : dir === "down" ? 18 : 0, x: dir === "right" ? 18 : dir === "left" ? -18 : 0 }}
          animate={{ opacity: Math.min(1, (progress - 0.3) * 3.2), scale: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
        >
          {/* Card */}
          <div className="rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: "rgba(4, 14, 10, 0.88)",
              border: "1px solid rgba(16,185,129,0.28)",
              backdropFilter: "blur(22px) saturate(1.6)",
              boxShadow: "0 0 48px rgba(16,185,129,0.14), 0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            {/* Top-right leaf icon */}
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.35)" }}>
              <Leaf className="h-3 w-3 text-emerald-400" />
            </div>

            {/* Title */}
            <h3 className="text-white font-bold text-base leading-snug mb-1 pr-8">
              {t(`${d.key}.label`)}
            </h3>
            {/* Description */}
            <p className="text-white/55 text-[11px] leading-relaxed mb-3">
              {t(`${d.key}.desc`)}
            </p>

            {/* Divider */}
            <div className="h-px mb-3" style={{ background: "rgba(16,185,129,0.15)" }} />

            {/* Bullet list */}
            <div className="space-y-1.5 mb-3">
              {bullets.map((b) => (
                <div key={b.text} className="flex items-center gap-2">
                  <span className="text-[12px] w-4 shrink-0">{b.icon}</span>
                  <span className="text-[11px] text-white/70 font-medium">{b.text}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            {isDown ? (
              <Link href={d.path} className="pointer-events-auto">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold text-white w-fit"
                  style={{ background: ECO, boxShadow: "0 4px 18px rgba(16,185,129,0.4)" }}
                >
                  Start Your Journey <ChevronRight className="h-3 w-3" />
                </motion.div>
              </Link>
            ) : (
              <Link href={d.path} className="pointer-events-auto">
                <span className="text-[11px] font-semibold flex items-center gap-1 hover:gap-2 transition-all" style={{ color: ECO }}>
                  Explore More <ChevronRight className="h-3 w-3" />
                </span>
              </Link>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Direction arrow hint ─────────────────────────────────────────────────────
function DirectionHint({ dir, active, progress }: { dir: Dir; active: boolean; progress: number }) {
  const { t } = useTranslation();
  const d = DIRS[dir];
  const Icon = { right: ArrowRight, left: ArrowLeft, up: ArrowUp, down: ArrowDown }[dir];
  const pos = {
    right: "right-4 top-1/2 -translate-y-1/2 flex-col items-end text-right",
    left:  "left-4  top-1/2 -translate-y-1/2 flex-col items-start",
    up:    "top-[72px] left-1/2 -translate-x-1/2 flex-col items-center",
    down:  "bottom-14 left-1/2 -translate-x-1/2 flex-col items-center",
  }[dir];

  return (
    <motion.div
      className={`absolute flex ${pos} gap-1.5 pointer-events-none z-20`}
      animate={{ opacity: active ? 1 : 0.4, scale: active ? 1.06 : 1 }}
      transition={{ duration: 0.16 }}
    >
      <motion.div
        className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm"
        style={{
          border: `1.5px solid ${active ? ECO : "rgba(255,255,255,0.18)"}`,
          background: active ? ECO + "22" : "rgba(255,255,255,0.07)",
          boxShadow: active ? `0 0 22px ${ECO}55` : undefined,
        }}
      >
        <Icon className="h-4 w-4 text-white/90" />
      </motion.div>
      <div className={dir === "left" ? "ml-1" : ""}>
        <p className="text-xs font-semibold text-white/80 leading-tight">{t(`${d.key}.label`)}</p>
        <p className="text-[10px]" style={{ color: active ? ECO : "rgba(255,255,255,0.32)" }}>
          {progress > 0.2 ? t(`${d.key}.cta`) : t(`${d.key}.dir`)}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Mini CSS globe for explainer section ────────────────────────────────────
function MiniGlobe({ size = 96 }: { size?: number }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div className="absolute -inset-3 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)" }} />
      <div className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          background: "radial-gradient(circle at 33% 32%, #1a7a8a 0%, #0a5c6e 35%, #052e3c 65%, #010c14 100%)",
          boxShadow: "0 0 28px rgba(59,130,246,0.5), 0 0 10px rgba(16,185,129,0.4), inset -8px -5px 16px rgba(0,0,0,0.6)",
        }}
      >
        {[25,55,78].map((p) => (
          <div key={`h${p}`} className="absolute left-0 right-0 border-t border-emerald-400/[0.12]" style={{ top: p + "%" }} />
        ))}
        {[30,60].map((p) => (
          <div key={`v${p}`} className="absolute top-0 bottom-0 border-l border-emerald-400/[0.12]" style={{ left: p + "%" }} />
        ))}
        <div className="absolute rounded-full bg-emerald-700/45" style={{ width:"32%", height:"24%", top:"25%", left:"20%", filter:"blur(3px)" }} />
        <div className="absolute rounded-full bg-emerald-600/35" style={{ width:"22%", height:"18%", top:"46%", left:"52%", filter:"blur(2px)" }} />
        {/* City lights */}
        {[{top:"32%",left:"60%"},{top:"44%",left:"68%"},{top:"55%",left:"62%"}].map((c,i) => (
          <div key={i} className="absolute rounded-full bg-yellow-200/70"
            style={{ width:2, height:2, top:c.top, left:c.left }} />
        ))}
        <div className="absolute rounded-full bg-white/14" style={{ width:"35%", height:"6%", top:"18%", left:"28%", filter:"blur(3px)", transform:"rotate(-10deg)" }} />
      </div>
      <div className="absolute inset-0 rounded-full"
        style={{ background: "radial-gradient(circle at 28% 26%, rgba(255,255,255,0.09) 0%, transparent 38%)" }} />
      {/* Blue atmospheric rim */}
      <div className="absolute -inset-1 rounded-full"
        style={{ boxShadow: "0 0 18px rgba(59,130,246,0.4), 0 0 35px rgba(16,185,129,0.15)", borderRadius: "50%", pointerEvents: "none" }} />
    </div>
  );
}

// ─── Explainer card (static, for below-fold section) ─────────────────────────
function ExplainerCard({ dir }: { dir: Dir }) {
  const { t } = useTranslation();
  const d      = DIRS[dir];
  const bullets = BULLETS[dir];
  const isDown  = dir === "down";
  const arrow   = { right: "→", left: "←", up: "↑", down: "↓" }[dir];

  return (
    <div className="flex gap-5 items-start">
      <div className="flex flex-col items-center gap-3 flex-shrink-0">
        <MiniGlobe size={88} />
        <span className="text-3xl font-black" style={{ color: ECO }}>{arrow}</span>
      </div>
      <div className="flex-1 rounded-2xl p-5"
        style={{
          background: "rgba(4,14,10,0.85)",
          border: "1px solid rgba(16,185,129,0.22)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        {/* Leaf badge */}
        <div className="flex items-start justify-between mb-2">
          <h4 className="text-white font-bold text-sm leading-tight pr-4">{t(`${d.key}.label`)}</h4>
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.38)" }}>
            <Leaf className="h-2.5 w-2.5 text-emerald-400" />
          </div>
        </div>
        <p className="text-white/50 text-[11px] leading-relaxed mb-3">{t(`${d.key}.desc`)}</p>
        <div className="space-y-1.5">
          {bullets.map((b) => (
            <div key={b.text} className="flex items-center gap-2">
              <span className="text-[11px] shrink-0">{b.icon}</span>
              <span className="text-[11px] text-white/65 font-medium">{b.text}</span>
            </div>
          ))}
        </div>
        {isDown && (
          <Link href={d.path}>
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold text-white w-fit"
              style={{ background: ECO, boxShadow: "0 3px 14px rgba(16,185,129,0.4)" }}
            >
              Start Your Journey <ChevronRight className="h-3 w-3" />
            </motion.div>
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function Landing() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const webgl = useMemo(() => checkWebGL(), []);

  const rotRef        = useRef({ x: 0, y: 0 });
  const dragRef       = useRef({ active: false, startX: 0, startY: 0, lastX: 0, lastY: 0 });
  const isDraggingRef = useRef(false);

  const [isDragging,   setIsDragging]   = useState(false);
  const [activeDir,    setActiveDir]    = useState<Dir | null>(null);
  const [dragProgress, setDragProgress] = useState(0);
  const [flashDir,     setFlashDir]     = useState<Dir | null>(null);

  const CARD_THRESHOLD = 50;
  const NAV_THRESHOLD  = 118;

  const getDir = (dx: number, dy: number): Dir | null => {
    if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return null;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy < 0 ? "up" : "down");
  };

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY };
    isDraggingRef.current = true;
    setIsDragging(true);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    rotRef.current.y += dx * 0.013;
    rotRef.current.x  = Math.max(-0.85, Math.min(0.85, rotRef.current.x + dy * 0.013));
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    const tdx  = e.clientX - dragRef.current.startX;
    const tdy  = e.clientY - dragRef.current.startY;
    const dist = Math.hypot(tdx, tdy);
    const dir  = dist > 14 ? getDir(tdx, tdy) : null;
    setActiveDir(dir);
    setDragProgress(Math.min(1, dist / NAV_THRESHOLD));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    isDraggingRef.current  = false;
    setIsDragging(false);
    setActiveDir(null);
    setDragProgress(0);
    const dx  = e.clientX - dragRef.current.startX;
    const dy  = e.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > NAV_THRESHOLD) {
      const dir = getDir(dx, dy);
      if (dir) { setFlashDir(dir); setTimeout(() => navigate(DIRS[dir].path), 420); }
    }
  }, [navigate]);

  return (
    <>
      <style>{`
        @keyframes eco-twinkle   { 0%,100%{opacity:0.1}  50%{opacity:0.95} }
        @keyframes eco-globe-spin{ from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes eco-spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO — full viewport, drag-enabled
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="relative w-screen overflow-hidden"
        style={{
          height: "100vh",
          background: "#020c12",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Globe */}
        <div className="absolute inset-0">
          {webgl ? (
            <Canvas camera={{ position: [0, 0, 5.5], fov: 44 }} dpr={[1, 1.5]}>
              <Stars radius={130} depth={65} count={10000} factor={5} saturation={0} fade speed={0.35} />
              <ambientLight intensity={0.22} />
              <directionalLight position={[7, 4, 5]} intensity={2.4} color="#fff6e0" />
              <pointLight position={[-6, 1, -2]} intensity={1.0} color="#34d399" />
              <pointLight position={[0, -5, 3]} intensity={0.2} color="#1d4ed8" />
              <GlobeMesh rotRef={rotRef} isDraggingRef={isDraggingRef} />
            </Canvas>
          ) : (
            <CSSGlobe />
          )}
        </div>

        {/* Radial vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 28%, #020c12 100%)"
        }} />

        {/* Ambient accent on drag */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: activeDir
            ? `radial-gradient(ellipse 55% 55% at 50% 50%, rgba(16,185,129,0.09) 0%, transparent 70%)`
            : undefined,
          transition: "background 0.4s ease",
        }} />

        {/* ── Top navigation bar ─────────────────────────────────────────── */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-5 z-30">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.35)" }}>
              <Leaf className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">EcoTrace</span>
          </div>
          {/* Right controls */}
          <div className="flex items-center gap-2.5">
            <span className="hidden md:flex items-center gap-1.5 text-white/40 text-xs">
              <span className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center text-[8px]">↺</span>
              Rotate Earth to Explore
            </span>
            <LanguageSwitcher dark />
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-sm font-semibold"
                style={{ background: ECO, boxShadow: "0 0 24px rgba(16,185,129,0.45)" }}
              >
                {t("openApp")} <ChevronRight className="h-3.5 w-3.5" />
              </motion.button>
            </Link>
          </div>
        </div>

        {/* ── Left hero text ─────────────────────────────────────────────── */}
        <motion.div
          className="absolute left-8 md:left-14 pointer-events-none z-20"
          style={{ top: "50%", transform: "translateY(-44%)" }}
          animate={{ opacity: dragProgress > 0.55 ? 0.2 : 1 }}
          transition={{ duration: 0.28 }}
        >
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-white/90 text-3xl md:text-5xl font-bold leading-tight"
          >
            Small Actions
          </motion.p>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-4xl md:text-6xl font-black leading-tight mb-4"
            style={{ color: ECO }}
          >
            Big Impact
          </motion.p>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="text-white/45 text-sm leading-relaxed max-w-[220px]"
          >
            {t("center.sub")}
          </motion.p>
          {/* Vertical dots decoration */}
          <div className="flex flex-col gap-1.5 mt-6">
            {[1,0.55,0.3].map((op,i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                style={{ opacity: op }} />
            ))}
          </div>
        </motion.div>

        {/* ── Direction hints ────────────────────────────────────────────── */}
        {(["right","left","up","down"] as Dir[]).map((dir) => (
          <DirectionHint
            key={dir}
            dir={dir}
            active={activeDir === dir}
            progress={activeDir === dir ? dragProgress : 0}
          />
        ))}

        {/* ── Content cards ──────────────────────────────────────────────── */}
        {activeDir && <ContentCard dir={activeDir} progress={dragProgress} />}

        {/* ── Navigate threshold pill ────────────────────────────────────── */}
        {isDragging && dragProgress > 0.62 && activeDir && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-x-0 bottom-6 flex justify-center z-30 pointer-events-none"
          >
            <div className="px-5 py-2 rounded-full text-sm font-semibold text-white backdrop-blur-sm"
              style={{
                background: "rgba(16,185,129,0.25)",
                border: "1.5px solid rgba(16,185,129,0.55)",
                boxShadow: "0 0 22px rgba(16,185,129,0.4)",
              }}
            >
              {t(`${activeDir}.cta`)} →
            </div>
          </motion.div>
        )}

        {/* ── Bottom hint bar ────────────────────────────────────────────── */}
        <motion.div
          animate={{ opacity: isDragging || dragProgress > 0.08 ? 0 : 1 }}
          transition={{ delay: isDragging ? 0 : 1.5, duration: 0.7 }}
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-20 pointer-events-none"
        >
          {/* Pulse indicator */}
          <div className="flex items-center gap-2">
            <div className="relative w-7 h-7">
              <motion.div animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.2, repeat: Infinity }}
                className="absolute inset-0 rounded-full border border-emerald-400/50" />
              <div className="absolute inset-1.5 rounded-full bg-emerald-500/25 border border-emerald-400/40" />
            </div>
            <span className="text-white/38 text-[10px] tracking-[0.22em] uppercase">{t("dragHint")}</span>
          </div>
          {/* Social icons */}
          <div className="flex items-center gap-3">
            {["f","𝕏","in"].map((s) => (
              <div key={s} className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white/30"
                style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
                {s}
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Flash transition ────────────────────────────────────────────── */}
        <AnimatePresence>
          {flashDir && (
            <motion.div key="flash"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.42 }}
              className="absolute inset-0 z-50 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, rgba(16,185,129,0.45) 0%, #020c12 75%)" }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          EXPLAINER — below fold, scrollable
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="w-full" style={{ background: "#030f0a" }}>
        {/* Divider glow */}
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.3), transparent)" }} />

        <div className="max-w-4xl mx-auto px-6 py-16">
          {/* Section heading */}
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold tracking-[0.35em] uppercase mb-3" style={{ color: ECO }}>
              HOW TO EXPLORE
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Rotate Earth to Discover
            </h2>
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight" style={{ color: ECO }}>
              4 Key Directions
            </h2>
          </div>

          {/* 2×2 grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Labels + cards */}
            {[
              { dir: "right" as Dir, label: "RIGHT" },
              { dir: "left"  as Dir, label: "LEFT"  },
              { dir: "up"    as Dir, label: "UP"    },
              { dir: "down"  as Dir, label: "DOWN"  },
            ].map(({ dir, label }) => (
              <div key={dir} className="flex flex-col gap-3">
                <p className="text-[10px] font-bold tracking-[0.28em] uppercase" style={{ color: ECO }}>
                  {label}
                </p>
                <ExplainerCard dir={dir} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          FOOTER STRIP
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ background: "#020c12", borderTop: "1px solid rgba(16,185,129,0.12)" }}>
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <Leaf className="h-3 w-3 text-emerald-400" />
            </div>
            <p className="text-sm text-white/50">
              Every Rotation Brings You Closer to a{" "}
              <span className="text-white font-semibold">Better Planet</span>{" "}
              <span className="text-emerald-400">🌿</span>
            </p>
          </div>
          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="text-xs font-semibold px-4 py-2 rounded-full"
              style={{ color: ECO, border: `1px solid rgba(16,185,129,0.3)`, background: "rgba(16,185,129,0.07)" }}
            >
              {t("openApp")} →
            </motion.button>
          </Link>
        </div>
      </div>
    </>
  );
}
