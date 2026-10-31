"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCircle2, BadgeCheck, Bell, Briefcase,
  Building2, FileText, Search, CheckCircle2,
} from "lucide-react";
import Link from "next/link";

// ─── Data ─────────────────────────────────────────────────────────────────────

const JOB_SEEKER_STEPS = [
  {
    icon: UserCircle2,
    number: 1,
    title: "Create Your Profile",
    description: "Sign up and build a professional profile showcasing your skills, experience, and portfolio. Add photos of your work to stand out.",
    tip: "Complete profiles get 3x more views!",
  },
  {
    icon: BadgeCheck,
    number: 2,
    title: "Get Verified",
    description: "Submit your credentials and get verified. Verified professionals appear higher in search results and build more trust with employers.",
    tip: "Verification takes 24–48 hours",
  },
  {
    icon: Bell,
    number: 3,
    title: "Receive Job Alerts",
    description: "See new jobs that match your skills and location, sorted with the closest employers first.",
    tip: "Customize alerts by location and skill",
  },
  {
    icon: Briefcase,
    number: 4,
    title: "Apply & Get Hired",
    description: "Apply from your phone with your profile. Track each application and see when an employer accepts you.",
    tip: "Quick responders get hired faster",
  },
];

const EMPLOYER_STEPS = [
  {
    icon: Building2,
    number: 1,
    title: "Register Your Company",
    description: "Create a free company account in minutes. Add your company details, logo, and what makes your organization great.",
    tip: "Registration is 100% free",
  },
  {
    icon: FileText,
    number: 2,
    title: "Post Your First Job",
    description: "Post your first job free. Set the salary range, location, perks and what applicants must send.",
    tip: "1 free job post on signup",
  },
  {
    icon: Search,
    number: 3,
    title: "Review Applications",
    description: "Review applications in one inbox, with each applicant's profile, CV and photo.",
    tip: "500–1000 guaranteed applications",
  },
  {
    icon: CheckCircle2,
    number: 4,
    title: "Hire Top Talent",
    description: "Review, accept and contact the people you want, all from your company dashboard.",
    tip: "Average hiring time: 5–7 days",
  },
];

const GREEN       = "#2d5a3d";
const GREEN_LIGHT = "rgba(45,90,61,0.08)";

// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({
  step,
  index,
}: {
  step: (typeof JOB_SEEKER_STEPS)[number];
  index: number;
}) {
  const Icon = step.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      style={{
        background: "#fff",
        border: "1px solid rgba(45,90,61,0.10)",
        borderRadius: 18,
        padding: "22px 20px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        boxShadow: "0 2px 12px rgba(45,90,61,0.05)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle top-left accent */}
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: 60, height: 60,
        background: "radial-gradient(circle at 0% 0%, rgba(45,90,61,0.07), transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Icon + number row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: GREEN_LIGHT,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={18} color={GREEN} strokeWidth={1.6} />
        </div>
        <div style={{
          width: 24, height: 24, borderRadius: "50%",
          background: GREEN,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
            {step.number}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: 14, fontWeight: 650, color: "#1a1a18",
        marginBottom: 6, lineHeight: 1.3,
      }}>
        {step.title}
      </h3>

      {/* Description */}
      <p style={{
        fontSize: 12.5, color: "#7a7a72", lineHeight: 1.55,
        marginBottom: 14, flex: 1,
      }}>
        {step.description}
      </p>

      {/* Tip */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: "rgba(255,200,30,0.10)",
        border: "1px solid rgba(255,200,30,0.22)",
        borderRadius: 100, padding: "4px 10px",
        alignSelf: "flex-start",
      }}>
        <span style={{ fontSize: 10 }}>💡</span>
        <span style={{ fontSize: 11, color: "#7a6020", fontWeight: 500 }}>
          {step.tip}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Tab pill ─────────────────────────────────────────────────────────────────

function TabPill({
  label, icon: Icon, active, onClick,
}: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "7px 16px", borderRadius: 100, cursor: "pointer",
        fontSize: 12.5, fontWeight: active ? 600 : 450,
        border: active ? `1.5px solid ${GREEN}` : "1.5px solid rgba(45,90,61,0.15)",
        background: active ? GREEN : "rgba(255,255,255,0.7)",
        color: active ? "#fff" : "#5a5a52",
        transition: "all 0.22s ease",
        backdropFilter: "blur(8px)",
      }}
    >
      <Icon size={13} strokeWidth={1.8} />
      {label}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HowItWorks() {
  const [tab, setTab] = useState<"seeker" | "employer">("seeker");

  const isSeeker = tab === "seeker";
  const steps    = isSeeker ? JOB_SEEKER_STEPS : EMPLOYER_STEPS;
  const headline = isSeeker ? "Find Your Next Opportunity" : "Hire Qualified Talent Fast";
  const subline  = isSeeker
    ? "From electricians to graphic designers, thousands of professionals use Skilled9ja to connect with employers across Nigeria."
    : "Access thousands of verified professionals across Nigeria. Post jobs and get hundreds of qualified applications within days.";
  const ctaLabel = isSeeker ? "Start Finding Jobs Now" : "Post Your First Job Free";
  const ctaHref  = isSeeker ? "/jobs-near-me" : "/hire";

  return (
    <section style={{ background: "#f9fbf9", padding: "72px 0 80px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>

        {/* ── Section header ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          style={{ textAlign: "center", marginBottom: 36 }}
        >
          <h2 style={{
            fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700,
            color: GREEN, letterSpacing: "-0.02em", marginBottom: 10,
          }}>
            How Skilled9ja Works
          </h2>
          <p style={{
            fontSize: 13.5, color: "#7a7a72", lineHeight: 1.6,
            maxWidth: 480, margin: "0 auto",
          }}>
            Connecting Nigerian professionals with opportunities has never been easier.
            Whether you're looking for work or hiring talent, we've simplified the entire process.
          </p>
        </motion.div>

        {/* ── Tab switcher ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            display: "flex", justifyContent: "center", gap: 8, marginBottom: 32,
          }}
        >
          <TabPill
            label="For Job Seekers" icon={Briefcase}
            active={isSeeker} onClick={() => setTab("seeker")}
          />
          <TabPill
            label="For Employers" icon={Building2}
            active={!isSeeker} onClick={() => setTab("employer")}
          />
        </motion.div>

        {/* ── Panel ────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.32 }}
          >
            {/* Sub-headline */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <h3 style={{
                fontSize: "clamp(17px, 3vw, 22px)", fontWeight: 650,
                color: "#1a1a18", letterSpacing: "-0.01em", marginBottom: 8,
              }}>
                {headline}
              </h3>
              <p style={{
                fontSize: 13, color: "#8a8a82", lineHeight: 1.6,
                maxWidth: 460, margin: "0 auto",
              }}>
                {subline}
              </p>
            </div>

            {/* Step cards grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              marginBottom: 32,
            }}>
              {steps.map((step, i) => (
                <StepCard key={step.title} step={step} index={i} />
              ))}
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
              style={{ display: "flex", justifyContent: "center" }}
            >
              <Link href={ctaHref}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: GREEN, color: "#fff",
                  fontSize: 13, fontWeight: 550, letterSpacing: "0.01em",
                  padding: "11px 26px", borderRadius: 100,
                  boxShadow: "0 3px 14px rgba(45,90,61,0.22)",
                  cursor: "pointer", textDecoration: "none",
                  transition: "all 0.2s ease",
                }}>
                  {ctaLabel}
                </span>
              </Link>
            </motion.div>
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
}