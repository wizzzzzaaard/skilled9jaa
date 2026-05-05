"use client";

import { useState } from "react";
import { useSession } from "@/lib/hooks/useSession";
import { useFindData } from "@/lib/hooks/useFindData";
import { PageLoader } from "@/components/layout/PageLoader";
import { ProfileHats } from "@/components/profile/ProfileHats";
import { ProfileCircle } from "./ProfileCircle";
import { HorizontalSection } from "./HorizontalSection";
import { Search, MapPin, Building2, Wrench, Briefcase } from "lucide-react";
import Link from "next/link";

export function FindClient() {
  const { user, isLoading } = useSession();
  const { companies, artisans, employees, loading } = useFindData();
  const [search, setSearch] = useState("");

  if (isLoading) return <PageLoader />;
  if (!user) return <PageLoader />;

  const isArtisan = user.is_artisan;
  const isCompany = user.is_company;

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Top bar */}
      <div className="px-4 pt-4 pb-2">
        <ProfileHats />

        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-sm text-text-secondary">
              Hello, {user.full_name?.split(" ")[0] || "there"} 👋
            </p>
            <h1 className="text-xl font-semibold text-text-primary leading-tight">
              Find trusted professionals
            </h1>
            <p className="text-sm text-text-secondary">Near you, right now.</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-text-secondary bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5">
            <MapPin className="w-3 h-3 text-primary" />
            <span>{user.city || user.state || "Nigeria"}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search for services or professionals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-gray-400 outline-none"
          />
        </div>
      </div>

      {/* Companies */}
      <HorizontalSection
        title="Companies"
        icon={Building2}
        items={companies}
        seeAllHref="/find?type=company"
        loading={loading}
        renderItem={(item) => (
          <ProfileCircle
            key={item.id}
            profile={item}
            sub={item.city || item.state || "Nigeria"}
            fallbackLetter={(item.company_name || item.full_name || "C").charAt(0).toUpperCase()}
          />
        )}
      />

      {/* Artisans */}
      {!isCompany && (
        <HorizontalSection
          title="Artisans"
          icon={Wrench}
          items={artisans}
          seeAllHref="/find?type=artisan"
          loading={loading}
          renderItem={(item) => (
            <ProfileCircle
              key={item.id}
              profile={item}
              sub={item.skills?.[0] || "Artisan"}
              fallbackLetter={(item.full_name || "A").charAt(0).toUpperCase()}
            />
          )}
        />
      )}

      {/* Employees */}
      <HorizontalSection
        title="Employees"
        icon={Briefcase}
        items={employees}
        seeAllHref="/find?type=employee"
        loading={loading}
        renderItem={(item) => (
          <ProfileCircle
            key={item.id}
            profile={item}
            sub={item.job_roles?.[0] || "Employee"}
            fallbackLetter={(item.full_name || "E").charAt(0).toUpperCase()}
          />
        )}
      />

      {/* Artisan CTA */}
      {isArtisan && (
        <div className="px-4 mt-2">
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4">
            <p className="text-sm font-semibold text-primary mb-1">
              Companies near you are hiring
            </p>
            <p className="text-xs text-text-secondary mb-3">
              {companies.length} companies in your area have active job listings.
            </p>
            <Link
              href="/find?type=company"
              className="text-xs font-semibold text-primary underline"
            >
              View all companies →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}