"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUIStore } from "@/store/uiStore";
import type { Step, BankDetails, Skill } from "@/types/signup";

export function useSignup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useUIStore();

  const modeParam = searchParams.get("mode");
  const roleParam = searchParams.get("role");
  const resumeParam = searchParams.get("resume");
  const stepParam = searchParams.get("step");
  const isHomeServiceMode = modeParam === "homeservice";

  const [step, setStep] = useState<Step>("basic");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Basic
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Roles
  const [isClient, setIsClient] = useState(!isHomeServiceMode);
  const [isArtisan, setIsArtisan] = useState(false);
  const [isCompany, setIsCompany] = useState(false);
  const [hsRole, setHsRole] = useState<"provider" | "client">(
    roleParam === "provider" ? "provider" : roleParam === "client" ? "client" : "provider"
  );

  // Derived
  const isHomeService = isHomeServiceMode && hsRole === "provider";
  const isPaidRole = isHomeServiceMode ? hsRole === "provider" : isArtisan;

  // Setup
  const [bio, setBio] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [lga, setLga] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [locating, setLocating] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "manual">("paystack");
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);

  const [displayPrice, setDisplayPrice] = useState(3200);
  const [slashPrice, setSlashPrice] = useState(5950);

  // Company
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companyLocation, setCompanyLocation] = useState("");

  // Skills
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillFilter, setSkillFilter] = useState<"ALL" | "SKILL" | "JOB">("ALL");

  // Home Service
  const [hsCategories, setHsCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedHsCategoryIds, setSelectedHsCategoryIds] = useState<string[]>([]);
  const [hsPlan, setHsPlan] = useState<"growth" | "business" | "unlimited">("growth");
  const [hsCategoriesLoading, setHsCategoriesLoading] = useState(false);

  // Steps array
  const steps: { key: Step; label: string }[] = [
    { key: "basic", label: "Basic Info" },
    { key: "role", label: "Profile" },
    { key: "setup", label: "Setup" },
    ...(isArtisan ? [{ key: "skills" as Step, label: "Skills" }] : []),
    ...(isHomeService
      ? [
          { key: "hs_services" as Step, label: "Services" },
          { key: "hs_plan" as Step, label: "Plan" },
        ]
      : []),
    ...(isPaidRole ? [{ key: "payment" as Step, label: "Payment" }] : []),
    { key: "success", label: "Done" },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  // ── Resume from URL ────────────────────────────────────────────
  useEffect(() => {
    if (!resumeParam) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      setEmail(data.user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_artisan, is_company, is_home_service_provider, is_client, signup_step")
        .eq("id", data.user.id)
        .single();

      if (profile) {
        setIsArtisan(profile.is_artisan ?? false);
        setIsCompany(profile.is_company ?? false);
        setIsClient(profile.is_client ?? true);
        if (profile.is_home_service_provider) setHsRole("provider");
      }

      const stepNum = parseInt(stepParam || "0");
      if (stepParam === "payment" || stepNum === 5) {
        setStep("payment");
        const { data: pd } = await supabase
          .from("payment_details")
          .select("bank_name, account_number, account_name")
          .eq("is_active", true)
          .single();
        if (pd) setBankDetails(pd as BankDetails);
      } else if (stepNum === 4) {
        setStep(
          profile?.is_artisan
            ? "skills"
            : profile?.is_home_service_provider
            ? "hs_services"
            : "payment"
        );
      } else if (stepNum === 3) {
        setStep("setup");
      } else if (stepNum === 2) {
        setStep("role");
      } else {
        setStep("basic");
      }
    });
  }, [resumeParam, stepParam]);

  // ── Fetch skills ───────────────────────────────────────────────
  useEffect(() => {
    if (step !== "skills") return;
    setSkillsLoading(true);
    const supabase = createClient();
    supabase
      .from("skills")
      .select("id, name, type")
      .order("name")
      .then(({ data }) => {
        if (data) setAvailableSkills(data as Skill[]);
        setSkillsLoading(false);
      });
  }, [step]);

  // ── Fetch home service categories ─────────────────────────────
  useEffect(() => {
    if (step !== "hs_services") return;
    setHsCategoriesLoading(true);
    const supabase = createClient();
    supabase
      .from("home_service_categories")
      .select("id, name")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (data) setHsCategories(data);
        setHsCategoriesLoading(false);
      });
  }, [step]);

  // ── Fetch display prices ───────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("platform_settings")
      .select("skilled9ja_display_price, skilled9ja_slash_price")
      .single()
      .then(({ data }) => {
        if (data) {
          setDisplayPrice(data.skilled9ja_display_price);
          setSlashPrice(data.skilled9ja_slash_price);
        }
      });
  }, []);

  // ── Handlers ───────────────────────────────────────────────────
  async function handleBasicSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep("role");
  }

  async function handleRoleSubmit() {
    if (!isHomeServiceMode) {
      if (!isClient && !isArtisan && !isCompany) {
        addToast("Please select at least one profile type", "error");
        return;
      }
    }

    setIsLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone_number: phone,
          is_client: isHomeServiceMode ? hsRole === "client" : isClient,
          is_artisan: isHomeServiceMode ? false : isArtisan,
          is_home_service_provider: isHomeService,
          is_company: isHomeServiceMode ? false : isCompany,
        },
      },
    });

    if (error) {
      addToast(error.message, "error");
      setIsLoading(false);
      return;
    }

    const uid = data.user?.id;
    if (uid) {
      setUserId(uid);
      const activeMode = isHomeService
        ? "home_service_provider"
        : isArtisan
        ? "artisan"
        : isCompany
        ? "company"
        : "client";

      await supabase
        .from("profiles")
        .update({ signup_step: 3, account_status: "incomplete", active_mode: activeMode })
        .eq("id", uid);
    }

    setIsLoading(false);
    setStep("setup");
  }

  function handleUseMyLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        addToast("Could not get location. Enter manually.", "error");
        setLocating(false);
      }
    );
  }

  async function handleSetupSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setIsLoading(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({
        bio,
        state,
        city,
        lga: lga || null,
        latitude,
        longitude,
        profile_image_url: profileImageUrl || null,
        signup_step: 4,
        ...(isCompany && {
          company_name: companyName,
          industry: industry,
          city: companyLocation || city,
        }),
      })
      .eq("id", userId);
    setIsLoading(false);

    if (isArtisan) {
      setStep("skills");
    } else if (isHomeService) {
      setStep("hs_services");
    } else if (isPaidRole) {
      const { data: pd } = await supabase
        .from("payment_details")
        .select("bank_name, account_number, account_name")
        .eq("is_active", true)
        .single();
      if (pd) setBankDetails(pd as BankDetails);
      setStep("payment");
    } else {
      await supabase
        .from("profiles")
        .update({
          account_status: "active",
          signup_step: 6,
          active_mode: isCompany ? "company" : "client",
        })
        .eq("id", userId);
      router.push("/dashboard");
    }
  }

  function toggleSkill(id: number) {
    setSelectedSkillIds((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= 3) {
        addToast("Maximum 3 skills allowed", "error");
        return prev;
      }
      return [...prev, id];
    });
  }

  async function handleSkillsSubmit() {
    if (!userId) return;
    if (selectedSkillIds.length === 0) {
      addToast("Please select at least one skill", "error");
      return;
    }
    setIsLoading(true);
    const supabase = createClient();

    await supabase.from("user_skills").insert(
      selectedSkillIds.map((skill_id) => ({ user_id: userId, skill_id }))
    );

    await supabase
      .from("profiles")
      .update({ signup_step: 5, account_status: "pending_payment" })
      .eq("id", userId);

    const { data: pd } = await supabase
      .from("payment_details")
      .select("bank_name, account_number, account_name")
      .eq("is_active", true)
      .single();
    if (pd) setBankDetails(pd as BankDetails);

    setIsLoading(false);
    setStep("payment");
  }

  async function handleManualSubmit() {
    if (!userId) return;
    setIsLoading(true);
    const supabase = createClient();

    await supabase
      .from("profiles")
      .update({ signup_step: 5, account_status: "pending_manual" })
      .eq("id", userId);

    await supabase.from("user_payments").insert({
      user_id: userId,
      amount: isHomeService
        ? calculateHomeServiceAmount()
        : isArtisan
        ? 3200
        : 1000,
      status: "pending",
    });

    setIsLoading(false);
    setStep("pending");
  }

  async function handlePaystackPay() {
    if (!userId || !email) return;

    const supabase = createClient();

    const { data: settings } = await supabase
      .from("platform_settings")
      .select("paystack_public_key")
      .single();
    const paystackKey = settings?.paystack_public_key;
    if (!paystackKey) {
      addToast("Payment unavailable. Contact support.", "error");
      return;
    }

    const amount = isHomeService ? calculateHomeServiceAmount() * 100 : 320000;

    const orderType = isHomeService
      ? hsPlan === "business"
        ? "home_business"
        : hsPlan === "unlimited"
        ? "home_unlimited"
        : "home_growth"
      : isArtisan
      ? "artisan_subscription"
      : isCompany
      ? "company_subscription"
      : "artisan_subscription";

    // Insert order first — its UUID becomes the Paystack reference
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        amount: amount / 100,
        status: "pending",
        order_type: orderType,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      addToast("Could not initiate payment. Try again.", "error");
      return;
    }

    const reference = order.id;

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () => {
      // @ts-ignore
      const handler = window.PaystackPop.setup({
        key: paystackKey,
        email,
        amount,
        ref: reference,
        currency: "NGN",
        callback: () => {
          // Edge function handles all DB updates — just advance the step
          const supabase = createClient();
          supabase
            .from("profiles")
            .update({ signup_step: 6 })
            .eq("id", userId)
            .then(() => setStep("success"));
        },
        onClose: () => {
          addToast("Payment cancelled", "error");
        },
      });
      handler.openIframe();
    };
    document.body.appendChild(script);
  }

  async function handleHsServicesSubmit() {
    if (selectedHsCategoryIds.length === 0) {
      addToast("Please select at least one service", "error");
      return;
    }
    setStep("hs_plan");
  }

  async function handleHsPlanSubmit() {
    const supabase = createClient();
    const { data: pd } = await supabase
      .from("payment_details")
      .select("bank_name, account_number, account_name")
      .eq("is_active", true)
      .single();
    if (pd) setBankDetails(pd as BankDetails);
    if (userId) {
      await supabase
        .from("profiles")
        .update({ signup_step: 5, account_status: "pending_payment" })
        .eq("id", userId);
    }
    setStep("payment");
  }

  function calculateHomeServiceAmount() {
    const base = selectedHsCategoryIds.length * 1000;
    if (hsPlan === "business") return base + 5000;
    if (hsPlan === "unlimited") return base + 10000;
    return base;
  }

  return {
    // Meta
    isHomeServiceMode,
    isHomeService,
    isPaidRole,
    // Roles
    isClient,
    isArtisan,
    isCompany,
    hsRole,
    // Steps
    step,
    setStep,
    steps,
    stepIndex,
    // Basic
    fullName,
    setFullName,
    email,
    setEmail,
    phone,
    setPhone,
    password,
    setPassword,
    // Role setters
    setIsClient,
    setIsArtisan,
    setIsCompany,
    setHsRole,
    // Setup
    bio,
    setBio,
    state,
    setState,
    city,
    setCity,
    latitude,
    setLatitude,
    longitude,
    setLongitude,
    locating,
    lga,
    setLga,
    onProfileImageUploaded: setProfileImageUrl,
    // Company
    companyName,
    setCompanyName,
    industry,
    setIndustry,
    companyLocation,
    setCompanyLocation,
    // Skills
    availableSkills,
    selectedSkillIds,
    skillsLoading,
    skillFilter,
    setSkillFilter,
    // Home Service
    hsCategories,
    selectedHsCategoryIds,
    setSelectedHsCategoryIds,
    hsPlan,
    setHsPlan,
    hsCategoriesLoading,
    // Payment
    paymentMethod,
    setPaymentMethod,
    bankDetails,
    userId,
    displayPrice,
    slashPrice,
    // Loading
    isLoading,
    // Handlers
    handleBasicSubmit,
    handleRoleSubmit,
    handleUseMyLocation,
    handleSetupSubmit,
    toggleSkill,
    handleSkillsSubmit,
    handleManualSubmit,
    handlePaystackPay,
    handleHsServicesSubmit,
    handleHsPlanSubmit,
    calculateHomeServiceAmount,
    // Router
    router,
  };
}
