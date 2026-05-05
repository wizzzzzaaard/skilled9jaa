"use client";

import { Button } from "@/components/ui/Button";
import { RoleCard } from "../RoleCard";

interface Props {
  isHomeServiceMode: boolean;
  hsRole: "provider" | "client";
  setHsRole: (v: "provider" | "client") => void;
  isClient: boolean;
  setIsClient: (v: boolean) => void;
  isArtisan: boolean;
  setIsArtisan: (v: boolean) => void;
  isCompany: boolean;
  setIsCompany: (v: boolean) => void;
  isLoading: boolean;
  handleRoleSubmit: () => void;
  setStep: (s: any) => void;
}

export function RoleStep({
  isHomeServiceMode,
  hsRole,
  setHsRole,
  isClient,
  setIsClient,
  isArtisan,
  setIsArtisan,
  isCompany,
  setIsCompany,
  isLoading,
  handleRoleSubmit,
  setStep,
}: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text-primary mb-1">
        Choose your profile
      </h2>
      <p className="text-sm text-text-secondary mb-4">
        {isHomeServiceMode
          ? "What brings you to Home Service?"
          : "What are you here to do? You can have multiple profiles."}
      </p>

      <div className="grid gap-3">
        {isHomeServiceMode ? (
          <>
            <RoleCard
              selected={hsRole === "provider"}
              onClick={() => setHsRole("provider")}
              title="Offer Home Service"
              badge="₦1,000/mo"
              badgeVariant="muted"
              description="I'm a professional who visits clients at home or events. NIN required."
            />
            <RoleCard
              selected={hsRole === "client"}
              onClick={() => setHsRole("client")}
              title="Get Home Service"
              badge="FREE"
              badgeVariant="green"
              description="I want to book verified professionals to come to me."
            />
          </>
        ) : (
          <>
            <RoleCard
              selected={isArtisan}
              onClick={() => {
                setIsArtisan(true);
                setIsClient(false);
                setIsCompany(false);
              }}
              title="Offer Services"
              badge="₦3,200"
              badgeVariant="muted"
              description="I'm an artisan or job seeker — offer skills and find work."
            />
            <RoleCard
              selected={isClient && !isArtisan && !isCompany}
              onClick={() => {
                setIsClient(true);
                setIsArtisan(false);
                setIsCompany(false);
              }}
              title="Hire or Find Artisans"
              badge="FREE"
              badgeVariant="green"
              description="I want to find and hire verified professionals near me."
            />
            <RoleCard
              selected={isCompany}
              onClick={() => {
                setIsCompany(true);
                setIsClient(true);
                setIsArtisan(false);
              }}
              title="Hire as a Company"
              badge="First job free"
              badgeVariant="green"
              description="I represent a business — post jobs and hire talent."
            />
          </>
        )}
      </div>

      <p className="text-xs text-center text-text-secondary pt-1">
        {isHomeServiceMode ? (
          <>
            Looking for the main app?{" "}
            <a href="/signup" className="text-primary font-semibold">
              Sign up here →
            </a>
          </>
        ) : (
          <>
            Need home service?{" "}
            <a
              href="/signup?mode=homeservice"
              className="text-primary font-semibold"
            >
              Sign up here →
            </a>
          </>
        )}
      </p>

      <div className="flex gap-3 pt-1">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setStep("basic")}
        >
          Back
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          isLoading={isLoading}
          onClick={handleRoleSubmit}
        >
          Create Account →
        </Button>
      </div>
    </div>
  );
}