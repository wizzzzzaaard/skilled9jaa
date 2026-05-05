"use client";

import { useParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Briefcase, MapPin, Globe } from "lucide-react";

export default function CompanyClient() {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-start gap-4">
            <Avatar src={null} name="Company" size="lg" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-semibold text-text-primary capitalize">
                  {slug.replace(/-/g, " ")}
                </h1>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-text-secondary mb-4">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Lagos, Nigeria
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  Website
                </span>
              </div>
              <Button variant="primary" size="sm">
                <Briefcase className="w-4 h-4 mr-1" />
                View Jobs
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Active Job Listings
          </h2>
          <div className="text-center py-8 text-text-secondary">
            <Briefcase className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No active listings</p>
          </div>
        </div>
      </div>
    </div>
  );
}
