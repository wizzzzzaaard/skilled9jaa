"use client";

import { useState, useEffect, useRef } from "react";

// ── Palette ───────────────────────────────────────────────────────────────────
const G = {
  dark: "#1a3d2b",
  mid:  "#2d6a4f",
  teal: "#52b788",
  bg:   "#f7faf8",
};

// ── Dots (5 rings, job-request labels) ────────────────────────────────────────
const DOTS = [
  { id: 1,  label: "I need a Lawyer",  angle: 20,  ring: 1 },
  { id: 2,  label: "Need Electrician", angle: 95,  ring: 2 },
  { id: 3,  label: "I need a Chef",    angle: 185, ring: 3 },
  { id: 4,  label: "Need Accountant",  angle: 268, ring: 4 },
  { id: 5,  label: "Need Developer",   angle: 55,  ring: 5 },
  { id: 6,  label: "I need a Tailor",  angle: 148, ring: 2 },
  { id: 7,  label: "Customer Service", angle: 232, ring: 3 },
  { id: 8,  label: "I need Plumber",   angle: 318, ring: 4 },
  { id: 9,  label: "Need a Driver",    angle: 128, ring: 5 },
  { id: 10, label: "Need Security",    angle: 300, ring: 1 },
];

// rings with 20% wider gaps — base ring 36, gaps of 30px each
// 36, 66, 96, 126, 156  (gap was ~25, now 30 = +20%)
const RINGS_2D  = [36, 66, 96, 126, 156];
const RINGS_3D  = [34, 62, 90, 118, 146];

// ── 2-D Radar ─────────────────────────────────────────────────────────────────
function Radar2D() {
  const [sweep,   setSweep  ] = useState<number>(0);
  const [visible, setVisible] = useState<number[]>([]);
  const rafRef = useRef<number>(0);
  const t0Ref  = useRef<number | null>(null);

  useEffect(() => {
    const tick = (ts: number) => {
      if (!t0Ref.current) t0Ref.current = ts;
      const deg = ((ts - t0Ref.current) * 0.038) % 360;
      setSweep(deg);
      setVisible(prev => {
        const s = new Set(prev);
        DOTS.forEach(d => { if (((deg - d.angle + 360) % 360) < 42) s.add(d.id); });
        return Array.from(s);
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const cx = 190, cy = 190;
  const outerR = RINGS_2D[4] + 14; // 170
  const sRad = (sweep * Math.PI) / 180;
  const PW = 80, PH = 18;
  const size = (outerR + 30) * 2; // full canvas

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <defs>
        <radialGradient id="bg2d" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={G.dark} stopOpacity="0.06" />
          <stop offset="100%" stopColor={G.dark} stopOpacity="0.01" />
        </radialGradient>
        <clipPath id="clip2d">
          <circle cx={cx} cy={cy} r={outerR} />
        </clipPath>
      </defs>

      <circle cx={cx} cy={cy} r={outerR} fill="url(#bg2d)" stroke={G.dark} strokeOpacity="0.07" strokeWidth="1" />

      {RINGS_2D.map((r, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={G.dark} strokeOpacity="0.10" strokeWidth="1" strokeDasharray="4 6" />
      ))}

      {[0, 90, 180, 270].map(a => {
        const rd = (a * Math.PI) / 180;
        return <line key={a} x1={cx} y1={cy} x2={cx + Math.cos(rd) * outerR} y2={cy + Math.sin(rd) * outerR} stroke={G.dark} strokeOpacity="0.06" strokeWidth="1" />;
      })}

      <g clipPath="url(#clip2d)">
        {Array.from({ length: 55 }).map((_, i) => {
          const rd = ((sweep - i * 0.75) * Math.PI) / 180;
          return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(rd) * outerR} y2={cy + Math.sin(rd) * outerR} stroke={G.teal} strokeOpacity={(1 - i / 55) * 0.20} strokeWidth="2" />;
        })}
        <line x1={cx} y1={cy} x2={cx + Math.cos(sRad) * outerR} y2={cy + Math.sin(sRad) * outerR} stroke={G.teal} strokeOpacity="0.80" strokeWidth="1.5" />
      </g>

      {DOTS.map(d => {
        const r   = RINGS_2D[d.ring - 1];
        const rad = (d.angle * Math.PI) / 180;
        const px  = cx + Math.cos(rad) * r;
        const py  = cy + Math.sin(rad) * r;
        const vis = visible.includes(d.id);
        return (
          <g key={d.id} style={{ opacity: vis ? 1 : 0, transition: "opacity 0.5s" }}>
            <rect x={px - PW / 2} y={py - PH / 2} width={PW} height={PH} rx={PH / 2}
              fill="white" stroke={G.teal} strokeWidth="1.2"
              filter="drop-shadow(0 2px 5px rgba(0,0,0,0.08))" />
            <text x={px} y={py} textAnchor="middle" dominantBaseline="central"
              fontSize="6.4" fontWeight="600" fill={G.mid} fontFamily="monospace">
              {d.label}
            </text>
            {vis && (
              <ellipse cx={px} cy={py} rx={PW / 2} ry={PH / 2} fill="none" stroke={G.teal} strokeWidth="1">
                <animate attributeName="rx" from={String(PW / 2)} to={String(PW / 2 + 12)} dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="ry" from={String(PH / 2)} to={String(PH / 2 + 7)}  dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" from="0.4" to="0" dur="1.8s" repeatCount="indefinite" />
              </ellipse>
            )}
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r="20" fill={G.dark} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="700" fill="white" fontFamily="monospace">YOU</text>
      <circle cx={cx} cy={cy} r="20" fill="none" stroke={G.teal} strokeWidth="1.5">
        <animate attributeName="r" from="20" to="36" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" from="0.7" to="0" dur="2.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

// ── 3-D Radar ─────────────────────────────────────────────────────────────────
function Radar3D() {
  const [sweep,   setSweep  ] = useState<number>(0);
  const [visible, setVisible] = useState<number[]>([]);
  const rafRef = useRef<number>(0);
  const t0Ref  = useRef<number | null>(null);

  useEffect(() => {
    const tick = (ts: number) => {
      if (!t0Ref.current) t0Ref.current = ts;
      const deg = ((ts - t0Ref.current) * 0.038) % 360;
      setSweep(deg);
      setVisible(prev => {
        const s = new Set(prev);
        DOTS.forEach(d => { if (((deg - d.angle + 360) % 360) < 42) s.add(d.id); });
        return Array.from(s);
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const cx = 190, cy = 200, sY = 0.42;
  const outerR = RINGS_3D[4];
  const CW = 76, CH = 18;

  const to3D = (angle: number, r: number) => {
    const rd = (angle * Math.PI) / 180;
    return { x: Math.cos(rd) * r, y: Math.sin(rd) * r * sY };
  };

  const sEnd = to3D(sweep, outerR);
  // viewBox tall enough to fit highest pillar
  const vbW = 380, vbH = 360;

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <defs>
        <radialGradient id="floor3d" cx="50%" cy="60%" r="50%">
          <stop offset="0%"   stopColor={G.dark} stopOpacity="0.09" />
          <stop offset="100%" stopColor={G.dark} stopOpacity="0.01" />
        </radialGradient>
      </defs>

      <ellipse cx={cx} cy={cy} rx={outerR + 10} ry={(outerR + 10) * sY} fill="url(#floor3d)" />

      {RINGS_3D.map((r, i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={r} ry={r * sY} fill="none" stroke={G.dark} strokeOpacity="0.12" strokeWidth="1" strokeDasharray="4 5" />
      ))}

      {[0, 60, 120, 180, 240, 300].map(a => {
        const p = to3D(a, outerR);
        return <line key={a} x1={cx} y1={cy} x2={cx + p.x} y2={cy + p.y} stroke={G.dark} strokeOpacity="0.07" strokeWidth="1" />;
      })}

      {Array.from({ length: 50 }).map((_, i) => {
        const e = to3D(sweep - i, outerR);
        return <line key={i} x1={cx} y1={cy} x2={cx + e.x} y2={cy + e.y} stroke={G.teal} strokeOpacity={(1 - i / 50) * 0.24} strokeWidth="2" />;
      })}
      <line x1={cx} y1={cy} x2={cx + sEnd.x} y2={cy + sEnd.y} stroke={G.teal} strokeOpacity="0.9" strokeWidth="2" />

      {DOTS.map(d => {
        const r   = RINGS_3D[d.ring - 1];
        const pos = to3D(d.angle, r);
        const bx  = cx + pos.x, by = cy + pos.y;
        const pH  = 22 + d.ring * 8;
        const vis = visible.includes(d.id);
        return (
          <g key={d.id} style={{ opacity: vis ? 1 : 0, transition: "opacity 0.5s" }}>
            <line x1={bx} y1={by} x2={bx} y2={by - pH} stroke={G.teal} strokeOpacity="0.20" strokeWidth="1" strokeDasharray="2 3" />
            <ellipse cx={bx} cy={by} rx="5" ry="2.5" fill={G.teal} fillOpacity="0.20" />
            <rect x={bx - CW / 2} y={by - pH - CH} width={CW} height={CH} rx="5"
              fill="white" stroke={G.teal} strokeWidth="1.2"
              filter="drop-shadow(0 2px 8px rgba(0,0,0,0.10))" />
            <text x={bx} y={by - pH - CH / 2} textAnchor="middle" dominantBaseline="central"
              fontSize="6.4" fontWeight="600" fill={G.mid} fontFamily="monospace">
              {d.label}
            </text>
            {vis && (
              <ellipse cx={bx} cy={by} rx="5" ry="2.5" fill="none" stroke={G.teal} strokeWidth="1">
                <animate attributeName="rx" from="5"   to="20" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="ry" from="2.5" to="9"  dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" from="0.6" to="0" dur="1.8s" repeatCount="indefinite" />
              </ellipse>
            )}
          </g>
        );
      })}

      <line x1={cx} y1={cy} x2={cx} y2={cy - 40} stroke={G.dark} strokeWidth="2" strokeOpacity="0.35" />
      <ellipse cx={cx} cy={cy} rx="10" ry="4.5" fill={G.dark} fillOpacity="0.16" />
      <rect x={cx - 20} y={cy - 58} width="40" height="18" rx="5" fill={G.dark} />
      <text x={cx} y={cy - 49} textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="700" fill="white" fontFamily="monospace">YOU</text>
      <text x={cx} y={cy + (outerR * sY) + 20} textAnchor="middle" fontSize="7.5" fill={G.dark} fillOpacity="0.28" fontFamily="monospace" letterSpacing="1">GPS PROXIMITY</text>
    </svg>
  );
}

// ── Problems ──────────────────────────────────────────────────────────────────
const PROBLEMS = [
  { n: "01", title: "Jobs closer to home",           body: "Get matched with clients and companies near you — less commute, lower cost, more work done." },
  { n: "02", title: "People find you automatically", body: "Anyone in your area searching for your skill sees you first. No chasing, no ads." },
  { n: "03", title: "Direct payments, zero cuts",    body: "Clients pay you straight. We never touch your money or take a commission." },
];

// ── Hero ──────────────────────────────────────────────────────────────────────
export function Hero() {
  const [mode, setMode] = useState<string>("3d");

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: G.bg }}>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", flexWrap: "wrap",
        maxWidth: 1100, margin: "0 auto",
        padding: "56px 24px 32px",
        alignItems: "center", gap: 32,
      }}>

        {/* LEFT */}
        <div style={{ flex: "1 1 280px", maxWidth: 400 }}>
          <p style={{
            fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
            color: G.teal, fontWeight: 600, marginBottom: 12,
            fontFamily: "monospace",
          }}>
      Here is how it works for artisan/employees.
          </p>
          <h1 style={{
            fontSize: "clamp(21px, 3.2vw, 34px)",
            fontWeight: 800, color: G.dark,
            lineHeight: 1.2, margin: "0 0 14px",
            letterSpacing: "-0.02em",
          }}>
            you find businesses closest to you based on your location,you find nearest artisans to you in realtime based on your location as well.
          </h1>
          <p style={{ fontSize: 13.5, color: "#6b7c74", lineHeight: 1.65, margin: "0 0 28px" }}>
            Get that job with accommodation and feeding in Lagos — apply within.
          </p>

          {/* Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "#9aada4", fontFamily: "monospace", letterSpacing: "0.08em" }}>VIEW</span>
            <div style={{ display: "flex", background: "#e4ede8", borderRadius: 99, padding: 3, gap: 2 }}>
              {(["3d", "2d"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: "5px 18px", borderRadius: 99, border: "none", cursor: "pointer",
                  fontFamily: "monospace", fontWeight: 700, fontSize: 11, letterSpacing: "0.05em",
                  background: mode === m ? G.dark : "transparent",
                  color:      mode === m ? "white" : G.mid,
                  transition: "all 0.2s",
                }}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — radar, no card frame, full width on mobile */}
        <div style={{ flex: "1 1 300px", width: "100%", maxWidth: 420 }}>
          {mode === "2d" ? <Radar2D /> : <Radar3D />}
        </div>
      </div>

      {/* ── PROBLEMS ──────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 72px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div style={{ flex: 1, height: 1, background: "#e4ede8" }} />
          <span style={{ fontSize: 10, color: "#9aada4", letterSpacing: "0.12em", fontFamily: "monospace" }}>PROBLEMS WE SOLVE</span>
          <div style={{ flex: 1, height: 1, background: "#e4ede8" }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {PROBLEMS.map(p => (
            <div key={p.n} style={{
              flex: "1 1 240px", background: "white",
              border: "1px solid #e4ede8", borderRadius: 14,
              padding: "24px 22px",
            }}>
              <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, color: G.teal, letterSpacing: "0.10em", fontFamily: "monospace", marginBottom: 10 }}>{p.n}</span>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: G.dark, margin: "0 0 6px" }}>{p.title}</h3>
              <p style={{ fontSize: 12.5, color: "#7a8f86", lineHeight: 1.6, margin: 0 }}>{p.body}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
