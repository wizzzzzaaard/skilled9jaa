"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { useSession } from "@/lib/hooks/useSession";

// ─── Data ─────────────────────────────────────────────────────────────────────

const ARTISAN_TYPES = [
  "Web Developers", "Lawyers", "Plumbers", "Electricians", "Accountants",
  "Programmers", "Receptionists", "Private Chefs", "Drivers", "Home Cleaners",
  "Carpenters", "Security Guards", "Tailors", "Mechanics", "Personal Trainers",
  "Nurses", "Architects", "Data Analysts", "Painters", "Furniture Makers",
];

const PROVIDERS = [
  { id: "lawyer",       imgUrl: "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=80&h=80&fit=crop&auto=format", need: "I need a good lawyer in Lekki",        name: "Adaeze O.",  location: "Lagos Island" },
  { id: "plumber",      imgUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=80&h=80&fit=crop&auto=format", need: "I need a plumber urgently",            name: "Tunde K.",   location: "Surulere" },
  { id: "chef",         imgUrl: "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=80&h=80&fit=crop&auto=format", need: "Looking for a private chef in Ikoyi",  name: "Ngozi B.",   location: "Ikoyi" },
  { id: "driver",       imgUrl: "https://images.unsplash.com/photo-1449965408869-eaa3f722e04d?w=80&h=80&fit=crop&auto=format", need: "I need a reliable driver today",       name: "Emeka F.",   location: "Victoria Island" },
  { id: "cleaner",      imgUrl: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=80&h=80&fit=crop&auto=format", need: "Need a home cleaner right away",       name: "Sade K.",    location: "Ikeja" },
  { id: "elec",         imgUrl: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=80&h=80&fit=crop&auto=format", need: "Need an electrician now",              name: "Biodun M.",  location: "Lekki" },
  { id: "dev",          imgUrl: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=80&h=80&fit=crop&auto=format", need: "Looking for a web developer",          name: "Yemi A.",    location: "GRA" },
  { id: "accountant",   imgUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=80&h=80&fit=crop&auto=format", need: "I need an accountant for my business",  name: "Chukwuma D.", location: "Ikeja GRA" },
  { id: "receptionist", imgUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=80&h=80&fit=crop&auto=format", need: "I need a receptionist urgently",       name: "Funke A.",   location: "Victoria Island" },
  { id: "carpenter",    imgUrl: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=80&h=80&fit=crop&auto=format", need: "I need a carpenter ASAP",              name: "Chidi O.",   location: "Yaba" },
];

// Green shades only — no loud colors
const FALLBACK_COLORS: Record<string, string> = {
  lawyer:       "#d8f3dc",
  plumber:      "#b7e4c7",
  chef:         "#95d5b2",
  driver:       "#74c69d",
  cleaner:      "#52b788",
  elec:         "#40916c",
  dev:          "#d8f3dc",
  accountant:   "#b7e4c7",
  receptionist: "#95d5b2",
  carpenter:    "#74c69d",
};

type Provider = (typeof PROVIDERS)[number];
type DotPos   = { id: string; x: number; y: number; angle: number; r: number; phase: number; p: Provider };

// ─── Artisan Chip Marquee ─────────────────────────────────────────────────────

function ArtisanMarquee() {
  const items = [...ARTISAN_TYPES, ...ARTISAN_TYPES];
  return (
    <div
      style={{
        overflow: "hidden",
        width: "100%",
        maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        style={{ display: "flex", alignItems: "center", whiteSpace: "nowrap", willChange: "transform", gap: 8 }}
      >
        {items.map((type, i) => (
          <span
            key={i}
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontSize: 12,
              fontWeight: 450,
              color: "#5a5a52",
              letterSpacing: "0.01em",
              border: "1px solid rgba(45,90,61,0.20)",
              borderRadius: 100,
              padding: "4px 13px",
              background: "rgba(255,255,255,0.7)",
              flexShrink: 0,
            }}
          >
            {type}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Radar Canvas ─────────────────────────────────────────────────────────────

function HeroRadar({
  dots, activeId, onDotClick, imgCache, is3D,
}: {
  dots: DotPos[];
  activeId: string;
  onDotClick: (id: string) => void;
  imgCache: React.MutableRefObject<Map<string, HTMLImageElement>>;
  is3D: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const tRef      = useRef(0);
  const dotsRef   = useRef(dots);
  const activeRef = useRef(activeId);
  const is3DRef   = useRef(is3D);
  const drawnRef  = useRef<{ id: string; px: number; py: number }[]>([]);

  useEffect(() => { dotsRef.current   = dots;     }, [dots]);
  useEffect(() => { activeRef.current = activeId; }, [activeId]);
  useEffect(() => { is3DRef.current   = is3D;     }, [is3D]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      if (!canvas) return;
      const parent = canvas.parentElement!;
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = parent.offsetWidth  * dpr;
      canvas.height = parent.offsetHeight * dpr;
      canvas.style.width  = parent.offsetWidth  + "px";
      canvas.style.height = parent.offsetHeight + "px";
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const ctx = canvas.getContext("2d")!;

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const W   = canvas!.width  / dpr;
      const H   = canvas!.height / dpr;
      tRef.current += 0.006;
      const t = tRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const cx   = W / 2;
      const cy   = H / 2;
      const maxR = Math.min(W, H) * 0.42;
      const rings = [0.30, 0.50, 0.72, 0.92];
      const use3D = is3DRef.current;

      if (use3D) {
        const scaleY = 0.38;
        const baseY  = cy + maxR * 0.08;

        rings.forEach((r, i) => {
          const rx = r * maxR;
          const ry = rx * scaleY;
          ctx.beginPath();
          ctx.ellipse(cx, baseY, rx, ry, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(45,90,61,${0.07 + i * 0.025})`;
          ctx.lineWidth   = 0.9;
          ctx.stroke();
        });

        ctx.save();
        ctx.translate(cx, baseY);
        const sweepAngle = t % (Math.PI * 2);
        const sg = ctx.createLinearGradient(
          Math.cos(sweepAngle - 0.28) * maxR * 0.9,
          Math.sin(sweepAngle - 0.28) * maxR * 0.9 * scaleY,
          Math.cos(sweepAngle) * maxR * 0.9,
          Math.sin(sweepAngle) * maxR * 0.9 * scaleY,
        );
        sg.addColorStop(0, "rgba(45,90,61,0)");
        sg.addColorStop(1, "rgba(45,90,61,0.10)");
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let a = sweepAngle - 0.32; a <= sweepAngle; a += 0.02) {
          ctx.lineTo(Math.cos(a) * maxR * 0.88, Math.sin(a) * maxR * 0.88 * scaleY);
        }
        ctx.closePath();
        ctx.fillStyle = sg;
        ctx.fill();
        ctx.restore();

        const activeDot3D = dotsRef.current.find(d => d.id === activeRef.current);
        if (activeDot3D) {
          const sx3 = cx + Math.cos(activeDot3D.angle) * activeDot3D.r;
          const sy3 = baseY + Math.sin(activeDot3D.angle) * activeDot3D.r * scaleY;
          ctx.save();
          ctx.setLineDash([3, 5]);
          ctx.beginPath();
          ctx.moveTo(cx, baseY);
          ctx.lineTo(sx3, sy3);
          ctx.strokeStyle = "rgba(45,90,61,0.20)";
          ctx.lineWidth   = 1;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        const sorted3D = [...dotsRef.current].sort((a, b) =>
          Math.sin(a.angle) * scaleY - Math.sin(b.angle) * scaleY
        );
        const drawn3D: { id: string; px: number; py: number }[] = [];

        sorted3D.forEach((dp) => {
          const floatY = Math.sin(t * 0.9 + dp.phase) * 2;
          const sx3 = cx + Math.cos(dp.angle) * dp.r;
          const sy3 = baseY + Math.sin(dp.angle) * dp.r * scaleY + floatY;
          const isActive = dp.id === activeRef.current;
          const stemH = isActive ? 28 : 20;

          ctx.beginPath();
          ctx.moveTo(sx3, sy3);
          ctx.lineTo(sx3, sy3 - stemH);
          ctx.strokeStyle = isActive ? "rgba(45,90,61,0.35)" : "rgba(45,90,61,0.15)";
          ctx.lineWidth   = isActive ? 1.2 : 0.8;
          ctx.stroke();

          ctx.save();
          ctx.beginPath();
          ctx.ellipse(sx3, sy3, 8, 3, 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(45,90,61,0.08)";
          ctx.fill();
          ctx.restore();

          drawDotCircle(ctx, dp, sx3, sy3 - stemH, isActive, imgCache, t);
          drawn3D.push({ id: dp.id, px: sx3, py: sy3 - stemH });
        });

        drawnRef.current = drawn3D;

      } else {
        rings.forEach((r, i) => {
          ctx.beginPath();
          ctx.arc(cx, cy, r * maxR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(45,90,61,${0.06 + i * 0.02})`;
          ctx.lineWidth   = 0.9;
          ctx.stroke();
        });

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t % (Math.PI * 2));
        const sg2 = ctx.createLinearGradient(0, 0, maxR * 0.9, 0);
        sg2.addColorStop(0, "rgba(45,90,61,0.13)");
        sg2.addColorStop(1, "rgba(45,90,61,0)");
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, maxR * 0.9, -0.28, 0);
        ctx.closePath();
        ctx.fillStyle = sg2;
        ctx.fill();
        ctx.restore();

        const activeDot2D = dotsRef.current.find(d => d.id === activeRef.current);
        if (activeDot2D) {
          const fy = Math.sin(t * 0.9 + activeDot2D.phase) * 2;
          ctx.save();
          ctx.setLineDash([3, 5]);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(activeDot2D.x, activeDot2D.y + fy);
          ctx.strokeStyle = "rgba(45,90,61,0.20)";
          ctx.lineWidth   = 1;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        // Center pulses
        [0, 1].forEach((i) => {
          const pr = 16 + i * 14 + Math.sin(t * 1.8 + i) * 2;
          ctx.beginPath();
          ctx.arc(cx, cy, pr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(45,90,61,${0.12 - i * 0.04})`;
          ctx.lineWidth   = 1;
          ctx.stroke();
        });

        const drawn2D: { id: string; px: number; py: number }[] = [];
        dotsRef.current.forEach((dp) => {
          const fy = Math.sin(t * 0.9 + dp.phase) * 2;
          const px = dp.x;
          const py = dp.y + fy;
          drawDotCircle(ctx, dp, px, py, dp.id === activeRef.current, imgCache, t);
          drawn2D.push({ id: dp.id, px, py });
        });
        drawnRef.current = drawn2D;

        drawCenter2D(ctx, cx, cy);
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [imgCache]);

  function drawDotCircle(
    ctx: CanvasRenderingContext2D,
    dp: DotPos,
    px: number, py: number,
    isActive: boolean,
    imgCache: React.MutableRefObject<Map<string, HTMLImageElement>>,
    _t: number,
  ) {
    const radius = 14;

    if (isActive) {
      ctx.beginPath();
      ctx.arc(px, py, radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(45,90,61,0.15)";
      ctx.lineWidth   = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fillStyle   = FALLBACK_COLORS[dp.id] ?? "#b7e4c7";
    ctx.shadowColor = isActive ? "rgba(45,90,61,0.22)" : "rgba(0,0,0,0.07)";
    ctx.shadowBlur  = isActive ? 12 : 5;
    ctx.fill();
    ctx.shadowBlur  = 0;

    const img = imgCache.current.get(dp.id);
    if (img && img.complete && img.naturalHeight > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, radius - 1, 0, Math.PI * 2);
      ctx.clip();
      const d = (radius - 1) * 2;
      ctx.drawImage(img, px - radius + 1, py - radius + 1, d, d);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.strokeStyle = isActive ? "#2d5a3d" : "rgba(45,90,61,0.18)";
    ctx.lineWidth   = isActive ? 3 : 1;
    ctx.stroke();
  }

  function drawCenter2D(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    const sR = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, sR, 0, Math.PI * 2);
    ctx.fillStyle   = "#2d5a3d";
    ctx.shadowColor = "rgba(45,90,61,0.30)";
    ctx.shadowBlur  = 10;
    ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.fillStyle    = "rgba(255,255,255,0.90)";
    ctx.font         = `500 7px system-ui, sans-serif`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("You", cx, cy + 0.5);
    ctx.textBaseline = "alphabetic";
  }

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const d of drawnRef.current) {
      if (Math.hypot(mx - d.px, my - d.py) < 22) { onDotClick(d.id); break; }
    }
  }, [onDotClick]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer", zIndex: 2 }}
    />
  );
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({ provider }: { provider: Provider }) {
  return (
    <motion.div
      key={provider.id}
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={   { opacity: 0, y: -6, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      style={{
        position: "absolute", top: 16, right: 16, width: 178,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        borderRadius: 14, boxShadow: "0 6px 28px rgba(0,0,0,0.07)",
        border: "1px solid rgba(0,0,0,0.05)",
        zIndex: 30, pointerEvents: "none", padding: "12px 13px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
        <div style={{
          width: 26, height: 26, borderRadius: "50%", overflow: "hidden",
          flexShrink: 0, background: FALLBACK_COLORS[provider.id] ?? "#b7e4c7",
        }}>
          <img src={provider.imgUrl} alt={provider.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#1a1a18", lineHeight: 1.2 }}>
            {provider.name}
          </div>
          <div style={{ fontSize: 10, color: "#bbb", display: "flex", alignItems: "center", gap: 2, marginTop: 1 }}>
            <MapPin size={7} />{provider.location}
          </div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "#444", lineHeight: 1.45, margin: 0, fontWeight: 450 }}>
        "{provider.need}"
      </p>
    </motion.div>
  );
}

// ─── 2D / 3D Toggle ──────────────────────────────────────────────────────────

function ViewToggle({ is3D, onToggle }: { is3D: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle 2D / 3D view"
      style={{
        position: "absolute", top: 12, left: 12, zIndex: 20,
        display: "flex", alignItems: "center",
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(45,90,61,0.12)", borderRadius: 100,
        padding: "3px 4px", cursor: "pointer",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)", gap: 0,
      }}
    >
      {(["3D", "2D"] as const).map((label) => {
        const active = (label === "3D") === is3D;
        return (
          <span
            key={label}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 10, fontWeight: active ? 600 : 440,
              color: active ? "#fff" : "#8a8a82",
              background: active ? "#2d5a3d" : "transparent",
              borderRadius: 100, padding: "3px 10px",
              transition: "all 0.22s ease", letterSpacing: "0.04em", lineHeight: 1.4,
            }}
          >
            {label === "3D" ? (
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" style={{ opacity: active ? 1 : 0.5 }}>
                <path d="M6 1L11 3.5V8.5L6 11L1 8.5V3.5L6 1Z" stroke={active ? "#fff" : "#8a8a82"} strokeWidth="1.2" fill="none"/>
                <path d="M6 1V11M1 3.5L6 6L11 3.5" stroke={active ? "#fff" : "#8a8a82"} strokeWidth="1.2"/>
              </svg>
            ) : (
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" style={{ opacity: active ? 1 : 0.5 }}>
                <rect x="1" y="1" width="4" height="4" rx="0.5" stroke={active ? "#fff" : "#8a8a82"} strokeWidth="1.2"/>
                <rect x="7" y="1" width="4" height="4" rx="0.5" stroke={active ? "#fff" : "#8a8a82"} strokeWidth="1.2"/>
                <rect x="1" y="7" width="4" height="4" rx="0.5" stroke={active ? "#fff" : "#8a8a82"} strokeWidth="1.2"/>
                <rect x="7" y="7" width="4" height="4" rx="0.5" stroke={active ? "#fff" : "#8a8a82"} strokeWidth="1.2"/>
              </svg>
            )}
            {label}
          </span>
        );
      })}
    </button>
  );
}

// ─── CTA Buttons ──────────────────────────────────────────────────────────────

function CTAButtons({ isLoggedIn }: { isLoggedIn: boolean }) {
  const base: React.CSSProperties = {
    display: "block", borderRadius: 100, cursor: "pointer",
    fontFamily: "'SF Pro Display', system-ui, -apple-system, sans-serif",
    fontSize: 12.5, fontWeight: 500, letterSpacing: "0.025em",
    textAlign: "center", textDecoration: "none",
    padding: "9px 0", transition: "all 0.20s ease", border: "none",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 9 }}>
      <Link href={isLoggedIn ? "/find" : "/signup"} style={{ display: "block", width: 138 }}>
        <span
          style={{ ...base, width: "100%", background: "#2d5a3d", color: "#fff", boxShadow: "0 2px 10px rgba(45,90,61,0.20)" }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "#1e3f2b"; el.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "#2d5a3d"; el.style.transform = "translateY(0)"; }}
        >Find Now →</span>
      </Link>

      {!isLoggedIn && (
        <Link href="/signup" style={{ display: "block", width: 174 }}>
          <span
            style={{ ...base, width: "100%", background: "transparent", color: "#2d5a3d", border: "1px solid rgba(45,90,61,0.28)" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(45,90,61,0.05)"; el.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "transparent"; el.style.transform = "translateY(0)"; }}
          >Join as Pro</span>
        </Link>
      )}

      <Link href="/homeservice" style={{ display: "block", width: 212 }}>
        <span
          style={{ ...base, width: "100%", background: "rgba(45,90,61,0.07)", color: "#2d5a3d", border: "1px solid rgba(45,90,61,0.09)" }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(45,90,61,0.12)"; el.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(45,90,61,0.07)"; el.style.transform = "translateY(0)"; }}
        >Home Service</span>
      </Link>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

export function Hero() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [dots,      setDots     ] = useState<DotPos[]>([]);
  const [is3D,      setIs3D     ] = useState(false);

  const { user } = useSession();
  const isLoggedIn = !!user;

  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const imgCache     = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    PROVIDERS.forEach((p) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = p.imgUrl;
      imgCache.current.set(p.id, img);
    });
  }, []);

  useEffect(() => {
    function build() {
      if (!containerRef.current) return;
      const W = containerRef.current.offsetWidth;
      const H = containerRef.current.offsetHeight;
      const cx = W / 2, cy = H / 2;
      const maxR = Math.min(W, H) * 0.42;
      const ringDefs = [0.30, 0.50, 0.72, 0.92];
      const n = PROVIDERS.length;
      setDots(PROVIDERS.map((p, i) => {
        const ringIdx     = i % ringDefs.length;
        const itemsOnRing = Math.ceil(n / ringDefs.length);
        const posOnRing   = Math.floor(i / ringDefs.length);
        const angle = (posOnRing / itemsOnRing) * Math.PI * 2
                    + (ringIdx * Math.PI * 0.52)
                    + 0.1;
        const r = ringDefs[ringIdx] * maxR;
        return { id: p.id, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, angle, r, phase: (i / n) * Math.PI * 2, p };
      }));
    }
    build();
    window.addEventListener("resize", build);
    return () => window.removeEventListener("resize", build);
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(
      () => setActiveIdx(prev => (prev + 1) % PROVIDERS.length),
      4000,
    );
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleDotClick = useCallback((id: string) => {
    const idx = PROVIDERS.findIndex(p => p.id === id);
    if (idx >= 0) {
      setActiveIdx(idx);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(
        () => setActiveIdx(prev => (prev + 1) % PROVIDERS.length),
        4000,
      );
    }
  }, []);

  const activeProvider = PROVIDERS[activeIdx];

  return (
    <section className="relative bg-white overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-stretch lg:min-h-[620px]">

        {/* ─── LEFT ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0   }}
          transition={{ duration: 0.50 }}
          className="flex flex-col justify-start lg:justify-start
                     px-7 md:px-10 lg:px-14 xl:px-20
                     pt-4 pb-4 lg:pt-10 lg:pb-0
                     lg:w-[46%] xl:w-[44%]"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ duration: 0.45 }}
          >
            {/* Label */}
            <p style={{
              fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
              color: "#52b788", fontWeight: 600, marginBottom: 6, marginTop: 0,
            }}>
              Here's exactly how
            </p>

            {/* Headline */}
            <h1
              className="font-semibold text-text-primary tracking-tight leading-tight"
              style={{ fontSize: "clamp(22px, 5vw, 3.2rem)", marginTop: 0, marginBottom: 0 }}
            >
              Clients find you
            </h1>
          </motion.div>

          {/* 4 Bullets */}
          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0 0" }}>
            {[
              "Get notified when companies near you are hiring",
              "Our artisans report not less than 20 calls per week",
              "GPS connects you to the closest companies — less transport cost",
              "No commission — payments go directly between you and the client",
            ].map((text) => (
              <li key={text} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12.5, color: "#7a7a72", marginBottom: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#2d5a3d", flexShrink: 0, opacity: 0.7, marginTop: 4 }} />
                {text}
              </li>
            ))}
          </ul>

          {/* Chip marquee */}
          <div style={{ marginTop: 14, marginBottom: 14, maxWidth: 380 }}>
            <ArtisanMarquee />
          </div>

          {/* CTAs — desktop */}
          <div className="hidden lg:block">
            <CTAButtons isLoggedIn={isLoggedIn} />
          </div>
        </motion.div>

        {/* ─── RIGHT: Radar ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="flex flex-col flex-1"
        >
          <div
            ref={containerRef}
            style={{
              position: "relative", width: "100%",
              height: "clamp(360px, 55vw, 540px)",
              background: "linear-gradient(180deg, #f9fbf9 0%, #f4f8f4 100%)",
            }}
          >
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(circle at 50% 50%, rgba(45,90,61,0.05) 0%, transparent 68%)",
              pointerEvents: "none",
            }} />

            <HeroRadar
              dots={dots}
              activeId={activeProvider.id}
              onDotClick={handleDotClick}
              imgCache={imgCache}
              is3D={is3D}
            />

            <AnimatePresence mode="wait">
              <RequestCard key={activeProvider.id} provider={activeProvider} />
            </AnimatePresence>

            <ViewToggle is3D={is3D} onToggle={() => setIs3D(v => !v)} />

            {/* Progress pills */}
            <div style={{
              position: "absolute", bottom: 16, left: "50%",
              transform: "translateX(-50%)", display: "flex", gap: 5, zIndex: 20,
            }}>
              {PROVIDERS.map((p, i) => (
                <button key={p.id} onClick={() => handleDotClick(p.id)} style={{
                  width: i === activeIdx ? 20 : 6, height: 6, borderRadius: 3,
                  border: "none",
                  background: i === activeIdx ? "#2d5a3d" : "rgba(45,90,61,0.18)",
                  cursor: "pointer", transition: "all 0.35s ease", padding: 0,
                }} />
              ))}
            </div>
          </div>

          {/* CTAs — mobile */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ delay: 0.35, duration: 0.45 }}
            className="lg:hidden px-7 pt-6 pb-8"
          >
            <CTAButtons isLoggedIn={isLoggedIn} />
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}