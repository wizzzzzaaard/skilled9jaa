"use client";
import { useState } from "react";
import { ArtisanHeader } from "./ArtisanHeader";
import { SetupTab } from "./SetupTab";
import { PostsTab } from "./PostsTab";
import { VerifyTab } from "./VerifyTab";

type Tab = "setup" | "posts" | "verify";

export function ArtisanProfile() {
  const [tab, setTab] = useState<Tab>("setup");

  const tabs: { key: Tab; label: string }[] = [
    { key: "setup", label: "✏️ Setup" },
    { key: "posts", label: "+ Posts" },
    { key: "verify", label: "🛡️ Verify" },
  ];

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <ArtisanHeader />

        {/* Tab Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.key
                  ? "bg-primary text-white"
                  : "bg-white border border-gray-200 text-text-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          {tab === "setup" && <SetupTab />}
          {tab === "posts" && <PostsTab />}
          {tab === "verify" && <VerifyTab />}
        </div>
      </div>
    </div>
  );
}