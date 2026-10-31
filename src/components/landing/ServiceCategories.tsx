"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Wrench, Users, Laptop, ShieldCheck,
  ArrowRight, CheckCircle2,
} from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const GREEN = "#2d5a3d";

const PANELS = [
  {
    id: "artisans",
    tab: "Artisans",
    icon: Wrench,
    accent: "#2d5a3d",
    accentBg: "#eef5f0",
    headline: "Skilled Hands, Near You",
    subline: "Plumbers, electricians, carpenters, tailors — verified tradespeople ready to work, available in your neighbourhood within hours.",
    points: [
      "GPS-matched to your location",
      "Verified credentials & reviews",
      "20+ calls per week guaranteed",
    ],
    cta: "Find an Artisan",
    href: "/find?type=artisan",
    visual: "artisan",
  },
  {
    id: "employees",
    tab: "Employees",
    icon: Users,
    accent: "#1e4d6b",
    accentBg: "#eef3f7",
    headline: "Professional Talent, Fast",
    subline: "Accountants, lawyers, receptionists, programmers — connect with qualified professionals for full-time, part-time, or contract roles.",
    points: [
      "Vetted professional profiles",
      "Salary negotiation built in",
      "Hire in as little as 5 days",
    ],
    cta: "Browse Talent",
    href: "/find?type=employee",
    visual: "employee",
  },
  {
    id: "remote",
    tab: "Work From Home",
    icon: Laptop,
    accent: "#4a3d7a",
    accentBg: "#f0eef7",
    headline: "Opportunities Without Borders",
    subline: "Remote roles across Nigeria and beyond. From virtual assistants to developers — find flexible work that fits your life.",
    points: [
      "100% remote verified listings",
      "Flexible hours & contracts",
      "Get paid safely via escrow",
    ],
    cta: "Explore Remote Jobs",
    href: "/find?type=remote",
    visual: "remote",
  },
  {
    id: "shield",
    tab: "HomeService Shield",
    icon: ShieldCheck,
    accent: "#7a3d2d",
    accentBg: "#f7f0ee",
    headline: "Safety Built Into Every Visit",
    subline: "Our HomeService Shield protects every service provider before they step out the door. We verify the client, log the location, and keep a trusted contact in the loop.",
    points: [
      "Client identity verified before visit",
      "Location & details sent to your trustee email",
      "Client notified you're on your way",
    ],
    cta: "Learn About Shield",
    href: "/homeservice",
    visual: "shield",
  },
] as const;

type PanelId = (typeof PANELS)[number]["id"];

// ─── Visuals ──────────────────────────────────────────────────────────────────

function ArtisanVisual() {
  return (
    <svg viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="200" rx="16" fill="#eef5f0" />
      {[40,80,120,160,200].map(x => <line key={x} x1={x} y1="0" x2={x} y2="200" stroke="#d4e8db" strokeWidth="0.5"/>)}
      {[40,80,120,160].map(y => <line key={y} x1="0" y1={y} x2="260" y2={y} stroke="#d4e8db" strokeWidth="0.5"/>)}
      <circle cx="130" cy="100" r="22" fill={GREEN} fillOpacity="0.12"/>
      <circle cx="130" cy="100" r="12" fill={GREEN}/>
      <text x="130" y="104" textAnchor="middle" fill="white" fontSize="7" fontWeight="600">You</text>
      {[
        {cx:72, cy:60, label:"⚡"},
        {cx:185, cy:72, label:"🔧"},
        {cx:58,  cy:138, label:"🪚"},
        {cx:196, cy:148, label:"🪣"},
      ].map((d,i) => (
        <g key={i}>
          <circle cx={d.cx} cy={d.cy} r="18" fill="white" stroke={GREEN} strokeWidth="1.2"/>
          <text x={d.cx} y={d.cy+5} textAnchor="middle" fontSize="12">{d.label}</text>
        </g>
      ))}
      {[[72,60],[185,72],[58,138],[196,148]].map(([x,y],i) => (
        <line key={i} x1="130" y1="100" x2={x} y2={y} stroke={GREEN} strokeWidth="0.8" strokeDasharray="4 3" opacity="0.4"/>
      ))}
      <circle cx="130" cy="100" r="4" fill="white"/>
    </svg>
  );
}

function EmployeeVisual() {
  const cards = [
    { name: "Chukwuma D.", role: "Accountant", yrs: "6 yrs" },
    { name: "Funke A.",    role: "Receptionist", yrs: "3 yrs" },
    { name: "Yemi A.",     role: "Developer", yrs: "5 yrs" },
  ];
  return (
    <svg viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="200" rx="16" fill="#eef3f7"/>
      {cards.map((c, i) => (
        <g key={i} transform={`translate(18, ${16 + i * 58})`}>
          <rect width="224" height="50" rx="10" fill="white" stroke="#c8dce8" strokeWidth="0.8"/>
          <circle cx="28" cy="25" r="14" fill="#c8dce8"/>
          <text x="28" y="29" textAnchor="middle" fill="#1e4d6b" fontSize="9" fontWeight="700">
            {c.name.split(" ").map(w=>w[0]).join("")}
          </text>
          <text x="52" y="20" fill="#1a1a18" fontSize="10" fontWeight="650">{c.name}</text>
          <text x="52" y="34" fill="#6a8a9a" fontSize="9">{c.role}</text>
          <rect x="170" y="16" width="38" height="18" rx="9" fill="#eef3f7"/>
          <text x="189" y="28" textAnchor="middle" fill="#1e4d6b" fontSize="8.5" fontWeight="600">{c.yrs}</text>
          <text x="170" y="44" fill="#f5a623" fontSize="9">★★★★★</text>
        </g>
      ))}
    </svg>
  );
}

function RemoteVisual() {
  return (
    <svg viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="200" rx="16" fill="#f0eef7"/>
      <rect x="55" y="55" width="150" height="95" rx="8" fill="white" stroke="#c8c0e0" strokeWidth="1"/>
      <rect x="65" y="65" width="130" height="72" rx="4" fill="#f0eef7"/>
      <rect x="75" y="74" width="60" height="7" rx="3" fill="#c8c0e0"/>
      <rect x="75" y="86" width="42" height="5" rx="2.5" fill="#d8d4ec"/>
      <rect x="75" y="96" width="50" height="5" rx="2.5" fill="#d8d4ec"/>
      <rect x="75" y="106" width="36" height="5" rx="2.5" fill="#d8d4ec"/>
      <circle cx="165" cy="98" r="22" fill="#4a3d7a" fillOpacity="0.12"/>
      <circle cx="165" cy="98" r="14" fill="#4a3d7a"/>
      <text x="165" y="103" textAnchor="middle" fill="white" fontSize="14">✓</text>
      <rect x="40" y="150" width="180" height="8" rx="4" fill="#c8c0e0"/>
      <rect x="110" y="148" width="40" height="4" rx="2" fill="#d8d4ec"/>
      <rect x="18" y="40" width="54" height="18" rx="9" fill="white" stroke="#c8c0e0" strokeWidth="0.8"/>
      <text x="45" y="53" textAnchor="middle" fill="#4a3d7a" fontSize="8.5" fontWeight="600">Remote ✦</text>
      <rect x="188" y="130" width="52" height="18" rx="9" fill="white" stroke="#c8c0e0" strokeWidth="0.8"/>
      <text x="214" y="143" textAnchor="middle" fill="#4a3d7a" fontSize="8.5" fontWeight="600">Flexible</text>
    </svg>
  );
}

function ShieldVisual() {
  const RUST = "#7a3d2d";
  const steps = [
    { y: 28,  icon: "👤", label: "Client verified" },
    { y: 88,  icon: "📍", label: "Location logged" },
    { y: 148, icon: "✉️", label: "Trustee notified" },
  ];
  return (
    <svg viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="200" rx="16" fill="#f7f0ee"/>
      <line x1="48" y1="52" x2="48" y2="172" stroke="#e0c8c0" strokeWidth="1.5" strokeDasharray="4 3"/>
      {steps.map((s,i) => (
        <g key={i}>
          <circle cx="48" cy={s.y + 24} r="18" fill="white" stroke="#e0c8c0" strokeWidth="1"/>
          <text x="48" y={s.y + 29} textAnchor="middle" fontSize="13">{s.icon}</text>
          <rect x="80" y={s.y + 10} width="158" height="30" rx="8" fill="white" stroke="#e8d8d4" strokeWidth="0.8"/>
          <text x="94" y={s.y + 29} fill="#1a1a18" fontSize="10.5" fontWeight="600">{s.label}</text>
        </g>
      ))}
      <circle cx="216" cy="34" r="22" fill={RUST} fillOpacity="0.10"/>
      <circle cx="216" cy="34" r="14" fill={RUST}/>
      <text x="216" y="39" textAnchor="middle" fill="white" fontSize="14">🛡</text>
    </svg>
  );
}

const VISUALS: Record<string, React.ReactNode> = {
  artisan:  <ArtisanVisual />,
  employee: <EmployeeVisual />,
  remote:   <RemoteVisual />,
  shield:   <ShieldVisual />,
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function ServiceCategories() {
  const [active, setActive] = useState<PanelId>("artisans");
  const autoRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const panel               = PANELS.find(p => p.id === active)!;

  useEffect(() => {
    autoRef.current = setInterval(() => {
      setActive(prev => {
        const idx = PANELS.findIndex(p => p.id === prev);
        return PANELS[(idx + 1) % PANELS.length].id;
      });
    }, 5000);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, []);

  const pick = (id: PanelId) => {
    setActive(id);
    if (autoRef.current) clearInterval(autoRef.current);
    autoRef.current = setInterval(() => {
      setActive(prev => {
        const idx = PANELS.findIndex(p => p.id === prev);
        return PANELS[(idx + 1) % PANELS.length].id;
      });
    }, 5000);
  };

  return (
    <section style={{ background: "#fff", padding: "72px 0 80px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px" }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          style={{ marginBottom: 36 }}
        >
          <h2 style={{
            fontSize: "clamp(21px, 3.5vw, 30px)", fontWeight: 700,
            color: GREEN, letterSpacing: "-0.02em", marginBottom: 8,
          }}>
            Everything You Need
          </h2>
          <p style={{ fontSize: 13.5, color: "#8a8a82", maxWidth: 420, lineHeight: 1.6 }}>
            Skilled9ja connects artisans, professionals, and remote workers — with safety built in at every step.
          </p>
        </motion.div>

        {/* Main layout */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "200px 1fr",
          gap: 20,
          alignItems: "start",
        }}
          className="offering-grid"
        >
          {/* Tab list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }} className="tab-list">
            {PANELS.map(p => {
              const Icon = p.icon;
              const isActive = p.id === active;
              return (
                <button
                  key={p.id}
                  onClick={() => pick(p.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 14px", borderRadius: 12, cursor: "pointer",
                    border: isActive
                      ? `1.5px solid ${p.accent}22`
                      : "1.5px solid transparent",
                    background: isActive ? p.accentBg : "transparent",
                    transition: "all 0.22s ease",
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: isActive ? p.accent : "rgba(0,0,0,0.05)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.22s ease",
                  }}>
                    <Icon size={15} color={isActive ? "#fff" : "#8a8a82"} strokeWidth={1.8}/>
                  </div>
                  <span style={{
                    fontSize: 12.5, fontWeight: isActive ? 650 : 450,
                    color: isActive ? p.accent : "#5a5a52",
                    lineHeight: 1.3, transition: "all 0.22s ease",
                  }}>
                    {p.tab}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="activeBar"
                      style={{
                        marginLeft: "auto", width: 3, height: 20,
                        borderRadius: 2, background: p.accent, flexShrink: 0,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.30 }}
              style={{
                background: panel.accentBg,
                border: `1px solid ${panel.accent}18`,
                borderRadius: 20,
                padding: "28px 26px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
                alignItems: "center",
                minHeight: 240,
              }}
              className="panel-inner"
            >
              {/* Left: text */}
              <div>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: panel.accent, borderRadius: 100,
                  padding: "4px 12px", marginBottom: 14,
                }}>
                  <panel.icon size={11} color="#fff" strokeWidth={2}/>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: "#fff", letterSpacing: "0.04em" }}>
                    {panel.tab}
                  </span>
                </div>

                <h3 style={{
                  fontSize: "clamp(16px, 2.5vw, 21px)", fontWeight: 700,
                  color: "#1a1a18", letterSpacing: "-0.015em",
                  marginBottom: 10, lineHeight: 1.3,
                }}>
                  {panel.headline}
                </h3>

                <p style={{
                  fontSize: 12.5, color: "#6a6a62", lineHeight: 1.65,
                  marginBottom: 16,
                }}>
                  {panel.subline}
                </p>

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 7 }}>
                  {panel.points.map((pt, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle2 size={13} color={panel.accent} strokeWidth={2.2}/>
                      <span style={{ fontSize: 12, color: "#4a4a42", fontWeight: 480 }}>{pt}</span>
                    </li>
                  ))}
                </ul>

                <Link href={panel.href}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: panel.accent, color: "#fff",
                    fontSize: 12, fontWeight: 580, letterSpacing: "0.01em",
                    padding: "9px 18px", borderRadius: 100,
                    boxShadow: `0 3px 12px ${panel.accent}30`,
                    cursor: "pointer", textDecoration: "none",
                    transition: "all 0.2s ease",
                  }}>
                    {panel.cta}
                    <ArrowRight size={12} strokeWidth={2.2}/>
                  </span>
                </Link>
              </div>

              {/* Right: illustration */}
              <div style={{
                width: "100%", aspectRatio: "4/3",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active + "-visual"}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.28 }}
                    style={{ width: "100%", height: "100%" }}
                  >
                    {VISUALS[panel.visual]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile tab pills */}
        <div
          className="mobile-tabs"
          style={{
            display: "none",
            gap: 8, marginTop: 16,
            overflowX: "auto", paddingBottom: 4,
          }}
        >
          {PANELS.map(p => {
            const isActive = p.id === active;
            return (
              <button
                key={p.id}
                onClick={() => pick(p.id)}
                style={{
                  flexShrink: 0,
                  padding: "6px 14px", borderRadius: 100, cursor: "pointer",
                  fontSize: 11.5, fontWeight: isActive ? 600 : 440,
                  border: `1.5px solid ${isActive ? p.accent : "rgba(0,0,0,0.10)"}`,
                  background: isActive ? p.accent : "transparent",
                  color: isActive ? "#fff" : "#5a5a52",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {p.tab}
              </button>
            );
          })}
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 24 }}>
          {PANELS.map(p => (
            <button
              key={p.id}
              onClick={() => pick(p.id)}
              style={{
                width: p.id === active ? 20 : 6, height: 6,
                borderRadius: 3, border: "none", padding: 0,
                background: p.id === active ? panel.accent : "rgba(45,90,61,0.15)",
                cursor: "pointer", transition: "all 0.35s ease",
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 680px) {
          .offering-grid { grid-template-columns: 1fr !important; }
          .tab-list { display: none !important; }
          .mobile-tabs { display: flex !important; }
          .panel-inner { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}