"use client";
import { useEffect, useState } from "react";
import { ArtisanHeader } from "./ArtisanHeader";
import { SetupTab } from "./SetupTab";
import { PostsTab } from "./PostsTab";
import { VerifyTab } from "./VerifyTab";
import { ApplicationsTab } from "./ApplicationsTab";

type Tab = "setup" | "posts" | "verify" | "applications";

export function ArtisanProfile() {
  const [tab, setTab] = useState<Tab>("setup");
  // Deep links such as /profile?tab=posts open the right tab (used by the welcome checklist).
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("tab");
    if (wanted && ["setup", "posts", "verify", "applications", "jobs"].includes(wanted)) setTab(wanted as Tab);
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "setup", label: "Setup" },
    { key: "posts", label: "Posts" },
    { key: "verify", label: "Verify" },
    { key: "applications", label: "Applications" },
  ];

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <ArtisanHeader />

        {/* Tab Bar */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-gray-100 mb-5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
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
          {tab === "applications" && <ApplicationsTab />}
        </div>
      </div>
    </div>
  );
}