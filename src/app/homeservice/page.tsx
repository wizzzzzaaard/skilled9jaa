"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Shield, Bell, KeyRound, BadgeCheck,
  ChevronRight, ChevronDown, LayoutGrid, Box,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  id: string;
  label: string;
  emoji: string;
  quote: string;
  detail: string;
  color: string;
  initials: string;
  avatarUrl: string;
};

type DotState = {
  id: string;
  x: number;
  y: number;
  angle: number;
  r: number;
  phase: number;
  category: Category;
  ring: number;
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { id: "barber",          label: "Barber",             emoji: "✂️",  quote: "I give the cleanest cuts in Lagos.",           detail: "6 years · Surulere", color: "#2d5a3d", initials: "TB", avatarUrl: "https://i.pravatar.cc/80?img=11" },
  { id: "makeup",          label: "Makeup Artist",      emoji: "💄",  quote: "I make you look like the cover.",              detail: "4 years · VI",       color: "#7c4d2d", initials: "AF", avatarUrl: "https://i.pravatar.cc/80?img=5"  },
  { id: "massage",         label: "Massage Therapist",  emoji: "🤲",  quote: "Deep tissue. Real relief.",                    detail: "5 years · Lekki",    color: "#2d4a7c", initials: "OE", avatarUrl: "https://i.pravatar.cc/80?img=32" },
  { id: "lashtech",        label: "Lash Tech",          emoji: "👁️", quote: "My lashes speak for themselves.",              detail: "3 years · Ikeja",    color: "#6b2d7c", initials: "SK", avatarUrl: "https://i.pravatar.cc/80?img=9"  },
  { id: "facial",          label: "Facial Specialist",  emoji: "✨",  quote: "Your skin will glow after one session.",       detail: "7 years · Ajah",     color: "#7c6b2d", initials: "NB", avatarUrl: "https://i.pravatar.cc/80?img=25" },
  { id: "nailtech",        label: "Nail Tech",          emoji: "💅",  quote: "Every set is a statement.",                   detail: "4 years · GRA",      color: "#7c2d4a", initials: "BT", avatarUrl: "https://i.pravatar.cc/80?img=16" },
  { id: "hairstylist",     label: "Hair Stylist",       emoji: "💇",  quote: "I style for confidence, not just looks.",     detail: "8 years · Yaba",     color: "#2d7c6b", initials: "CA", avatarUrl: "https://i.pravatar.cc/80?img=20" },
  { id: "personaltrainer", label: "Personal Trainer",   emoji: "💪",  quote: "I push you past what you thought possible.",  detail: "5 years · Oniru",    color: "#3d2d7c", initials: "EO", avatarUrl: "https://i.pravatar.cc/80?img=33" },
  { id: "cleaner",         label: "Home Cleaner",       emoji: "🧹",  quote: "I leave every space spotless.",               detail: "3 years · Magodo",   color: "#2d7c3d", initials: "YA", avatarUrl: "https://i.pravatar.cc/80?img=47" },
  { id: "chef",            label: "Private Chef",       emoji: "🍳",  quote: "Restaurant quality, in your kitchen.",        detail: "10 years · Ikoyi",   color: "#7c3d2d", initials: "KN", avatarUrl: "https://i.pravatar.cc/80?img=52" },
];

const NIGERIAN_STATES = [
  "Lagos", "Abuja", "Kano", "Port Harcourt", "Ibadan", "Kaduna", "Enugu",
  "Benin City", "Maiduguri", "Zaria", "Aba", "Onitsha", "Warri", "Sokoto",
  "Katsina", "Akure", "Bauchi", "Abeokuta", "Uyo", "Owerri", "Ilorin",
  "Asaba", "Calabar", "Makurdi", "Yola", "Lafia", "Lokoja", "Minna",
  "Gusau", "Damaturu", "Umuahia", "Ado Ekiti", "Gombe", "Awka", "Osogbo",
  "Birnin Kebbi",
];

const HERO_POINTS = [
  "Tell clients to always book through Skilled9ja — we verify their face, NIN and location.",
  "We send client details to your trustee on the day of each appointment.",
  "Be visible to people that need home service in your local area and beyond.",
  "Add, manage and protect multiple staff members.",
  "See reviews of previous clients before accepting a booking.",
];

const FLOW_STEPS = [
  { num: "01", title: "Client pays upfront",     text: "You're only notified when payment is already secured in escrow. No time-wasters. No no-shows." },
  { num: "02", title: "Your trustee is alerted", text: "The client's NIN, photo, and location go straight to your trusted contact the moment you accept." },
  { num: "03", title: "You arrive, enter the code", text: "Client provides a 4-digit code. You enter it. The job starts — officially, on record." },
  { num: "04", title: "Time elapses. You get paid.", text: "When your job duration is up, payment releases automatically. No awkward conversations." },
];

// ─── Radar Canvas ─────────────────────────────────────────────────────────────

function RadarCanvas({
  dots, view, onHover, hoveredId,
}: {
  dots: DotState[];
  view: "2d" | "3d";
  onHover: (id: string | null) => void;
  hoveredId: string | null;
}) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const tRef       = useRef(0);
  const rafRef     = useRef<number>(0);
  const dotsRef    = useRef(dots);
  const viewRef    = useRef(view);
  const hovRef     = useRef(hoveredId);
  const drawnRef   = useRef<{ id: string; px: number; py: number }[]>([]);
  const imagesRef  = useRef<Map<string, HTMLImageElement>>(new Map());

  // preload avatars
  useEffect(() => {
    dots.forEach((dot) => {
      if (!imagesRef.current.has(dot.id)) {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.src = dot.category.avatarUrl;
        imagesRef.current.set(dot.id, img);
      }
    });
  }, [dots]);

  useEffect(() => { dotsRef.current = dots; },      [dots]);
  useEffect(() => { viewRef.current = view; },      [view]);
  useEffect(() => { hovRef.current  = hoveredId; }, [hoveredId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      if (!canvas) return;
      const p = canvas.parentElement!;
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = p.offsetWidth  * dpr;
      canvas.height = p.offsetHeight * dpr;
      canvas.style.width  = p.offsetWidth  + "px";
      canvas.style.height = p.offsetHeight + "px";
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const ctx = canvas.getContext("2d")!;

    // draw one avatar circle (image or initials fallback)
    function drawAvatar(
      id: string, initials: string, color: string,
      px: number, py: number, radius: number, isHov: boolean,
    ) {
      const img = imagesRef.current.get(id);
      // shadow fill
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.shadowColor = isHov ? "rgba(45,90,61,0.4)" : "rgba(0,0,0,0.1)";
      ctx.shadowBlur  = isHov ? 14 : 7;
      ctx.fillStyle   = isHov ? color : "#fff";
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, radius - 1, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, px - radius, py - radius, radius * 2, radius * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = isHov ? "#fff" : color;
        ctx.font      = `500 ${Math.max(7, Math.floor(radius * 0.48))}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(initials, px, py + radius * 0.17);
      }

      // border
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isHov ? color : "rgba(45,90,61,0.22)";
      ctx.lineWidth   = isHov ? 2.5 : 1.5;
      ctx.stroke();
    }

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const W   = canvas!.width  / dpr;
      const H   = canvas!.height / dpr;
      tRef.current += 0.007;
      const t = tRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const cx   = W / 2;
      const cy   = H / 2;
      const maxR = Math.min(W, H) * 0.44;
      const tilt = 0.38;

      // 8 rings (3 more than original 5)
      const RINGS       = [0.12, 0.22, 0.33, 0.44, 0.55, 0.66, 0.77, 0.90];
      const RING_LABELS = ["",   "",   "1 km","2 km","3 km","4 km","5 km","7 km"];

      // 15 % smaller than originals (22 / 18 / 17)
      const R2D_BASE = 15;   // was 18
      const R2D_HOV  = 19;   // was 22
      const R3D_BASE = 14;   // was 17
      const R3D_HOV  = 19;   // was 22

      if (viewRef.current === "2d") {
        // ── rings
        RINGS.forEach((r, i) => {
          const rad = r * maxR;
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(45,90,61,${0.055 + i * 0.017})`;
          ctx.lineWidth   = 0.7;
          ctx.stroke();
          if (RING_LABELS[i]) {
            ctx.fillStyle  = "rgba(45,90,61,0.32)";
            ctx.font       = "10px system-ui, sans-serif";
            ctx.textAlign  = "left";
            ctx.fillText(RING_LABELS[i], cx + rad + 5, cy + 4);
          }
        });

        // ── sweep
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t % (Math.PI * 2));
        const sg = ctx.createLinearGradient(0, 0, maxR * 0.92, 0);
        sg.addColorStop(0, "rgba(45,90,61,0.18)");
        sg.addColorStop(1, "rgba(45,90,61,0)");
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, maxR * 0.92, -0.35, 0);
        ctx.closePath();
        ctx.fillStyle = sg;
        ctx.fill();
        ctx.restore();

        // ── center pulses
        [0, 1, 2].forEach((i) => {
          const pr = 18 + i * 18 + Math.sin(t * 1.8 + i) * 4;
          ctx.beginPath();
          ctx.arc(cx, cy, pr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(45,90,61,${0.17 - i * 0.05})`;
          ctx.lineWidth   = 1;
          ctx.stroke();
        });

        // ── dots
        const drawn: { id: string; px: number; py: number }[] = [];
        dotsRef.current.forEach((dp) => {
          const fy = Math.sin(t * 0.9 + dp.phase) * 3.5;
          const px = dp.x;
          const py = dp.y + fy;
          const isHov = dp.id === hovRef.current;
          const radius = isHov ? R2D_HOV : R2D_BASE;

          if (isHov) {
            ctx.beginPath();
            ctx.setLineDash([3, 4]);
            ctx.moveTo(cx, cy);
            ctx.lineTo(px, py);
            ctx.strokeStyle = "rgba(45,90,61,0.18)";
            ctx.lineWidth   = 1;
            ctx.stroke();
            ctx.setLineDash([]);
          }

          drawAvatar(dp.id, dp.category.initials, dp.category.color, px, py, radius, isHov);
          drawn.push({ id: dp.id, px, py });
        });
        drawnRef.current = drawn;

        // ── center dot (drawn last so it sits on top)
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.fillStyle   = "#2d5a3d";
        ctx.shadowColor = "rgba(45,90,61,0.4)";
        ctx.shadowBlur  = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();

      } else {
        // ── 3D mode — less clustered via per-ring float height ──────────
        RINGS.forEach((r, i) => {
          const rx = r * W * 0.44;
          const ry = rx * tilt;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(45,90,61,${0.065 + i * 0.017})`;
          ctx.lineWidth   = 0.7;
          ctx.stroke();
          if (RING_LABELS[i]) {
            ctx.fillStyle = "rgba(45,90,61,0.32)";
            ctx.font      = "10px system-ui, sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(RING_LABELS[i], cx + rx + 5, cy - ry * 0.05);
          }
        });

        // ── sweep
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t % (Math.PI * 2));
        ctx.scale(1, tilt);
        const sg3 = ctx.createLinearGradient(0, 0, W * 0.43, 0);
        sg3.addColorStop(0, "rgba(45,90,61,0.16)");
        sg3.addColorStop(1, "rgba(45,90,61,0)");
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, W * 0.43, -0.35, 0);
        ctx.closePath();
        ctx.fillStyle = sg3;
        ctx.fill();
        ctx.restore();

        // sort back-to-front by y so closer dots render on top
        const sorted = [...dotsRef.current].sort((a, b) => a.y - b.y);
        const drawn3: { id: string; px: number; py: number }[] = [];

        sorted.forEach((dp) => {
          const groundX = cx + Math.cos(dp.angle) * dp.r;
          const groundY = cy + Math.sin(dp.angle) * dp.r * tilt;
          const fy = Math.sin(t * 0.9 + dp.phase) * 2;
          // outer rings float higher → less vertical overlap
          const floatH = 20 + dp.ring * 14;
          const px = groundX;
          const py = groundY - floatH + fy;
          const isHov = dp.id === hovRef.current;
          const radius = isHov ? R3D_HOV : R3D_BASE;

          // ground shadow
          ctx.beginPath();
          ctx.ellipse(groundX, groundY, 10, 3, 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0,0,0,0.055)";
          ctx.fill();

          // stem
          ctx.beginPath();
          ctx.moveTo(groundX, groundY);
          ctx.lineTo(px, py + radius);
          ctx.strokeStyle = "rgba(45,90,61,0.13)";
          ctx.lineWidth   = 1;
          ctx.stroke();

          drawAvatar(dp.id, dp.category.initials, dp.category.color, px, py, radius, isHov);
          drawn3.push({ id: dp.id, px, py });
        });
        drawnRef.current = drawn3;

        // center dot
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.fillStyle   = "#2d5a3d";
        ctx.shadowColor = "rgba(45,90,61,0.4)";
        ctx.shadowBlur  = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let found: string | null = null;
      for (const d of drawnRef.current) {
        if (Math.hypot(mx - d.px, my - d.py) < 22) { found = d.id; break; }
      }
      onHover(found);
    },
    [onHover],
  );

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        cursor: hoveredId ? "pointer" : "default",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onHover(null)}
    />
  );
}

// ─── Provider Card ─────────────────────────────────────────────────────────────
// Book Now removed. Smaller, more minimal.

function ProviderCard({
  category, onClose: _onClose,
}: {
  category: Category;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30, y: -8 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 30, y: -8 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      style={{
        position: "absolute",
        top: 16, right: 16,
        width: "clamp(170px, 28vw, 200px)",
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 8px 28px rgba(0,0,0,0.1)",
        border: "1px solid rgba(0,0,0,0.06)",
        overflow: "hidden",
        zIndex: 40,
      }}
    >
      <div style={{ height: 3, background: category.color }} />
      <div style={{ padding: "12px 14px 14px" }}>
        {/* avatar row */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
          <img
            src={category.avatarUrl}
            alt={category.label}
            crossOrigin="anonymous"
            style={{
              width: 34, height: 34, borderRadius: "50%",
              objectFit: "cover", flexShrink: 0,
              border: `1.5px solid ${category.color}`,
            }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a18", marginBottom: 1 }}>
              {category.label}
            </div>
            <div style={{ fontSize: 11, color: "#999" }}>
              <span style={{ color: "#f5a623" }}>★</span> 4.9 · {category.detail}
            </div>
          </div>
        </div>

        {/* quote */}
        <div style={{
          fontStyle: "italic", fontSize: 12, color: "#555",
          lineHeight: 1.5, marginBottom: 10,
          borderLeft: `2px solid ${category.color}`, paddingLeft: 8,
        }}>
          "{category.quote}"
        </div>

        {/* badges */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["NIN verified", "Available now"].map((b) => (
            <span key={b} style={{
              fontSize: 10, fontWeight: 500,
              background: "rgba(45,90,61,0.08)",
              color: "#2d5a3d", padding: "2px 7px", borderRadius: 100,
            }}>
              {b}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HomeServicePage() {
  const [view, setView]                   = useState<"2d" | "3d">("2d");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [filterOpen, setFilterOpen]       = useState(false);
  const [hoveredId, setHoveredId]         = useState<string | null>(null);
  const [dots, setDots]                   = useState<DotState[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // build dots whenever category or container size changes
  useEffect(() => {
    function build() {
      if (!containerRef.current) return;
      const W  = containerRef.current.offsetWidth;
      const H  = containerRef.current.offsetHeight;
      const cx = W / 2;
      const cy = H / 2;
      const maxR = Math.min(W, H) * 0.44;
      const ringRatios = [0.12, 0.22, 0.33, 0.44, 0.55, 0.66, 0.77, 0.90];

      const cats = activeCategory
        ? CATEGORIES.filter((c) => c.id === activeCategory)
        : CATEGORIES;
      const n = cats.length;

      setDots(cats.map((cat, i) => {
        const angle   = (i / n) * Math.PI * 2 + 0.3;
        const ringIdx = i % ringRatios.length;
        const r       = ringRatios[ringIdx] * maxR + (Math.random() - 0.5) * maxR * 0.05;
        return {
          id: cat.id,
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
          angle, r, phase: (i / n) * Math.PI * 2,
          category: cat, ring: ringIdx,
        };
      }));
    }

    build();
    window.addEventListener("resize", build);
    return () => window.removeEventListener("resize", build);
  }, [activeCategory]);

  const hoveredCat = hoveredId
    ? CATEGORIES.find((c) => c.id === hoveredId) ?? null
    : null;

  const activeCat = activeCategory
    ? CATEGORIES.find((c) => c.id === activeCategory)
    : null;

  const trusteePoints = [
    { icon: BadgeCheck, text: "Clients verify their NIN before booking you" },
    { icon: Bell,       text: "Your trustee gets alerted with client details every job" },
    { icon: KeyRound,   text: "4-digit code confirms service start — you're protected" },
    { icon: Shield,     text: "Only ₦1,000/month — first payment covers 3 months" },
  ];

  return (
    <>
      <style>{`
        /* ── hero split layout ── */
        .hs-hero   { display: flex; width: 100%; min-height: 88vh; }
        .hs-left   { flex: 0 0 400px; padding: 80px 48px 80px 64px; display: flex; flex-direction: column; justify-content: center; background: #faf9f6; }
        .hs-right  { flex: 1; position: relative; background: #fff; min-height: 480px; overflow: hidden; }

        /* ── provider card mobile shrink ── */
        @media (max-width: 900px) {
          .hs-hero  { flex-direction: column; }
          .hs-left  { flex: none; width: 100%; padding: 48px 24px 28px; }
          .hs-right { flex: none; width: 100%; height: 420px; }
        }
        @media (max-width: 480px) {
          .hs-right { height: 360px; }
        }

        /* ── states marquee ── */
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .marquee-track {
          display: flex; white-space: nowrap;
          animation: marquee-scroll 40s linear infinite;
        }
        .marquee-track:hover { animation-play-state: paused; }

        /* ── full-width sections ── */
        .hs-section-full { width: 100%; padding-left: 64px; padding-right: 64px; box-sizing: border-box; }
        @media (max-width: 900px) {
          .hs-section-full { padding-left: 24px; padding-right: 24px; }
          .hs-left { padding: 40px 24px 24px; }
        }
      `}</style>

      {/* ── HERO + RADAR (combined, side-by-side on desktop) ─────────── */}
      <section className="hs-hero">

        {/* ── Left: text panel ── */}
        <div className="hs-left">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            style={{
              fontFamily: "'Georgia', serif",
              fontStyle: "italic",
              fontSize: 14,
              color: "#4a7c59",
              display: "block",
              marginBottom: 12,
              letterSpacing: "0.2px",
            }}
          >
            for home service professionals
          </motion.span>

    <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            style={{
              fontFamily: "'Georgia', serif",
              fontSize: "clamp(13px, 1.5vw, 20px)",
              fontWeight: 400,
              lineHeight: 1.2,
              color: "#1a1a18",
              margin: "0 0 18px",
              maxWidth: 320,
            }}
          >
            Be protected while going for home service.
          </motion.h1>

          {/* bullet points — minimal, small */}
          <motion.ul
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 28px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {HERO_POINTS.map((point, i) => (
              <li
                key={i}
                style={{
                  fontSize: 12.5,
                  color: "#777",
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  lineHeight: 1.55,
                  fontWeight: 300,
                  maxWidth: 310,
                }}
              >
                <span style={{ color: "#4a7c59", fontWeight: 500, flexShrink: 0, marginTop: 1 }}>—</span>
                {point}
              </li>
            ))}
          </motion.ul>

          {/* ── Category filter: single dropdown button ── */}
          <div style={{ position: "relative", marginBottom: 28 }}>
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 100,
                border: "1px solid rgba(0,0,0,0.14)",
                background: activeCat ? activeCat.color : "transparent",
                color: activeCat ? "#fff" : "#444",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {activeCat
                ? <><span style={{ fontSize: 13 }}>{activeCat.emoji}</span>{activeCat.label}</>
                : "All categories"}
              <ChevronDown size={12} style={{ opacity: 0.7 }} />
            </button>

            <AnimatePresence>
              {filterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.13 }}
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    background: "#fff",
                    border: "1px solid rgba(0,0,0,0.09)",
                    borderRadius: 14,
                    padding: 5,
                    zIndex: 100,
                    minWidth: 205,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.09)",
                  }}
                >
                  <button
                    onClick={() => { setActiveCategory(null); setFilterOpen(false); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "7px 10px", borderRadius: 8, border: "none",
                      background: !activeCategory ? "rgba(45,90,61,0.07)" : "transparent",
                      fontSize: 13, cursor: "pointer", color: "#333",
                      fontWeight: !activeCategory ? 500 : 400,
                    }}
                  >
                    All
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { setActiveCategory(cat.id); setFilterOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        width: "100%", textAlign: "left",
                        padding: "7px 10px", borderRadius: 8, border: "none",
                        background: activeCategory === cat.id ? "rgba(45,90,61,0.07)" : "transparent",
                        fontSize: 13, cursor: "pointer", color: "#333",
                        fontWeight: activeCategory === cat.id ? 500 : 400,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{cat.emoji}</span>
                      {cat.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── CTAs — left-aligned, minimal ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
            <Link href="/signup?mode=homeservice&role=provider">
              <motion.button
                whileHover={{ x: 3 }}
                style={{
                  background: "#2d5a3d", color: "#fff", border: "none",
                  padding: "10px 24px", borderRadius: 100,
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 7,
                  letterSpacing: "0.2px",
                }}
              >
                Offer home service <ChevronRight size={13} />
              </motion.button>
            </Link>
            <Link href="/signup?mode=homeservice&role=client">
              <motion.button
                whileHover={{ x: 3 }}
                style={{
                  background: "transparent", color: "#2d5a3d",
                  border: "1px solid rgba(45,90,61,0.38)",
                  padding: "10px 24px", borderRadius: 100,
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 7,
                  letterSpacing: "0.2px",
                }}
              >
                Get home service <ChevronRight size={13} />
              </motion.button>
            </Link>
          </div>
        </div>

        {/* ── Right: radar canvas ── */}
        <div ref={containerRef} className="hs-right">
          {/* subtle radial bg */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(circle at 50% 50%, rgba(45,90,61,0.03) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* 2D / 3D toggle — top right, minimal */}
          <div style={{
            position: "absolute", top: 14, right: 14, zIndex: 20,
            display: "flex", gap: 3,
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 9, padding: 3,
          }}>
            {(["2d", "3d"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "4px 11px", borderRadius: 6, border: "none",
                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 3,
                  background: view === v ? "#2d5a3d" : "transparent",
                  color: view === v ? "#fff" : "#888",
                  letterSpacing: "0.5px",
                }}
              >
                {v === "2d" ? <LayoutGrid size={10} /> : <Box size={10} />}
                {v.toUpperCase()}
              </button>
            ))}
          </div>

          <RadarCanvas dots={dots} view={view} onHover={setHoveredId} hoveredId={hoveredId} />

          {/* Center "You" — simple circle, no pill */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, calc(-50% + 24px))",
            pointerEvents: "none", zIndex: 10,
          }}>
            <div style={{
              background: "#2d5a3d", color: "#fff",
              width: 36, height: 36, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600,
              boxShadow: "0 4px 14px rgba(45,90,61,0.38)",
            }}>
              You
            </div>
          </div>

          {/* Provider popup */}
          <AnimatePresence>
            {hoveredCat && (
              <ProviderCard
                key={hoveredCat.id}
                category={hoveredCat}
                onClose={() => setHoveredId(null)}
              />
            )}
          </AnimatePresence>

          {/* Status bar */}
          <div style={{
            position: "absolute", bottom: 14, left: "50%",
            transform: "translateX(-50%)",
            fontSize: 11, color: "#c0c0c0",
            whiteSpace: "nowrap", pointerEvents: "none",
            letterSpacing: "0.2px",
          }}>
            {activeCategory
              ? `Showing ${CATEGORIES.find((c) => c.id === activeCategory)?.label}s near you`
              : "This is a preview showing how the app works"}
          </div>
        </div>
      </section>

      {/* ── Nigerian states marquee ────────────────────────────────────── */}
      <div style={{
        width: "100%", overflow: "hidden",
        borderTop: "1px solid rgba(0,0,0,0.05)",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
        background: "#faf9f6", padding: "13px 0",
      }}>
        <div className="marquee-track">
          {[...NIGERIAN_STATES, ...NIGERIAN_STATES].map((state, i) => (
            <span key={i} style={{ fontSize: 12, color: "#bbb", padding: "0 22px", flexShrink: 0, letterSpacing: "0.4px" }}>
              {state}
              <span style={{ marginLeft: 22, color: "rgba(45,90,61,0.28)" }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── SAFETY ────────────────────────────────────────────────────────── */}
      <section className="hs-section-full" style={{ background: "#fff", paddingTop: 80, paddingBottom: 80 }}>
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ fontFamily: "'Georgia', serif", fontStyle: "italic", fontSize: 17, color: "#4a7c59", display: "block", marginBottom: 12 }}
        >
          Built for your safety
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(28px, 3.5vw, 46px)", fontWeight: 400, color: "#1a1a18", margin: "0 0 16px", lineHeight: 1.15 }}
        >
          You were scared for a reason.
          <br />
          <span style={{ color: "#4a7c59" }}>Now you don't have to be.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
          style={{ fontSize: 16, color: "#666", maxWidth: 500, lineHeight: 1.7, marginBottom: 52, fontWeight: 300 }}
        >
          Every booking is backed by identity checks, automatic alerts to
          someone you trust, and escrow payments. So you can focus entirely on
          the work.
        </motion.p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {trusteePoints.map((pt, i) => (
            <motion.div
              key={pt.text}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              style={{ background: "#faf9f6", borderRadius: 20, border: "1px solid rgba(0,0,0,0.06)", padding: "28px 24px", position: "relative", overflow: "hidden" }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#2d5a3d", opacity: 0.6 + i * 0.1 }} />
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(45,90,61,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <pt.icon size={20} color="#2d5a3d" />
              </div>
              <p style={{ fontSize: 15, fontWeight: 500, color: "#1a1a18", lineHeight: 1.5, margin: 0 }}>{pt.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section className="hs-section-full" style={{ paddingTop: 0, paddingBottom: 80 }}>
        <div style={{ background: "#1a1a18", borderRadius: 24, padding: "64px 52px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "rgba(74,124,89,0.1)", pointerEvents: "none" }} />
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ fontFamily: "'Georgia', serif", fontStyle: "italic", fontSize: 17, color: "#7ab38a", display: "block", marginBottom: 12 }}
          >
            How it works
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(26px, 3vw, 38px)", fontWeight: 400, color: "#faf9f6", margin: "0 0 16px", lineHeight: 1.2 }}
          >
            Simple steps,<br />serious protection.
          </motion.h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", maxWidth: 400, lineHeight: 1.7, marginBottom: 52, fontWeight: 300 }}>
            From booking to payment, every step is automated and secured. You only show up and do the work.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 }}>
            {FLOW_STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div style={{ fontFamily: "'Georgia', serif", fontSize: 42, fontWeight: 400, color: "rgba(74,124,89,0.3)", lineHeight: 1, marginBottom: 16 }}>{step.num}</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#faf9f6", marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, fontWeight: 300 }}>{step.text}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTROL ───────────────────────────────────────────────────────── */}
      <section className="hs-section-full" style={{ paddingTop: 0, paddingBottom: 80 }}>
        <motion.span initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ fontFamily: "'Georgia', serif", fontStyle: "italic", fontSize: 17, color: "#4a7c59", display: "block", marginBottom: 12 }}>
          You're in control
        </motion.span>
        <motion.h2 initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 400, color: "#1a1a18", margin: "0 0 48px", lineHeight: 1.2 }}>
          Run your career{" "}
          <span style={{ color: "#4a7c59", fontStyle: "italic" }}>your way.</span>
        </motion.h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {[
            { emoji: "📍", title: "Location control",    text: "Set the exact areas clients can book you from. You decide your territory." },
            { emoji: "📅", title: "Schedule manager",    text: "Block dates and times you're unavailable. Bookings only land in open slots." },
            { emoji: "⚡", title: "Instant notifications", text: "Get alerted the moment a paying client books you — not a moment before." },
            { emoji: "🛡️", title: "Trustee setup",       text: "Add a trusted person's email once. They stay informed on every single job." },
          ].map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 18, padding: "24px 22px", display: "flex", gap: 16, alignItems: "flex-start" }}
            >
              <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{feat.emoji}</span>
              <div>
                <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 5, color: "#1a1a18" }}>{feat.title}</div>
                <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6, fontWeight: 300 }}>{feat.text}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section className="hs-section-full" style={{ background: "#fff", paddingTop: 80, paddingBottom: 80 }}>
        <motion.span initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ fontFamily: "'Georgia', serif", fontStyle: "italic", fontSize: 17, color: "#4a7c59", display: "block", marginBottom: 12 }}>
          Pricing
        </motion.span>
        <motion.h2 initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 400, color: "#1a1a18", margin: "0 0 16px" }}>
          One plan. No surprises.
        </motion.h2>
        <p style={{ fontSize: 16, color: "#666", maxWidth: 420, lineHeight: 1.7, marginBottom: 48, fontWeight: 300 }}>
          Pay monthly or save with yearly. Your first payment always covers 3 months so you can try it risk-free.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, maxWidth: 560 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ background: "#faf9f6", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 22, padding: "36px 32px", textAlign: "center" }}>
            <span style={{ fontFamily: "'Georgia', serif", fontStyle: "italic", fontSize: 15, color: "#4a7c59", display: "block", marginBottom: 14 }}>Monthly</span>
            <div style={{ fontFamily: "'Georgia', serif", fontSize: 52, fontWeight: 400, color: "#1a1a18", lineHeight: 1, marginBottom: 4 }}>₦1,000</div>
            <div style={{ fontSize: 13, color: "#999", marginBottom: 28, fontWeight: 300 }}>per month</div>
            <Link href="/signup?mode=homeservice">
              <button style={{ width: "100%", padding: "11px 0", background: "transparent", color: "#2d5a3d", border: "1.5px solid #2d5a3d", borderRadius: 100, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                Get started
              </button>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} style={{ background: "#2d5a3d", borderRadius: 22, padding: "36px 32px", textAlign: "center", position: "relative" }}>
            <span style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#f5a623", color: "#1a1a18", fontSize: 11, fontWeight: 600, padding: "4px 14px", borderRadius: 100, whiteSpace: "nowrap", letterSpacing: "0.5px" }}>3 MONTHS FREE</span>
            <span style={{ fontFamily: "'Georgia', serif", fontStyle: "italic", fontSize: 15, color: "rgba(255,255,255,0.65)", display: "block", marginBottom: 14 }}>Yearly</span>
            <div style={{ fontFamily: "'Georgia', serif", fontSize: 52, fontWeight: 400, color: "#fff", lineHeight: 1, marginBottom: 4 }}>₦9,000</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 28, fontWeight: 300 }}>per year · save ₦3,000</div>
            <Link href="/signup?mode=homeservice">
              <button style={{ width: "100%", padding: "11px 0", background: "#fff", color: "#2d5a3d", border: "none", borderRadius: 100, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Best value
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="hs-section-full" style={{ paddingTop: 96, paddingBottom: 96, textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
        <motion.span initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ fontFamily: "'Georgia', serif", fontStyle: "italic", fontSize: 52, color: "#4a7c59", display: "block", lineHeight: 1, marginBottom: 16 }}>
          Ready?
        </motion.span>
        <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 400, color: "#1a1a18", margin: "0 auto 16px", lineHeight: 1.15 }}>
          Join professionals who work without fear.
        </motion.h2>
        <p style={{ fontSize: 16, color: "#666", marginBottom: 40, fontWeight: 300, lineHeight: 1.7 }}>
          Verified. Paid. Safe. Start today.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/signup?mode=homeservice&role=provider">
            <motion.button whileHover={{ y: -2 }} style={{ background: "#2d5a3d", color: "#fff", border: "none", padding: "15px 36px", borderRadius: 100, fontSize: 16, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              Offer home service <ChevronRight size={16} />
            </motion.button>
          </Link>
          <Link href="/signup?mode=homeservice&role=client">
            <motion.button whileHover={{ y: -2 }} style={{ background: "transparent", color: "#2d5a3d", border: "1.5px solid #2d5a3d", padding: "15px 36px", borderRadius: 100, fontSize: 16, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              Get home service <ChevronRight size={16} />
            </motion.button>
          </Link>
        </div>
        <p style={{ marginTop: 28, fontSize: 13, color: "#bbb" }}>
          Looking for the main app?{" "}
          <Link href="https://skilled9ja.com" style={{ color: "#4a7c59", textDecoration: "none" }}>
            skilled9ja.com →
          </Link>
        </p>
      </section>
    </>
  );
}