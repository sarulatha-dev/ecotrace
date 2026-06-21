import { useRef, useState, useCallback, useMemo, useEffect, Suspense } from "react";
import { useLocation } from "wouter";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, useTexture } from "@react-three/drei";
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

// ─── Bullet data per direction ─────────────────────────────────────────────────
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
    { icon: "🚲", text: "Reduce Plastic" },
    { icon: "🌱", text: "Plant More Trees" },
    { icon: "🚎", text: "Use Public Transport" },
  ],
  down: [
    { icon: "📊", text: "Footprint Tracker" },
    { icon: "🧠", text: "Smart Recommendations" },
    { icon: "🏆", text: "Daily Challenges" },
    { icon: "🌍", text: "Community Impact" },
    { icon: "🎖", text: "Rewards & Badges" },
  ],
};

// ─── WebGL check ──────────────────────────────────────────────────────────────
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
          {[
            { top:"30%", left:"62%", size:3 }, { top:"42%", left:"70%", size:2 },
            { top:"55%", left:"66%", size:2 }, { top:"35%", left:"74%", size:1.5 },
            { top:"48%", left:"59%", size:2 }, { top:"63%", left:"72%", size:1.5 },
          ].map((c,i) => (
            <div key={i} className="absolute rounded-full bg-yellow-200/60"
              style={{ width:c.size, height:c.size, top:c.top, left:c.left, filter:"blur(0.5px)" }} />
          ))}
          <div className="absolute rounded-full bg-white/12" style={{ width:"40%", height:"8%", top:"15%", left:"30%", filter:"blur(5px)", transform:"rotate(-12deg)" }} />
          <div className="absolute rounded-full bg-white/8"  style={{ width:"25%", height:"6%", top:"55%", left:"40%", filter:"blur(4px)", transform:"rotate(8deg)" }} />
          <div className="absolute left-0 right-0 top-0 bg-white/12" style={{ height:"8%", filter:"blur(5px)", borderRadius:"50%" }} />
          <div className="absolute left-0 right-0 bottom-0 bg-white/9"  style={{ height:"7%", filter:"blur(5px)", borderRadius:"50%" }} />
        </div>
        <div className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.08) 0%, transparent 42%)" }} />
        <div className="absolute -inset-3 rounded-full"
          style={{ boxShadow: "0 0 40px rgba(59,130,246,0.35), 0 0 80px rgba(16,185,129,0.18)", borderRadius:"50%" }} />
        <div className="absolute inset-0 rounded-full"
          style={{ boxShadow: "0 0 60px rgba(16,185,129,0.32), 0 0 120px rgba(16,185,129,0.12)" }} />
      </div>
    </div>
  );
}

// ─── GLSL Shaders for realistic Earth ─────────────────────────────────────────

const earthVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const earthFragmentShader = `
  uniform sampler2D uDayTex;
  uniform sampler2D uNightTex;
  uniform sampler2D uBumpTex;
  uniform vec3 uSunDir;
  uniform float uHasDay;
  uniform float uHasNight;
  uniform float uHasBump;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;

  void main() {
    vec3 normal = normalize(vWorldNormal);

    // Subtle bump from topology map
    if (uHasBump > 0.5) {
      vec3 bumpSample = texture2D(uBumpTex, vUv).rgb;
      float bumpVal = bumpSample.r * 2.0 - 1.0;
      normal = normalize(normal + vec3(bumpVal * 0.06));
    }

    float sunDot = dot(normal, normalize(uSunDir));

    // Smooth day/night terminator — soft twilight zone
    float dayMix = smoothstep(-0.18, 0.22, sunDot);

    vec4 dayColor;
    vec4 nightColor;

    if (uHasDay > 0.5) {
      dayColor = texture2D(uDayTex, vUv);
      // Boost saturation slightly for vibrancy
      float lum = dot(dayColor.rgb, vec3(0.299, 0.587, 0.114));
      dayColor.rgb = mix(vec3(lum), dayColor.rgb, 1.18);
    } else {
      // Fallback: ocean blue with grid continents
      float grid = step(0.965, fract(vUv.x * 36.0)) + step(0.965, fract(vUv.y * 18.0));
      dayColor = vec4(0.04, 0.18, 0.38, 1.0) + vec4(vec3(grid * 0.1), 0.0);
    }

    if (uHasNight > 0.5) {
      nightColor = texture2D(uNightTex, vUv);
      // Amplify city lights on dark side
      nightColor.rgb *= 2.6;
      nightColor.rgb = pow(nightColor.rgb, vec3(0.78));
    } else {
      nightColor = vec4(0.01, 0.03, 0.06, 1.0);
    }

    // Blend day & night
    vec4 earthColor = mix(nightColor, dayColor, dayMix);

    // Specular highlight (sun glint on oceans)
    float spec = pow(max(0.0, dot(reflect(-normalize(uSunDir), normal), vec3(0.0, 0.0, 1.0))), 28.0);
    earthColor.rgb += vec3(spec * 0.22 * dayMix);

    gl_FragColor = vec4(earthColor.rgb, 1.0);
  }
`;

// Atmosphere shaders removed

// ─── Realistic Earth Globe (drop-in replacement for GlobeMesh) ────────────────
function GlobeMesh({ rotRef, isDraggingRef }: {
  rotRef: React.MutableRefObject<{ x: number; y: number }>;
  isDraggingRef: React.MutableRefObject<boolean>;
}) {
  const earthRef  = useRef<THREE.Mesh>(null);
  const cloudRef  = useRef<THREE.Mesh>(null);

  // Load textures using Drei's useTexture hook (instant, cached, Suspense-ready)
  const [dayTex, nightTex, bumpTex, cloudTex] = useTexture([
    "/textures/earth-day.jpg",
    "/textures/earth-night.jpg",
    "/textures/earth-bump.png",
    "/textures/earth-clouds.png"
  ]);

  // Set correct color space for textures
  useEffect(() => {
    if (dayTex) dayTex.colorSpace = THREE.SRGBColorSpace;
    if (nightTex) nightTex.colorSpace = THREE.SRGBColorSpace;
    if (cloudTex) cloudTex.colorSpace = THREE.SRGBColorSpace;
  }, [dayTex, nightTex, cloudTex]);

  // Uniforms - memoized, utilizing the preloaded textures
  const earthUniforms = useMemo(() => ({
    uDayTex:   { value: dayTex },
    uNightTex: { value: nightTex },
    uBumpTex:  { value: bumpTex },
    uSunDir:   { value: new THREE.Vector3(6, 3, 5).normalize() },
    uHasDay:   { value: dayTex ? 1.0 : 0.0 },
    uHasNight: { value: nightTex ? 1.0 : 0.0 },
    uHasBump:  { value: bumpTex ? 1.0 : 0.0 },
  }), [dayTex, nightTex, bumpTex]);


  useFrame((state, delta) => {
    if (!earthRef.current) return;

    // Auto-rotate when not dragging
    if (!isDraggingRef.current) {
      rotRef.current.y += delta * 0.10; // Smooth, premium slow spin
    }

    earthRef.current.rotation.y = rotRef.current.y;
    earthRef.current.rotation.x = rotRef.current.x;

    if (cloudRef.current) {
      // Clouds drift slightly faster than Earth surface
      cloudRef.current.rotation.y = rotRef.current.y + state.clock.elapsedTime * 0.028;
      cloudRef.current.rotation.x = rotRef.current.x * 0.85;
    }
  });

  return (
    <>
      {/* ── Core Earth sphere with custom GLSL day/night shader ─────────── */}
      <mesh ref={earthRef} rotation={[0, -1.2, 0]}>
        <sphereGeometry args={[2, 72, 72]} />
        <shaderMaterial
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
          uniforms={earthUniforms}
        />
      </mesh>

      {/* ── Cloud layer ───────────────────────────────────────────────────── */}
      <mesh ref={cloudRef} scale={[1.022, 1.022, 1.022]}>
        <sphereGeometry args={[2, 48, 48]} />
        <meshStandardMaterial
          map={cloudTex ?? undefined}
          alphaMap={cloudTex ?? undefined}
          transparent
          opacity={cloudTex ? 0.45 : 0.06}
          depthWrite={false}
          color={cloudTex ? "#ffffff" : "#e8f8f5"}
          blending={THREE.NormalBlending}
        />
      </mesh>

    </>
  );
}

// ─── Premium glassmorphism content card ──────────────────────────────────────
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
              {bullets.map((b, idx) => (
                <div key={b.text} className="flex items-center gap-2">
                  <span className="text-[12px] w-4 shrink-0">{b.icon}</span>
                  <span className="text-[11px] text-white/70 font-medium">
                    {t(`${d.key}.bullets.${idx}`, b.text)}
                  </span>
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
                  {t("down.label")} <ChevronRight className="h-3 w-3" />
                </motion.div>
              </Link>
            ) : (
              <Link href={d.path} className="pointer-events-auto">
                <span className="text-[11px] font-semibold flex items-center gap-1 hover:gap-2 transition-all" style={{ color: ECO }}>
                  {t("exploreMore")} <ChevronRight className="h-3 w-3" />
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

// ─── Mini CSS globe for explainer section ─────────────────────────────────────
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
        {[{top:"32%",left:"60%"},{top:"44%",left:"68%"},{top:"55%",left:"62%"}].map((c,i) => (
          <div key={i} className="absolute rounded-full bg-yellow-200/70"
            style={{ width:2, height:2, top:c.top, left:c.left }} />
        ))}
        <div className="absolute rounded-full bg-white/14" style={{ width:"35%", height:"6%", top:"18%", left:"28%", filter:"blur(3px)", transform:"rotate(-10deg)" }} />
      </div>
      <div className="absolute inset-0 rounded-full"
        style={{ background: "radial-gradient(circle at 28% 26%, rgba(255,255,255,0.09) 0%, transparent 38%)" }} />
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
          {bullets.map((b, idx) => (
            <div key={b.text} className="flex items-center gap-2">
              <span className="text-[11px] shrink-0">{b.icon}</span>
              <span className="text-[11px] text-white/65 font-medium">
                {t(`${d.key}.bullets.${idx}`, b.text)}
              </span>
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
              {t("down.label")} <ChevronRight className="h-3 w-3" />
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
              {/* Subtle faint starfield — low brightness, premium feel */}
              <Stars radius={130} depth={65} count={6000} factor={3.5} saturation={0} fade speed={0.25} />
              {/* Sunlight from top-right front */}
              <ambientLight intensity={0.14} />
              <directionalLight position={[6, 3, 5]} intensity={2.8} color="#fff8e8" />
              {/* Subtle blue fill from bottom-left */}
              <pointLight position={[-5, -2, -3]} intensity={0.4} color="#1a5fbd" />
              {/* Soft green eco fill */}
              <pointLight position={[-3, 2, 4]} intensity={0.35} color="#1daf76" />
              <Suspense fallback={
                <mesh rotation={[0, -1.2, 0]}>
                  <sphereGeometry args={[2, 48, 48]} />
                  <meshBasicMaterial color="#041922" wireframe />
                </mesh>
              }>
                <GlobeMesh rotRef={rotRef} isDraggingRef={isDraggingRef} />
              </Suspense>
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
              <span className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center text-[8px]">⊙</span>
              {t("rotateHint")}
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

        {/* ── Left hero text ──────────────────────────────────────────────── */}
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
            {t("center.title")}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-4xl md:text-6xl font-black leading-tight mb-4"
            style={{ color: ECO }}
          >
            {t("center.titleAccent")}
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

        {/* ── Direction hints ─────────────────────────────────────────────── */}
        {(["right","left","up","down"] as Dir[]).map((dir) => (
          <DirectionHint
            key={dir}
            dir={dir}
            active={activeDir === dir}
            progress={activeDir === dir ? dragProgress : 0}
          />
        ))}

        {/* ── Content cards ───────────────────────────────────────────────── */}
        {activeDir && <ContentCard dir={activeDir} progress={dragProgress} />}

        {/* ── Navigate threshold pill ─────────────────────────────────────── */}
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

        {/* ── Bottom hint bar ─────────────────────────────────────────────── */}
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

        {/* ── Flash transition ─────────────────────────────────────────────── */}
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
              {t("howToExplore")}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              {t("rotateToDiscover")}
            </h2>
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight" style={{ color: ECO }}>
              {t("fourDirections")}
            </h2>
          </div>

          {/* 2×2 grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { dir: "right" as Dir, key: "right" },
              { dir: "left"  as Dir, key: "left"  },
              { dir: "up"    as Dir, key: "up"    },
              { dir: "down"  as Dir, key: "down"  },
            ].map(({ dir, key }) => (
              <div key={dir} className="flex flex-col gap-3">
                <p className="text-[10px] font-bold tracking-[0.28em] uppercase" style={{ color: ECO }}>
                  {t(`directions.${key}`)}
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
              {t("footer.text1")}{" "}
              <span className="text-white font-semibold">{t("footer.text2")}</span>{" "}
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
