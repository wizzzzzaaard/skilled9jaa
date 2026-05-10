"use client";

import { useState, useEffect, useRef } from "react";

// ── Palette ───────────────────────────────────────────────────────────────────
const G = {
  dark: "#1a3d2b",
  mid:  "#2d6a4f",
  teal: "#52b788",
  pale: "#d8f3dc",
  bg:   "#f7faf8",
};

// ── Dots data (5 rings, job-request labels) ───────────────────────────────────
const DOTS = [
  { id: 1,  label: "I need a Lawyer",   angle: 20,  ring: 1 },
  { id: 2,  label: "Need Electrician",  angle: 95,  ring: 2 },
  { id: 3,  label: "I need a Chef",     angle: 185, ring: 3 },
  { id: 4,  label: "Need Accountant",   angle: 268, ring: 4 },
  { id: 5,  label: "Need Developer",    angle: 55,  ring: 5 },
  { id: 6,  label: "I need a Tailor",   angle: 148, ring: 2 },
  { id: 7,  label: "Customer Service",  angle: 232, ring: 3 },
  { id: 8,  label: "I need Plumber",    angle: 318, ring: 4 },
  { id: 9,  label: "Need a Driver",     angle: 128, ring: 5 },
  { id: 10, label: "Need Security",     angle: 300, ring: 1 },
];

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

  const cx = 170, cy = 170;
  const rings = [32, 57, 82, 106, 130];
  const outerR = 138;
  const sRad = (sweep * Math.PI) / 180;
  const PW = 78, PH = 18;

  return (
    <svg width="340" height="340" viewBox="0 0 340 340" style={{ display: "block" }}>
      <defs>
        <radialGradient id="bg2d" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={G.dark} stopOpacity="0.07" />
          <stop offset="100%" stopColor={G.dark} stopOpacity="0.01" />
        </radialGradient>
        <clipPath id="clip2d"><circle cx={cx} cy={cy} r={outerR} /></clipPath>
      </defs>

      <circle cx={cx} cy={cy} r={outerR} fill="url(#bg2d)" stroke={G.dark} strokeOpacity="0.08" strokeWidth="1" />

      {rings.map((r, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={G.dark} strokeOpacity="0.10" strokeWidth="1" strokeDasharray="4 6" />
      ))}

      {[0, 90, 180, 270].map(a => {
        const rd = (a * Math.PI) / 180;
        return <line key={a} x1={cx} y1={cy} x2={cx + Math.cos(rd) * outerR} y2={cy + Math.sin(rd) * outerR} stroke={G.dark} strokeOpacity="0.07" strokeWidth="1" />;
      })}

      <g clipPath="url(#clip2d)">
        {Array.from({ length: 55 }).map((_, i) => {
          const rd = ((sweep - i * 0.75) * Math.PI) / 180;
          return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(rd) * outerR} y2={cy + Math.sin(rd) * outerR} stroke={G.teal} strokeOpacity={(1 - i / 55) * 0.22} strokeWidth="2" />;
        })}
        <line x1={cx} y1={cy} x2={cx + Math.cos(sRad) * outerR} y2={cy + Math.sin(sRad) * outerR} stroke={G.teal} strokeOpacity="0.85" strokeWidth="1.5" />
      </g>

      {DOTS.map(d => {
        const r   = rings[d.ring - 1];
        const rad = (d.angle * Math.PI) / 180;
        const px  = cx + Math.cos(rad) * r;
        const py  = cy + Math.sin(rad) * r;
        const vis = visible.includes(d.id);
        return (
          <g key={d.id} style={{ opacity: vis ? 1 : 0, transition: "opacity 0.5s" }}>
            <rect x={px - PW / 2} y={py - PH / 2} width={PW} height={PH} rx={PH / 2}
              fill="white" stroke={G.teal} strokeWidth="1.2"
              filter="drop-shadow(0 2px 5px rgba(0,0,0,0.09))" />
            <text x={px} y={py} textAnchor="middle" dominantBaseline="central"
              fontSize="6.2" fontWeight="600" fill={G.mid} fontFamily="'DM Mono', monospace">
              {d.label}
            </text>
            {vis && (
              <ellipse cx={px} cy={py} rx={PW / 2} ry={PH / 2} fill="none" stroke={G.teal} strokeWidth="1">
                <animate attributeName="rx" from={String(PW / 2)} to={String(PW / 2 + 10)} dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="ry" from={String(PH / 2)} to={String(PH / 2 + 6)}  dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" from="0.4" to="0" dur="1.8s" repeatCount="indefinite" />
              </ellipse>
            )}
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r="20" fill={G.dark} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="700" fill="white" fontFamily="'DM Mono', monospace">YOU</text>
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

  const cx = 170, cy = 188, sY = 0.42;
  const rings = [30, 54, 78, 100, 122];
  const outerR = rings[4];
  const CW = 74, CH = 18;

  const to3D = (angle: number, r: number) => {
    const rd = (angle * Math.PI) / 180;
    return { x: Math.cos(rd) * r, y: Math.sin(rd) * r * sY };
  };

  const sEnd = to3D(sweep, outerR);

  return (
    <svg width="340" height="330" viewBox="0 0 340 330" style={{ display: "block" }}>
      <defs>
        <radialGradient id="floor3d" cx="50%" cy="60%" r="50%">
          <stop offset="0%"   stopColor={G.dark} stopOpacity="0.10" />
          <stop offset="100%" stopColor={G.dark} stopOpacity="0.01" />
        </radialGradient>
      </defs>

      <ellipse cx={cx} cy={cy} rx={outerR + 10} ry={(outerR + 10) * sY} fill="url(#floor3d)" />

      {rings.map((r, i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={r} ry={r * sY} fill="none" stroke={G.dark} strokeOpacity="0.13" strokeWidth="1" strokeDasharray="4 5" />
      ))}

      {[0, 60, 120, 180, 240, 300].map(a => {
        const p = to3D(a, outerR);
        return <line key={a} x1={cx} y1={cy} x2={cx + p.x} y2={cy + p.y} stroke={G.dark} strokeOpacity="0.08" strokeWidth="1" />;
      })}

      {Array.from({ length: 50 }).map((_, i) => {
        const e = to3D(sweep - i, outerR);
        return <line key={i} x1={cx} y1={cy} x2={cx + e.x} y2={cy + e.y} stroke={G.teal} strokeOpacity={(1 - i / 50) * 0.25} strokeWidth="2" />;
      })}
      <line x1={cx} y1={cy} x2={cx + sEnd.x} y2={cy + sEnd.y} stroke={G.teal} strokeOpacity="0.9" strokeWidth="2" />

      {DOTS.map(d => {
        const r   = rings[d.ring - 1];
        const pos = to3D(d.angle, r);
        const bx  = cx + pos.x, by = cy + pos.y;
        const pH  = 20 + d.ring * 7;
        const vis = visible.includes(d.id);
        return (
          <g key={d.id} style={{ opacity: vis ? 1 : 0, transition: "opacity 0.5s" }}>
            <line x1={bx} y1={by} x2={bx} y2={by - pH} stroke={G.teal} strokeOpacity="0.22" strokeWidth="1" strokeDasharray="2 3" />
            <ellipse cx={bx} cy={by} rx="5" ry="2.5" fill={G.teal} fillOpacity="0.22" />
            <rect x={bx - CW / 2} y={by - pH - CH} width={CW} height={CH} rx="5"
              fill="white" stroke={G.teal} strokeWidth="1.2"
              filter="drop-shadow(0 2px 8px rgba(0,0,0,0.11))" />
            <text x={bx} y={by - pH - CH / 2} textAnchor="middle" dominantBaseline="central"
              fontSize="6.2" fontWeight="600" fill={G.mid} fontFamily="'DM Mono', monospace">
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

      <line x1={cx} y1={cy} x2={cx} y2={cy - 40} stroke={G.dark} strokeWidth="2" strokeOpacity="0.4" />
      <ellipse cx={cx} cy={cy} rx="10" ry="4.5" fill={G.dark} fillOpacity="0.18" />
      <rect x={cx - 20} y={cy - 58} width="40" height="18" rx="5" fill={G.dark} />
      <text x={cx} y={cy - 49} textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="700" fill="white" fontFamily="'DM Mono', monospace">YOU</text>
      <text x={cx} y={cy + (outerR * sY) + 18} textAnchor="middle" fontSize="7.5" fill={G.dark} fillOpacity="0.30" fontFamily="'DM Mono', monospace" letterSpacing="1">GPS PROXIMITY</text>
    </svg>
  );
}

// ── Problems section ──────────────────────────────────────────────────────────
const PROBLEMS = [
  { n: "01", title: "Jobs closer to home",          body: "Get matched with clients and companies near you — less commute, lower cost, more work done." },
  { n: "02", title: "People find you automatically", body: "Anyone in your area searching for your skill sees you first. No chasing, no ads." },
  { n: "03", title: "Direct payments, zero cuts",    body: "Clients pay you straight. We never touch your money or take a commission." },
];

// ── Hero ──────────────────────────────────────────────────────────────────────
export function Hero() {
  const [mode, setMode] = useState<string>("3d");

  return (
    <div style={{ fontFamily: "'DM Sans', Georgia, sans-serif", background: G.bg, minHeight: "100vh" }}>

      <div style={{ display: "flex", flexWrap: "wrap", maxWidth: 1100, margin: "0 auto", padding: "60px 32px 40px", alignItems: "center", gap: 40 }}>

        {/* LEFT */}
        <div style={{ flex: "1 1 300px", maxWidth: 400 }}>
          <p style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: G.teal, fontWeight: 600, marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>
            Your opportunity buddy.
          </p>
          <h1 style={{ fontSize: "clamp(21px, 3.2vw, 34px)", fontWeight: 800, color: G.dark, lineHeight: 1.2, margin: "0 0 16px", letterSpacing: "-0.02em", textAlign: "left" }}>
            Get unlimited job calls and employment opportunities.
          </h1>
          <p style={{ fontSize: 13.5, color: "#6b7c74", lineHeight: 1.65, margin: "0 0 30px", fontWeight: 400 }}>
            Get that job with accommodation and feeding in Lagos — apply within.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "#9aada4", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>VIEW</span>
            <div style={{ display: "flex", background: "#e4ede8", borderRadius: 99, padding: 3, gap: 2 }}>
              {(["3d", "2d"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: "5px 18px", borderRadius: 99, border: "none", cursor: "pointer",
                  fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 11, letterSpacing: "0.05em",
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

        {/* RIGHT — radar */}
        <div style={{ flex: "1 1 340px", display: "flex", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: 24, padding: 16, boxShadow: "0 4px 40px rgba(26,61,43,0.07)", border: "1px solid #e4ede8" }}>
            {mode === "2d" ? <Radar2D /> : <Radar3D />}
          </div>
        </div>
      </div>

      {/* PROBLEMS */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
          <div style={{ flex: 1, height: 1, background: "#e4ede8" }} />
          <span style={{ fontSize: 10, color: "#9aada4", letterSpacing: "0.12em", fontFamily: "'DM Mono', monospace" }}>PROBLEMS WE SOLVE</span>
          <div style={{ flex: 1, height: 1, background: "#e4ede8" }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
          {PROBLEMS.map(p => (
            <div key={p.n} style={{ flex: "1 1 250px", background: "white", border: "1px solid #e4ede8", borderRadius: 16, padding: "26px 26px 24px" }}>
              <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, color: G.teal, letterSpacing: "0.10em", fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>{p.n}</span>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: G.dark, margin: "0 0 7px", letterSpacing: "-0.01em" }}>{p.title}</h3>
              <p style={{ fontSize: 12.5, color: "#7a8f86", lineHeight: 1.6, margin: 0 }}>{p.body}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
