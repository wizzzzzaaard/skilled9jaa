"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageLoader } from "@/components/layout/PageLoader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MapPin, Share2, Calendar, Star } from "lucide-react";

interface ProviderProfile {
  id: string;
  full_name: string;
  slug: string;
  profile_image_url: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  is_available_now: boolean;
  is_mock: boolean;
  years_of_experience: number | null;
  verification_status: string | null;
}

export default function ProviderClient() {
  const params = useParams();
  const slug = params.slug as string;
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProvider() {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("slug", slug)
        .single();
      if (data) setProvider(data as ProviderProfile);
      setLoading(false);
    }
    fetchProvider();
  }, [slug]);

  if (loading) return <PageLoader />;

  if (!provider) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-text-secondary">Provider not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-start gap-4">
            <Avatar
              src={provider.profile_image_url}
              name={provider.full_name}
              size="lg"
              isOnline={provider.is_available_now}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-semibold text-text-primary">
                  {provider.is_mock
                    ? `${provider.full_name.charAt(0)}. (Demo)`
                    : provider.full_name}
                </h1>
                {provider.verification_status === "verified" && (
                  <Badge variant="success">Verified</Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-text-secondary mb-2">
                <MapPin className="w-4 h-4" />
                {provider.city}, {provider.state}
              </div>
              {provider.is_mock && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    👋 This is a demo profile to show you how Skilled9ja works.
                    Real professionals near you are joining every day. Help us
                    grow!
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="primary" size="sm">
                  <Calendar className="w-4 h-4 mr-1" />
                  Book Now
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {provider.bio && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-text-primary mb-3">
              About
            </h2>
            <p className="text-sm text-text-secondary">{provider.bio}</p>
          </div>
        )}

        {/* Services */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Services
          </h2>
          <div className="text-center py-8 text-text-secondary">
            <Star className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>Service menu coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
