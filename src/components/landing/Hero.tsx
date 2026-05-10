import { useState, useEffect, useRef } from "react";

// ── Palette ──────────────────────────────────────────────────────────────────
const G = {
  dark:  "#1a3d2b",
  mid:   "#2d6a4f",
  teal:  "#52b788",
  pale:  "#d8f3dc",
  bg:    "#f7faf8",
  card:  "#ffffff",
};

// ── Artisan dots ─────────────────────────────────────────────────────────────
const DOTS = [
  { id: 1, label: "Plumber",      initials: "PL", angle: 30,  ring: 1 },
  { id: 2, label: "Electrician",  initials: "EL", angle: 110, ring: 2 },
  { id: 3, label: "Chef",         initials: "CH", angle: 200, ring: 1 },
  { id: 4, label: "Lawyer",       initials: "LW", angle: 300, ring: 3 },
  { id: 5, label: "Developer",    initials: "DE", angle: 70,  ring: 3 },
  { id: 6, label: "Tailor",       initials: "TA", angle: 160, ring: 2 },
  { id: 7, label: "Doctor",       initials: "DR", angle: 250, ring: 3 },
  { id: 8, label: "Builder",      initials: "BU", angle: 340, ring: 2 },
];

// ── 2-D Radar ────────────────────────────────────────────────────────────────
function Radar2D() {
  const [sweep,   setSweep  ] = useState(0);
  const [visible, setVisible] = useState([]);
  const rafRef  = useRef();
  const t0Ref   = useRef(null);

  useEffect(() => {
    const tick = (ts) => {
      if (!t0Ref.current) t0Ref.current = ts;
      const deg = ((ts - t0Ref.current) * 0.04) % 360;
      setSweep(deg);
      setVisible(prev => {
        const s = new Set(prev);
        DOTS.forEach(d => { if (((deg - d.angle + 360) % 360) < 40) s.add(d.id); });
        return [...s];
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const cx = 150, cy = 150, rings = [42, 78, 118];
  const sRad = (sweep * Math.PI) / 180;

  return (
    <svg width="300" height="300" viewBox="0 0 300 300" style={{ display: "block" }}>
      <defs>
        <radialGradient id="bg2" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={G.dark} stopOpacity="0.06" />
          <stop offset="100%" stopColor={G.dark} stopOpacity="0.01" />
        </radialGradient>
        <clipPath id="clip2"><circle cx={cx} cy={cy} r="122" /></clipPath>
      </defs>

      <circle cx={cx} cy={cy} r="122" fill="url(#bg2)" stroke={G.dark} strokeOpacity="0.08" strokeWidth="1" />

      {rings.map((r, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={G.dark} strokeOpacity="0.10" strokeWidth="1" strokeDasharray="4 6" />
      ))}
      {[0, 90, 180, 270].map(a => {
        const rd = (a * Math.PI) / 180;
        return <line key={a} x1={cx} y1={cy} x2={cx + Math.cos(rd) * 122} y2={cy + Math.sin(rd) * 122} stroke={G.dark} strokeOpacity="0.07" strokeWidth="1" />;
      })}

      <g clipPath="url(#clip2)">
        {[...Array(55)].map((_, i) => {
          const rd = ((sweep - i * 0.75) * Math.PI) / 180;
          return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(rd) * 122} y2={cy + Math.sin(rd) * 122} stroke={G.teal} strokeOpacity={(1 - i / 55) * 0.22} strokeWidth="2" />;
        })}
        <line x1={cx} y1={cy} x2={cx + Math.cos(sRad) * 122} y2={cy + Math.sin(sRad) * 122} stroke={G.teal} strokeOpacity="0.85" strokeWidth="1.5" />
      </g>

      {DOTS.map(d => {
        const r   = rings[d.ring - 1];
        const rad = (d.angle * Math.PI) / 180;
        const px  = cx + Math.cos(rad) * r;
        const py  = cy + Math.sin(rad) * r;
        const vis = visible.includes(d.id);
        return (
          <g key={d.id} transform={`translate(${px},${py})`} style={{ opacity: vis ? 1 : 0, transition: "opacity 0.5s" }}>
            <circle r="15" fill="white" stroke={G.teal} strokeWidth="1.5" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.10))" />
            <text textAnchor="middle" dominantBaseline="central" fontSize="7" fontWeight="700" fill={G.mid} fontFamily="'DM Mono', monospace">{d.initials}</text>
            {vis && (
              <circle r="15" fill="none" stroke={G.teal} strokeWidth="1" strokeOpacity="0.4">
                <animate attributeName="r" from="15" to="28" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" from="0.4" to="0" dur="1.8s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}

      {/* YOU */}
      <circle cx={cx} cy={cy} r="18" fill={G.dark} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="700" fill="white" fontFamily="'DM Mono', monospace">YOU</text>
      <circle cx={cx} cy={cy} r="18" fill="none" stroke={G.teal} strokeWidth="1.5">
        <animate attributeName="r" from="18" to="34" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" from="0.7" to="0" dur="2.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

// ── 3-D Radar ────────────────────────────────────────────────────────────────
function Radar3D() {
  const [sweep,   setSweep  ] = useState(0);
  const [visible, setVisible] = useState([]);
  const rafRef = useRef();
  const t0Ref  = useRef(null);

  useEffect(() => {
    const tick = (ts) => {
      if (!t0Ref.current) t0Ref.current = ts;
      const deg = ((ts - t0Ref.current) * 0.04) % 360;
      setSweep(deg);
      setVisible(prev => {
        const s = new Set(prev);
        DOTS.forEach(d => { if (((deg - d.angle + 360) % 360) < 40) s.add(d.id); });
        return [...s];
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const cx = 150, cy = 168, sY = 0.44, rings = [40, 75, 112];

  const to3D = (angle, r) => {
    const rd = (angle * Math.PI) / 180;
    return { x: Math.cos(rd) * r, y: Math.sin(rd) * r * sY };
  };

  const sEnd = to3D(sweep, rings[2]);

  return (
    <svg width="300" height="300" viewBox="0 0 300 300" style={{ display: "block" }}>
      <defs>
        <radialGradient id="floor3" cx="50%" cy="60%" r="50%">
          <stop offset="0%"   stopColor={G.dark} stopOpacity="0.10" />
          <stop offset="100%" stopColor={G.dark} stopOpacity="0.01" />
        </radialGradient>
      </defs>

      <ellipse cx={cx} cy={cy} rx={rings[2] + 10} ry={(rings[2] + 10) * sY} fill="url(#floor3)" />

      {rings.map((r, i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={r} ry={r * sY} fill="none" stroke={G.dark} strokeOpacity="0.14" strokeWidth="1" strokeDasharray="4 5" />
      ))}

      {[0, 60, 120, 180, 240, 300].map(a => {
        const p = to3D(a, rings[2]);
        return <line key={a} x1={cx} y1={cy} x2={cx + p.x} y2={cy + p.y} stroke={G.dark} strokeOpacity="0.08" strokeWidth="1" />;
      })}

      {[...Array(50)].map((_, i) => {
        const e = to3D(sweep - i, rings[2]);
        return <line key={i} x1={cx} y1={cy} x2={cx + e.x} y2={cy + e.y} stroke={G.teal} strokeOpacity={(1 - i / 50) * 0.25} strokeWidth="2" />;
      })}
      <line x1={cx} y1={cy} x2={cx + sEnd.x} y2={cy + sEnd.y} stroke={G.teal} strokeOpacity="0.9" strokeWidth="2" />

      {DOTS.map(d => {
        const r   = rings[d.ring - 1];
        const pos = to3D(d.angle, r);
        const bx  = cx + pos.x, by = cy + pos.y;
        const pH  = 24 + d.ring * 8;
        const vis = visible.includes(d.id);
        return (
          <g key={d.id} style={{ opacity: vis ? 1 : 0, transition: "opacity 0.5s" }}>
            <line x1={bx} y1={by} x2={bx} y2={by - pH} stroke={G.teal} strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 3" />
            <ellipse cx={bx} cy={by} rx="5" ry="2.5" fill={G.teal} fillOpacity="0.25" />
            <rect x={bx - 18} y={by - pH - 16} width="36" height="16" rx="4" fill="white" stroke={G.teal} strokeWidth="1.2" filter="drop-shadow(0 2px 8px rgba(0,0,0,0.12))" />
            <text x={bx} y={by - pH - 8} textAnchor="middle" dominantBaseline="central" fontSize="7" fontWeight="700" fill={G.mid} fontFamily="'DM Mono', monospace">{d.initials}</text>
            {vis && (
              <ellipse cx={bx} cy={by} rx="5" ry="2.5" fill="none" stroke={G.teal} strokeWidth="1">
                <animate attributeName="rx" from="5" to="18" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="ry" from="2.5" to="8" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" from="0.6" to="0" dur="1.8s" repeatCount="indefinite" />
              </ellipse>
            )}
          </g>
        );
      })}

      {/* YOU */}
      <line x1={cx} y1={cy} x2={cx} y2={cy - 38} stroke={G.dark} strokeWidth="2" strokeOpacity="0.4" />
      <ellipse cx={cx} cy={cy} rx="10" ry="4.5" fill={G.dark} fillOpacity="0.2" />
      <rect x={cx - 20} y={cy - 56} width="40" height="18" rx="5" fill={G.dark} />
      <text x={cx} y={cy - 47} textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="700" fill="white" fontFamily="'DM Mono', monospace">YOU</text>

      <text x={cx} y={cy + (rings[2] * sY) + 16} textAnchor="middle" fontSize="8" fill={G.dark} fillOpacity="0.35" fontFamily="'DM Mono', monospace" letterSpacing="1">GPS PROXIMITY</text>
    </svg>
  );
}

// ── Problems section data ────────────────────────────────────────────────────
const PROBLEMS = [
  {
    n: "01",
    title: "Jobs closer to home",
    body: "Get matched with clients and companies near you — less commute, lower cost, more work done.",
  },
  {
    n: "02",
    title: "People find you automatically",
    body: "Anyone in your area searching for your skill sees you first. No chasing, no ads.",
  },
  {
    n: "03",
    title: "Direct payments, zero cuts",
    body: "Clients pay you straight. We never touch your money or take a commission.",
  },
];

// ── Hero ─────────────────────────────────────────────────────────────────────
export default function Hero() {
  const [mode, setMode] = useState("2d");

  return (
    <div style={{ fontFamily: "'DM Sans', Georgia, sans-serif", background: G.bg, minHeight: "100vh" }}>

      {/* ── HERO ROW ──────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", flexWrap: "wrap",
        maxWidth: 1080, margin: "0 auto",
        padding: "60px 32px 40px",
        alignItems: "center", gap: 40,
      }}>

        {/* LEFT — text */}
        <div style={{ flex: "1 1 300px", maxWidth: 420 }}>
          <p style={{
            fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
            color: G.teal, fontWeight: 600, marginBottom: 14,
            fontFamily: "'DM Mono', monospace",
          }}>
            Here's exactly how
          </p>

          <h1 style={{
            fontSize: "clamp(26px, 4vw, 42px)",
            fontWeight: 800, color: G.dark,
            lineHeight: 1.18, margin: "0 0 20px",
            letterSpacing: "-0.02em",
          }}>
            You find artisans, companies & employees — using your GPS.
          </h1>

          <p style={{
            fontSize: 14, color: "#6b7c74",
            lineHeight: 1.65, margin: "0 0 32px",
            fontWeight: 400,
          }}>
            Proximity-first discovery. Whoever is nearest shows up first — for both sides.
          </p>

          {/* 2D / 3D toggle — left side */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "#9aada4", fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>VIEW</span>
            <div style={{ display: "flex", background: "#e4ede8", borderRadius: 99, padding: 3, gap: 2 }}>
              {["2d", "3d"].map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: "5px 18px", borderRadius: 99, border: "none",
                  cursor: "pointer", fontFamily: "'DM Mono', monospace",
                  fontWeight: 700, fontSize: 11, letterSpacing: "0.05em",
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
        <div style={{ flex: "1 1 300px", display: "flex", justifyContent: "center" }}>
          <div style={{
            background: "white", borderRadius: 24,
            padding: 20,
            boxShadow: "0 4px 40px rgba(26,61,43,0.07)",
            border: "1px solid #e4ede8",
          }}>
            {mode === "2d" ? <Radar2D /> : <Radar3D />}
          </div>
        </div>
      </div>

      {/* ── PROBLEMS ROW ──────────────────────────────────────────────── */}
      <div style={{
        maxWidth: 1080, margin: "0 auto",
        padding: "0 32px 80px",
      }}>
        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
          <div style={{ flex: 1, height: 1, background: "#e4ede8" }} />
          <span style={{ fontSize: 11, color: "#9aada4", letterSpacing: "0.12em", fontFamily: "'DM Mono', monospace" }}>PROBLEMS WE SOLVE</span>
          <div style={{ flex: 1, height: 1, background: "#e4ede8" }} />
        </div>

        {/* Cards */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          {PROBLEMS.map(p => (
            <div key={p.n} style={{
              flex: "1 1 260px",
              background: "white",
              border: "1px solid #e4ede8",
              borderRadius: 16,
              padding: "28px 28px 26px",
            }}>
              <span style={{
                display: "inline-block",
                fontSize: 10, fontWeight: 700,
                color: G.teal, letterSpacing: "0.10em",
                fontFamily: "'DM Mono', monospace",
                marginBottom: 12,
              }}>{p.n}</span>
              <h3 style={{
                fontSize: 15, fontWeight: 700,
                color: G.dark, margin: "0 0 8px",
                letterSpacing: "-0.01em",
              }}>{p.title}</h3>
              <p style={{ fontSize: 13, color: "#7a8f86", lineHeight: 1.6, margin: 0 }}>{p.body}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
