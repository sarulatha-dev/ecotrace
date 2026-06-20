import { useEffect, useRef, useState } from "react";

export default function CursorGlow() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos     = useRef({ x: -200, y: -200 });
  const ring    = useRef({ x: -200, y: -200 });
  const raf     = useRef<number>(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Hide default cursor on landing page only
    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };

    const onEnter = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (
        t.closest("button, a, [role='button'], .hover-lift, .hover-glow, .interactive, [data-cursor='pointer']")
      ) setActive(true);
    };

    const onLeave = () => setActive(false);

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onEnter);
    document.addEventListener("mouseout", onLeave);

    const animate = () => {
      ring.current.x += (pos.current.x - ring.current.x) * 0.14;
      ring.current.y += (pos.current.y - ring.current.y) * 0.14;

      if (dotRef.current) {
        dotRef.current.style.transform  = `translate(${pos.current.x}px, ${pos.current.y}px)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px)`;
      }
      raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onEnter);
      document.removeEventListener("mouseout", onLeave);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <>
      {/* Inner dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2"
        style={{
          width: active ? 10 : 6,
          height: active ? 10 : 6,
          borderRadius: "50%",
          background: active ? "rgba(52,211,153,1)" : "rgba(255,255,255,0.9)",
          boxShadow: active ? "0 0 12px rgba(52,211,153,0.9)" : "none",
          transition: "width 0.2s ease, height 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
        }}
      />
      {/* Trailing ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-[9998] -translate-x-1/2 -translate-y-1/2"
        style={{
          width: active ? 44 : 32,
          height: active ? 44 : 32,
          borderRadius: "50%",
          border: active
            ? "1.5px solid rgba(52,211,153,0.65)"
            : "1.5px solid rgba(255,255,255,0.35)",
          boxShadow: active ? "0 0 20px rgba(52,211,153,0.25)" : "none",
          transition: "width 0.22s ease, height 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease",
        }}
      />
    </>
  );
}
