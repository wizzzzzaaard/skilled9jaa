"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useSessionStore } from "@/store/sessionStore";
import { Skeleton } from "@/components/ui/Skeleton";
import { Briefcase } from "lucide-react";

type Application = {
  id: string;
  status: string;
  created_at: string;
  jobs: {
    title: string;
    company_name: string | null;
  } | null;
};

const statusStyles: Record<string, string> = {
  pending:  "bg-yellow-50 text-yellow-700",
  reviewed: "bg-blue-50 text-blue-700",
  accepted: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-500",
};

export function ApplicationsTab() {
  const { user } = useSessionStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchApplications() {
      const { data } = await supabase
        .from("job_applications")
        .select("id, status, created_at, jobs(title, company_name)")
        .eq("applicant_id", user!.id)
        .order("created_at", { ascending: false });
      setApplications((data as Application[]) || []);
      setIsLoading(false);
    }
    fetchApplications();
  }, [user]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-10">
        <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-text-secondary">No applications yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app) => (
        <div
          key={app.id}
          className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">
              {app.jobs?.title || "Untitled Job"}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              {app.jobs?.company_name || "Independent"} ·{" "}
              {new Date(app.created_at).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize shrink-0 ml-3 ${
              statusStyles[app.status] || "bg-gray-100 text-gray-500"
            }`}
          >
            {app.status}
          </span>
        </div>
      ))}
    </div>
  );
}