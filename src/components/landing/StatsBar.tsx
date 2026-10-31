"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

const GREEN = "#2d5a3d";

interface StatItemProps {
  value: number;
  suffix: string;
  label: string;
  delay: number;
  icon: string;
}

function StatItem({ value, suffix, label, delay, icon }: StatItemProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const timer = setTimeout(() => {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(interval);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [isInView, value, delay]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: delay / 1000 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: "28px 20px",
        borderRadius: 20,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.15)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Icon bubble */}
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: "rgba(255,255,255,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22,
      }}>
        {icon}
      </div>

      {/* Number */}
      <div style={{
        fontSize: "clamp(28px, 4vw, 42px)",
        fontWeight: 700,
        color: "#ffffff",
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}>
        {count.toLocaleString()}
        <span style={{ fontSize: "0.65em", fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>
          {suffix}
        </span>
      </div>

      {/* Label */}
      <div style={{
        fontSize: 12.5,
        fontWeight: 500,
        color: "rgba(255,255,255,0.70)",
        textAlign: "center",
        lineHeight: 1.4,
        letterSpacing: "0.02em",
      }}>
        {label}
      </div>

      {/* Bottom accent line */}
      <div style={{
        width: 32, height: 2, borderRadius: 1,
        background: "rgba(255,255,255,0.35)",
        marginTop: 2,
      }} />
    </motion.div>
  );
}

export function StatsBar({ stats }: { stats: { openJobs: number; states: number; employers: number } | null }) {
  // Only real figures. If the database is unreachable, show nothing rather than made-up numbers.
  if (!stats || stats.openJobs === 0) return null;
  return (
    <section style={{
      background: `linear-gradient(135deg, ${GREEN} 0%, #1a3d28 60%, #0f2419 100%)`,
      padding: "64px 0 72px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decorative background circles */}
      <div style={{
        position: "absolute", top: -80, right: -80,
        width: 300, height: 300, borderRadius: "50%",
        background: "rgba(255,255,255,0.04)", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -60, left: -60,
        width: 220, height: 220, borderRadius: "50%",
        background: "rgba(255,255,255,0.04)", pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px", position: "relative" }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          style={{ textAlign: "center", marginBottom: 40 }}
        >
          <p style={{
            fontSize: 11, fontWeight: 600, letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.55)", textTransform: "uppercase",
            marginBottom: 8,
          }}>
            Live on Skilled9ja
          </p>
          <h2 style={{
            fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 700,
            color: "#ffffff", letterSpacing: "-0.02em",
          }}>
            Hiring right now
          </h2>
        </motion.div>

        {/* Stats grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
          className="stats-grid"
        >
          <StatItem value={stats.openJobs}  suffix="" label="Open jobs"            delay={0}   icon="💼" />
          <StatItem value={stats.employers} suffix="" label="Companies hiring"     delay={100} icon="🏢" />
          <StatItem value={stats.states}    suffix="" label="States with open jobs" delay={200} icon="🗺️" />
          <StatItem value={0}               suffix="" label="Naira to join"         delay={300} icon="✅" />
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}