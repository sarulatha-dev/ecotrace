import { useRef, useState, useCallback, useMemo, Component, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { Leaf, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { Link } from "wouter";

const NAV_DESTINATIONS = {
  right: { path: "/challenges",  label: "Challenges", color: "#10b981", description: "Join eco challenges" },
  left:  { path: "/insights",    label: "Insights",   color: "#6366f1", description: "View your analytics" },
  up:    { path: "/dashboard",   label: "Dashboard",  color: "#f59e0b", description: "Your carbon overview" },
  down:  { path: "/rewards",     label: "Rewards",    color: "#ec4899", description: "Eco coins & cashback" },
};

// ── Detect WebGL support synchronously ──────────────────────────────────────
function checkWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    if (!gl) return false;
    // Verify context is actually usable (GPU available)
    const glCtx = gl as WebGLRenderingContext;
    const buf = glCtx.createBuffer();
    if (!buf) return false;
    glCtx.deleteBuffer(buf);
    return true;
  } catch {
    return false;
  }
}

// ── CSS Fallback Globe (when WebGL unavailable) ──────────────────────────────
function CSSGlobe() {
  const stars = useMemo(() =>
    Array.from({ length: 130 }).map((_, i) => ({
      id: i,
      w: Math.random() * 2 + 0.5,
      top: Math.random() * 100,
      left: Math.random() * 100,
      op: Math.random() * 0.6 + 0.15,
      dur: 2 + Math.random() * 3,
      delay: Math.random() * 3,
    })), []);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ background: "radial-gradient(ellipse 100% 100% at 50% 50%, #041a26 0%, #020e14 100%)" }}
    >
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            width: s.w, height: s.w,
            top: s.top + "%", left: s.left + "%",
            opacity: s.op,
            animation: `eco-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}

      <div className="relative" style={{ width: 300, height: 300 }}>
        {/* Outer halo */}
        <div
          className="absolute inset-[-16px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)" }}
        />
        {/* Main sphere */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background: "radial-gradient(circle at 32% 30%, #0d9488 0%, #0a5c6e 28%, #042f3a 65%, #020e14 100%)",
            boxShadow: "0 0 60px rgba(16,185,129,0.22), inset -22px -12px 40px rgba(0,0,0,0.55)",
            animation: "eco-globe-spin 20s linear infinite",
          }}
        >
          {/* Grid */}
          {[22, 44, 66, 88].map((p) => (
            <div key={`h${p}`} className="absolute left-0 right-0 border-t border-emerald-400/10" style={{ top: p + "%" }} />
          ))}
          {[22, 44, 66, 88].map((p) => (
            <div key={`v${p}`} className="absolute top-0 bottom-0 border-l border-emerald-400/10" style={{ left: p + "%" }} />
          ))}
          {/* Continents */}
          <div className="absolute rounded-full bg-emerald-700/40" style={{ width: "32%", height: "26%", top: "22%", left: "24%", filter: "blur(5px)" }} />
          <div className="absolute rounded-full bg-emerald-600/32" style={{ width: "22%", height: "18%", top: "46%", left: "54%", filter: "blur(4px)" }} />
          <div className="absolute rounded-full bg-emerald-700/36" style={{ width: "26%", height: "22%", top: "28%", left: "58%", filter: "blur(5px)" }} />
          <div className="absolute rounded-full bg-emerald-600/26" style={{ width: "16%", height: "14%", top: "66%", left: "18%", filter: "blur(3px)" }} />
        </div>
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-full" style={{ boxShadow: "0 0 50px rgba(16,185,129,0.3), 0 0 100px rgba(16,185,129,0.1)" }} />
      </div>
    </div>
  );
}

// ── 3D Globe (Three.js / react-three-fiber) ──────────────────────────────────
function GlobeMesh({ rotRef, isDraggingRef }: {
  rotRef: React.MutableRefObject<{ x: number; y: number }>;
  isDraggingRef: React.MutableRefObject<boolean>;
}) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const wireRef   = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!sphereRef.current) return;
    if (!isDraggingRef.current) rotRef.current.y += delta * 0.18;
    sphereRef.current.rotation.y = rotRef.current.y;
    sphereRef.current.rotation.x = rotRef.current.x;
    if (wireRef.current) {
      wireRef.current.rotation.y = rotRef.current.y;
      wireRef.current.rotation.x = rotRef.current.x;
    }
  });

  return (
    <>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial color="#0a5c6e" emissive="#062e3a" shininess={60} specular="#1de9b6" />
      </mesh>
      <mesh ref={wireRef}>
        <sphereGeometry args={[2.005, 28, 18]} />
        <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.18} />
      </mesh>
      <mesh scale={[1.06, 1.06, 1.06]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.055} side={THREE.BackSide} />
      </mesh>
    </>
  );
}

// ── Direction hint overlay ────────────────────────────────────────────────────
function DirectionHint({ dir, active }: { dir: keyof typeof NAV_DESTINATIONS; active: boolean }) {
  const dest = NAV_DESTINATIONS[dir];
  const Icon = { right: ArrowRight, left: ArrowLeft, up: ArrowUp, down: ArrowDown }[dir];
  const pos = {
    right: "right-5 top-1/2 -translate-y-1/2 flex-col items-end text-right",
    left:  "left-5  top-1/2 -translate-y-1/2 flex-col items-start text-left",
    up:    "top-20  left-1/2 -translate-x-1/2 flex-col items-center",
    down:  "bottom-16 left-1/2 -translate-x-1/2 flex-col items-center",
  }[dir];

  return (
    <motion.div
      className={`absolute flex ${pos} gap-1.5 pointer-events-none z-20`}
      animate={{ opacity: active ? 1 : 0.48, scale: active ? 1.08 : 1 }}
      transition={{ duration: 0.18 }}
    >
      <div
        className="w-9 h-9 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center"
        style={{ boxShadow: active ? `0 0 22px ${dest.color}70` : undefined }}
      >
        <Icon className="h-4 w-4 text-white/90" />
      </div>
      <div>
        <p className="text-xs font-semibold text-white/90">{dest.label}</p>
        <p className="text-[10px] text-white/45">{dest.description}</p>
      </div>
    </motion.div>
  );
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function Landing() {
  const [, navigate] = useLocation();

  // Check WebGL once — synchronously on mount (no SSR in this app)
  const webgl = useMemo(() => checkWebGL(), []);

  const rotRef        = useRef({ x: 0, y: 0 });
  const dragRef       = useRef({ active: false, startX: 0, startY: 0, lastX: 0, lastY: 0 });
  const isDraggingRef = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  const [activeDir,  setActiveDir]  = useState<keyof typeof NAV_DESTINATIONS | null>(null);
  const [flashDir,   setFlashDir]   = useState<keyof typeof NAV_DESTINATIONS | null>(null);

  const THRESHOLD = 90;

  const getDir = (dx: number, dy: number): keyof typeof NAV_DESTINATIONS | null => {
    if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return null;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy < 0 ? "up" : "down");
  };

  const onDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY };
    isDraggingRef.current = true;
    setIsDragging(true);
  }, []);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    rotRef.current.y += dx * 0.012;
    rotRef.current.x = Math.max(-0.8, Math.min(0.8, rotRef.current.x + dy * 0.012));
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    const tdx = e.clientX - dragRef.current.startX;
    const tdy = e.clientY - dragRef.current.startY;
    setActiveDir(Math.hypot(tdx, tdy) > THRESHOLD / 2 ? getDir(tdx, tdy) : null);
  }, []);

  const onUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    isDraggingRef.current = false;
    setIsDragging(false);
    setActiveDir(null);
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > THRESHOLD) {
      const dir = getDir(dx, dy);
      if (dir) { setFlashDir(dir); setTimeout(() => navigate(NAV_DESTINATIONS[dir].path), 380); }
    }
  }, [navigate]);

  return (
    <>
      <style>{`
        @keyframes eco-twinkle    { 0%,100%{opacity:0.15} 50%{opacity:0.85} }
        @keyframes eco-globe-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      <div
        className="relative w-screen h-screen overflow-hidden bg-[#020e14]"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        {/* Globe: 3D if WebGL available, else CSS */}
        <div className="absolute inset-0">
          {webgl ? (
            <Canvas camera={{ position: [0, 0, 5.5], fov: 42 }} dpr={[1, 1.5]}>
              <Stars radius={90} depth={60} count={6000} factor={4} saturation={0} fade speed={0.6} />
              <ambientLight intensity={0.5} />
              <directionalLight position={[6, 4, 6]} intensity={1.8} />
              <pointLight position={[-6, -3, -3]} intensity={0.4} color="#34d399" />
              <GlobeMesh rotRef={rotRef} isDraggingRef={isDraggingRef} />
            </Canvas>
          ) : (
            <CSSGlobe />
          )}
        </div>

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 85% 85% at 50% 50%, transparent 35%, #020e14 100%)" }}
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-5 pointer-events-none z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Leaf className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">EcoTrace</span>
          </div>
          <Link href="/dashboard" className="pointer-events-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-semibold"
              style={{ boxShadow: "0 0 24px rgba(16,185,129,0.45)" }}
            >
              Open App <ChevronRight className="h-3.5 w-3.5" />
            </motion.button>
          </Link>
        </div>

        {/* Hero text */}
        <div className="absolute inset-x-0 top-[11%] flex flex-col items-center text-center pointer-events-none z-20 px-4">
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="text-emerald-400/80 text-xs font-semibold tracking-[0.22em] uppercase mb-3"
          >
            Carbon Footprint Platform
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-4xl md:text-6xl font-extrabold text-white leading-tight"
          >
            Track Your Carbon.
            <br />
            <span className="text-emerald-400">Change Your World.</span>
          </motion.h1>
        </div>

        {/* Drag hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isDragging ? 0 : 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-20"
        >
          <div className="relative w-10 h-10">
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.2, repeat: Infinity }}
              className="absolute inset-0 rounded-full border border-emerald-400/50"
            />
            <div className="absolute inset-2 rounded-full bg-emerald-500/25 border border-emerald-400/40" />
          </div>
          <p className="text-white/45 text-[11px] tracking-[0.18em] uppercase">Drag to navigate</p>
        </motion.div>

        {/* Direction hints */}
        {(["right", "left", "up", "down"] as const).map((dir) => (
          <DirectionHint key={dir} dir={dir} active={activeDir === dir} />
        ))}

        {/* Flash transition */}
        <AnimatePresence>
          {flashDir && (
            <motion.div
              key="flash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.38 }}
              className="absolute inset-0 z-50 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at center, ${NAV_DESTINATIONS[flashDir].color}44 0%, #020e14 80%)` }}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
