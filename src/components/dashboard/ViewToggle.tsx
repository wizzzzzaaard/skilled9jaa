"use client";

import { LayoutGrid, Box } from "lucide-react";

interface ViewToggleProps {
  view: "2d" | "3d";
  onChange: (v: "2d" | "3d") => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex justify-end px-4 py-2">
      <div
        style={{
          display: "flex",
          gap: 3,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 10,
          padding: 3,
        }}
      >
        {(["2d", "3d"] as const).map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            style={{
              padding: "5px 13px",
              borderRadius: 7,
              border: "none",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: view === v ? "#1B4332" : "transparent",
              color: view === v ? "#fff" : "#9CA3AF",
              letterSpacing: "0.5px",
            }}
          >
            {v === "2d" ? <LayoutGrid size={10} /> : <Box size={10} />}
            {v.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}