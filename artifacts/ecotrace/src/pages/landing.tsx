import { useRef, useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import * as THREE from "three";
import {
  Leaf, ChevronRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Zap, Globe, TrendingDown, Award,
} from "lucide-react";
import { Link } from "wouter";
import LanguageSwitcher from "../components/language-switcher";

// ─────────────────────────────────────────────────────────────────────────────
// Navigation map: drag direction → app route + content key + accent color
// ─────────────────────────────────────────────────────────────────────────────
const DIRS = {
  right: { path: "/challenges", key: "right", color: "#10b981", icon: Globe },
  left:  { path: "/insights",   key: "left",  color: "#6366f1", icon: TrendingDown },
  up:    { path: "/dashboard",  key: "up",    color: "#f59e0b", icon: Zap },
  down:  { path: "/rewards",    key: "down",  color: "#ec4899", icon: Award },
} as const;
type Dir = keyof typeof DIRS;

// ─────────────────────────────────────────────────────────────────────────────
// WebGL check — synchronous, before any Three.js canvas mounts
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// CSS Fallback Globe (no WebGL)
// ─────────────────────────────────────────────────────────────────────────────
function CSSGlobe() {
  const stars = useMemo(() =>
    Array.from({ length: 140 }).map((_, i) => ({
      id: i, w: Math.random() * 2.2 + 0.4,
      top: Math.random() * 100, left: Math.random() * 100,
      op: Math.random() * 0.65 + 0.12,
      dur: 2 + Math.random() * 3.2, delay: Math.random() * 4,
    })), []);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
      style={{ background: "radial-gradient(ellipse 110% 110% at 50% 55%, #041922 0%, #020c12 100%)" }}>
      {stars.map((s) => (
        <div key={s.id} className="absolute rounded-full bg-white"
          style={{ width: s.w, height: s.w, top: s.top + "%", left: s.left + "%",
            opacity: s.op, animation: `eco-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite` }} />
      ))}

      {/* Ambient nebula */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 40% at 30% 60%, rgba(16,185,129,0.05) 0%, transparent 60%), radial-gradient(ellipse 40% 50% at 70% 35%, rgba(99,102,241,0.04) 0%, transparent 60%)" }} />

      <div className="relative" style={{ width: 320, height: 320 }}>
        {/* Outer atmosphere glow */}
        <div className="absolute -inset-8 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 65%)" }} />
        {/* Second ring */}
        <div className="absolute -inset-4 rounded-full"
          style={{ border: "1px solid rgba(16,185,129,0.08)", borderRadius: "50%", animation: "eco-spin-slow 40s linear infinite" }} />

        {/* Main sphere */}
        <div className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background: "radial-gradient(circle at 34% 30%, #0d9488 0%, #0a5c6e 26%, #052e3c 62%, #020c12 100%)",
            boxShadow: "0 0 70px rgba(16,185,129,0.22), inset -24px -14px 48px rgba(0,0,0,0.55), inset 6px 6px 20px rgba(52,211,153,0.06)",
            animation: "eco-globe-spin 22s linear infinite",
          }}>
          {/* Grid lines */}
          {[20,40,60,80].map((p) => (
            <div key={`h${p}`} className="absolute left-0 right-0 border-t border-emerald-400/[0.09]" style={{ top: p + "%" }} />
          ))}
          {[20,40,60,80].map((p) => (
            <div key={`v${p}`} className="absolute top-0 bottom-0 border-l border-emerald-400/[0.09]" style={{ left: p + "%" }} />
          ))}
          {/* Land blobs */}
          <div className="absolute rounded-full bg-emerald-700/42" style={{ width: "33%", height: "27%", top: "21%", left: "22%", filter: "blur(5px)" }} />
          <div className="absolute rounded-full bg-emerald-600/34" style={{ width: "23%", height: "19%", top: "45%", left: "53%", filter: "blur(4px)" }} />
          <div className="absolute rounded-full bg-emerald-700/37" style={{ width: "27%", height: "22%", top: "27%", left: "57%", filter: "blur(5px)" }} />
          <div className="absolute rounded-full bg-emerald-600/26" style={{ width: "16%", height: "14%", top: "67%", left: "17%", filter: "blur(3px)" }} />
          <div className="absolute rounded-full bg-teal-600/20" style={{ width: "12%", height: "10%", top: "74%", left: "60%", filter: "blur(3px)" }} />
          {/* Ice caps */}
          <div className="absolute left-0 right-0 top-0 bg-white/10" style={{ height: "7%", filter: "blur(4px)", borderRadius: "50%" }} />
          <div className="absolute left-0 right-0 bottom-0 bg-white/8" style={{ height: "6%", filter: "blur(4px)", borderRadius: "50%" }} />
        </div>

        {/* Specular highlight */}
        <div className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.07) 0%, transparent 45%)" }} />
        {/* Glow */}
        <div className="absolute inset-0 rounded-full"
          style={{ boxShadow: "0 0 55px rgba(16,185,129,0.3), 0 0 110px rgba(16,185,129,0.1)" }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3-D Globe mesh
// ─────────────────────────────────────────────────────────────────────────────
function GlobeMesh({ rotRef, isDraggingRef }: {
  rotRef: React.MutableRefObject<{ x: number; y: number }>;
  isDraggingRef: React.MutableRefObject<boolean>;
}) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const wireRef   = useRef<THREE.Mesh>(null);
  const cloudRef  = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!sphereRef.current) return;
    if (!isDraggingRef.current) rotRef.current.y += delta * 0.16;
    sphereRef.current.rotation.y = rotRef.current.y;
    sphereRef.current.rotation.x = rotRef.current.x;
    if (wireRef.current) {
      wireRef.current.rotation.y = rotRef.current.y;
      wireRef.current.rotation.x = rotRef.current.x;
    }
    // Clouds rotate slightly faster for parallax
    if (cloudRef.current) {
      cloudRef.current.rotation.y = rotRef.current.y + state.clock.elapsedTime * 0.04;
      cloudRef.current.rotation.x = rotRef.current.x * 0.9;
    }
  });

  return (
    <>
      {/* Core sphere — deep ocean + land tones */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial
          color="#0a5c6e"
          emissive="#041e2a"
          emissiveIntensity={0.55}
          shininess={90}
          specular="#20e8c0"
        />
      </mesh>

      {/* Wireframe lat/lon grid */}
      <mesh ref={wireRef}>
        <sphereGeometry args={[2.012, 28, 18]} />
        <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.13} />
      </mesh>

      {/* Cloud layer — drifts independently */}
      <mesh ref={cloudRef} scale={[1.035, 1.035, 1.035]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#e0f7f0" transparent opacity={0.065} side={THREE.FrontSide} />
      </mesh>

      {/* Inner atmosphere rim — close glow */}
      <mesh scale={[1.08, 1.08, 1.08]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.072} side={THREE.BackSide} />
      </mesh>

      {/* Mid atmosphere */}
      <mesh scale={[1.18, 1.18, 1.18]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.038} side={THREE.BackSide} />
      </mesh>

      {/* Outer halo — wide diffuse rim light */}
      <mesh scale={[1.34, 1.34, 1.34]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#064e3b" transparent opacity={0.022} side={THREE.BackSide} />
      </mesh>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Glassmorphism content card
// ─────────────────────────────────────────────────────────────────────────────
function ContentCard({ dir, progress }: { dir: Dir; progress: number }) {
  const { t } = useTranslation();
  const d = DIRS[dir];
  const Icon = d.icon;
  const visible = progress > 0.35;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={dir}
          initial={{ opacity: 0, scale: 0.88, y: dir === "up" ? -20 : dir === "down" ? 20 : 0,
            x: dir === "right" ? 20 : dir === "left" ? -20 : 0 }}
          animate={{ opacity: Math.min(1, (progress - 0.35) * 3), scale: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="absolute z-30 pointer-events-none"
          style={{
            ...(dir === "right" ? { right: "5%",  top: "50%", transform: "translateY(-50%)", maxWidth: 260 } : {}),
            ...(dir === "left"  ? { left: "5%",   top: "50%", transform: "translateY(-50%)", maxWidth: 260 } : {}),
            ...(dir === "up"    ? { top: "14%",   left: "50%", transform: "translateX(-50%)", maxWidth: 320 } : {}),
            ...(dir === "down"  ? { bottom: "12%", left: "50%", transform: "translateX(-50%)", maxWidth: 320 } : {}),
          }}
        >
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(4,22,30,0.72)",
              border: `1px solid ${d.color}44`,
              backdropFilter: "blur(20px) saturate(1.4)",
              boxShadow: `0 0 40px ${d.color}22, 0 8px 32px rgba(0,0,0,0.4)`,
            }}
          >
            {/* Tag */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: d.color + "22", border: `1px solid ${d.color}44` }}>
                <Icon className="h-3.5 w-3.5" style={{ color: d.color }} />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: d.color }}>
                {t(`${d.key}.dir`)}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-white font-bold text-base leading-tight mb-2">
              {t(`${d.key}.label`)}
            </h3>

            {/* Body */}
            <p className="text-white/60 text-xs leading-relaxed mb-3">
              {t(`${d.key}.desc`)}
            </p>

            {/* Fact pill */}
            <div className="rounded-lg px-3 py-2 text-[11px] font-medium"
              style={{ background: d.color + "18", color: d.color, border: `1px solid ${d.color}33` }}>
              💡 {t(`${d.key}.fact`)}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Direction arrow hint
// ─────────────────────────────────────────────────────────────────────────────
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
      animate={{ opacity: active ? 1 : 0.44, scale: active ? 1.06 : 1 }}
      transition={{ duration: 0.16 }}
    >
      <motion.div
        className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm"
        style={{
          border: `1.5px solid ${active ? d.color : "rgba(255,255,255,0.2)"}`,
          background: active ? d.color + "22" : "rgba(255,255,255,0.08)",
          boxShadow: active ? `0 0 24px ${d.color}55` : undefined,
        }}
      >
        <Icon className="h-4 w-4 text-white/90" />
      </motion.div>
      <div className={dir === "left" ? "ml-1" : ""}>
        <p className="text-xs font-semibold text-white/85 leading-tight">{t(`${d.key}.label`)}</p>
        <p className="text-[10px]" style={{ color: active ? d.color : "rgba(255,255,255,0.35)" }}>
          {progress > 0.2 ? t(`${d.key}.cta`) : t(`${d.key}.dir`)}
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hotspot popup
// ─────────────────────────────────────────────────────────────────────────────
function HotspotPopup({ visible, text, x, y }: { visible: boolean; text: string; x: number; y: number }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={text}
          initial={{ opacity: 0, scale: 0.82, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 4 }}
          transition={{ type: "spring", stiffness: 420, damping: 24 }}
          className="fixed z-50 pointer-events-none px-3 py-2 rounded-xl text-xs font-medium text-white/90"
          style={{
            left: x, top: y - 52,
            background: "rgba(4,22,30,0.88)",
            border: "1px solid rgba(16,185,129,0.3)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4), 0 0 12px rgba(16,185,129,0.15)",
            whiteSpace: "nowrap",
          }}
        >
          {text}
          {/* Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
            style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid rgba(4,22,30,0.88)" }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Landing Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Landing() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const webgl = useMemo(() => checkWebGL(), []);

  const rotRef        = useRef({ x: 0, y: 0 });
  const dragRef       = useRef({ active: false, startX: 0, startY: 0, lastX: 0, lastY: 0 });
  const isDraggingRef = useRef(false);

  const [isDragging, setIsDragging]   = useState(false);
  const [activeDir,  setActiveDir]    = useState<Dir | null>(null);
  const [dragProgress, setDragProgress] = useState(0); // 0–1 (0=center, 1=navigate)
  const [flashDir,   setFlashDir]     = useState<Dir | null>(null);

  // Hotspot popup state
  const [popup, setPopup] = useState({ visible: false, text: "", x: 0, y: 0 });

  const CARD_THRESHOLD = 55;   // px before card appears
  const NAV_THRESHOLD  = 120;  // px to navigate

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

  // Hotspot hover handlers
  const showPopup = useCallback((text: string, e: React.MouseEvent) => {
    setPopup({ visible: true, text, x: e.clientX, y: e.clientY });
  }, []);
  const hidePopup = useCallback(() => setPopup((p) => ({ ...p, visible: false })), []);

  return (
    <>
      {/* Keyframe styles */}
      <style>{`
        @keyframes eco-twinkle    { 0%,100%{opacity:0.12} 50%{opacity:0.9} }
        @keyframes eco-globe-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes eco-spin-slow  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes eco-float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>

      <div
        className="relative w-screen h-screen overflow-hidden"
        style={{
          background: "#020c12",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* ── Globe layer ────────────────────────────────────────────────── */}
        <div className="absolute inset-0">
          {webgl ? (
            <Canvas camera={{ position: [0, 0, 5.6], fov: 42 }} dpr={[1, 1.5]}>
              <Stars radius={120} depth={60} count={9000} factor={4.5} saturation={0} fade speed={0.4} />
              {/* Ambient — low base fill */}
              <ambientLight intensity={0.28} />
              {/* Sun directional light */}
              <directionalLight position={[7, 4, 6]} intensity={2.2} color="#fff8e8" />
              {/* Eco green rim light from the left */}
              <pointLight position={[-6, 1, -2]} intensity={0.9} color="#34d399" />
              {/* Subtle fill from below */}
              <pointLight position={[0, -5, 3]} intensity={0.22} color="#064e3b" />
              <GlobeMesh rotRef={rotRef} isDraggingRef={isDraggingRef} />
            </Canvas>
          ) : (
            <CSSGlobe />
          )}
        </div>

        {/* ── Radial vignette ────────────────────────────────────────────── */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 82% 82% at 50% 50%, transparent 32%, #020c12 100%)"
        }} />

        {/* ── Ambient accent glow ────────────────────────────────────────── */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: activeDir
            ? `radial-gradient(ellipse 55% 55% at 50% 50%, ${DIRS[activeDir].color}12 0%, transparent 70%)`
            : undefined,
          transition: "background 0.4s ease",
        }} />

        {/* ── Direction hints ────────────────────────────────────────────── */}
        {(["right", "left", "up", "down"] as Dir[]).map((dir) => (
          <DirectionHint
            key={dir}
            dir={dir}
            active={activeDir === dir}
            progress={activeDir === dir ? dragProgress : 0}
          />
        ))}

        {/* ── Content cards (glassmorphism) ──────────────────────────────── */}
        {activeDir && (
          <ContentCard dir={activeDir} progress={dragProgress} />
        )}

        {/* ── Center hero text ───────────────────────────────────────────── */}
        <motion.div
          className="absolute inset-x-0 top-[11%] flex flex-col items-center text-center pointer-events-none z-20 px-4"
          animate={{ opacity: dragProgress > 0.5 ? 0.3 : 1, scale: dragProgress > 0.5 ? 0.96 : 1 }}
          transition={{ duration: 0.25 }}
        >
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="text-emerald-400/75 text-[10px] font-bold tracking-[0.26em] uppercase mb-3"
          >
            {t("center.eyebrow")}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-4xl md:text-6xl font-extrabold text-white leading-[1.1] tracking-tight"
          >
            {t("center.title")}
            <br />
            <span className="text-emerald-400">{t("center.titleAccent")}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.7 }}
            className="mt-4 text-white/45 text-sm max-w-xs leading-relaxed"
          >
            {t("center.sub")}
          </motion.p>
        </motion.div>

        {/* ── Top bar ────────────────────────────────────────────────────── */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 z-30">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Leaf className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">{t("brand")}</span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Language switcher hotspot */}
            <div
              onMouseEnter={(e) => showPopup(t("popup.lang"), e)}
              onMouseLeave={hidePopup}
            >
              <LanguageSwitcher dark />
            </div>

            {/* Open App button */}
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="interactive flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-semibold"
                style={{ boxShadow: "0 0 28px rgba(16,185,129,0.5)" }}
                onMouseEnter={(e) => showPopup(t("popup.openApp"), e)}
                onMouseLeave={hidePopup}
              >
                {t("openApp")} <ChevronRight className="h-3.5 w-3.5" />
              </motion.button>
            </Link>
          </div>
        </div>

        {/* ── Drag hint pulse ─────────────────────────────────────────────── */}
        <motion.div
          animate={{ opacity: isDragging || dragProgress > 0.1 ? 0 : 1 }}
          transition={{ delay: isDragging ? 0 : 1.4, duration: 0.7 }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-20"
          onMouseEnter={(e) => showPopup(t("popup.globe"), e)}
          onMouseLeave={hidePopup}
        >
          <div className="relative w-10 h-10">
            <motion.div
              animate={{ scale: [1, 1.55, 1], opacity: [0.55, 0, 0.55] }}
              transition={{ duration: 2.2, repeat: Infinity }}
              className="absolute inset-0 rounded-full border border-emerald-400/50"
            />
            <motion.div
              animate={{ scale: [1, 1.28, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: 0.4 }}
              className="absolute inset-0 rounded-full border border-emerald-400/30"
            />
            <div className="absolute inset-2 rounded-full bg-emerald-500/22 border border-emerald-400/40" />
          </div>
          <p className="text-white/40 text-[10px] tracking-[0.2em] uppercase">{t("dragHint")}</p>
        </motion.div>

        {/* ── Navigate threshold indicator ─────────────────────────────── */}
        {isDragging && dragProgress > 0.6 && activeDir && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-x-0 bottom-6 flex justify-center z-30 pointer-events-none"
          >
            <div
              className="px-5 py-2 rounded-full text-sm font-semibold text-white"
              style={{
                background: `${DIRS[activeDir].color}33`,
                border: `1.5px solid ${DIRS[activeDir].color}66`,
                backdropFilter: "blur(12px)",
                boxShadow: `0 0 24px ${DIRS[activeDir].color}44`,
              }}
            >
              {t(`${activeDir}.cta`)} →
            </div>
          </motion.div>
        )}

        {/* ── Flash transition ────────────────────────────────────────────── */}
        <AnimatePresence>
          {flashDir && (
            <motion.div
              key="flash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.42 }}
              className="absolute inset-0 z-50 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at center, ${DIRS[flashDir].color}55 0%, #020c12 75%)` }}
            />
          )}
        </AnimatePresence>

        {/* ── Hotspot popup ───────────────────────────────────────────────── */}
        <HotspotPopup visible={popup.visible} text={popup.text} x={popup.x} y={popup.y} />
      </div>
    </>
  );
}
