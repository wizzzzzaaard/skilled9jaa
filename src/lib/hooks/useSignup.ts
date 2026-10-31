"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUIStore } from "@/store/uiStore";
import { useSessionStore } from "@/store/sessionStore";
import { getCampaign } from "@/lib/campaigns";
import { FREE_SIGNUP, PAYMENT_CONFIRM_TIMEOUT_MS } from "@/lib/config";
import type { Step, BankDetails, Skill } from "@/types/signup";

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function useSignup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useUIStore();

  const modeParam = searchParams.get("mode");
  const roleParam = searchParams.get("role");
  const resumeParam = searchParams.get("resume");
  const stepParam = searchParams.get("step");
  const campaign = getCampaign(searchParams.get("niche") ?? "");
  const isHomeServiceMode = modeParam === "homeservice";

  const [step, setStep] = useState<Step>("intro");
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
  const isPaidRole = !FREE_SIGNUP && (isHomeServiceMode ? hsRole === "provider" : isArtisan);

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
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  // Company
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companyLocation, setCompanyLocation] = useState("");

  // Skills
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillFilter, setSkillFilter] = useState<"ALL" | "SKILL" | "JOB">("ALL");
  const skillsPrefilled = useRef(false);

  // Home Service
  const [hsCategories, setHsCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedHsCategoryIds, setSelectedHsCategoryIds] = useState<string[]>([]);
  const [hsPlan, setHsPlan] = useState<"growth" | "business" | "unlimited">("growth");
  const [hsCategoriesLoading, setHsCategoriesLoading] = useState(false);
  const hsPrefilled = useRef(false);

  const steps: { key: Step; label: string }[] = [
    { key: "intro", label: "Intro" },
    { key: "basic", label: "Basic Info" },
    { key: "role", label: "Profile" },
    { key: "setup", label: "Setup" },
    ...(isArtisan ? [{ key: "skills" as Step, label: "Skills" }] : []),
    ...(isHomeService
      ? [
          { key: "hs_services" as Step, label: "Services" },
          ...(FREE_SIGNUP ? [] : [{ key: "hs_plan" as Step, label: "Plan" }]),
        ]
      : []),
    ...(isPaidRole ? [{ key: "payment" as Step, label: "Payment" }] : []),
    { key: "success", label: "Done" },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  async function loadBankDetails() {
    const supabase = createClient();
    const { data: pd } = await supabase
      .from("payment_details")
      .select("bank_name, account_number, account_name")
      .eq("is_active", true)
      .maybeSingle();
    if (pd) setBankDetails(pd as BankDetails);
  }

  // ── Resume from URL ────────────────────────────────────────────
  useEffect(() => {
    if (!resumeParam) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        // Link opened on a device that isn't signed in.
        addToast("Log in to continue your signup.", "error");
        router.push("/login");
        return;
      }
      setUserId(data.user.id);
      setEmail(data.user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_artisan, is_company, is_home_service_provider, is_client, signup_step, account_status")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.account_status === "active") {
        router.push("/dashboard");
        return;
      }

      if (profile) {
        setIsArtisan(profile.is_artisan ?? false);
        setIsCompany(profile.is_company ?? false);
        setIsClient(profile.is_client ?? true);
        if (profile.is_home_service_provider) setHsRole("provider");
      }

      const stepNum = parseInt(stepParam || "0");
      if (stepParam === "payment" || stepNum === 5) {
        if (FREE_SIGNUP) {
          // Old pay-first accounts land here; with free signup they go straight in.
          await completeSignup(data.user.id);
          return;
        }
        setStep("payment");
        await loadBankDetails();
      } else if (stepNum === 4) {
        setStep(profile?.is_artisan ? "skills" : profile?.is_home_service_provider ? "hs_services" : "setup");
      } else if (stepNum === 3) {
        setStep("setup");
      } else if (stepNum === 2) {
        setStep("role");
      } else {
        setStep("basic");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      .then(({ data, error }) => {
        if (error) addToast("Couldn't load skills. Check your connection and reopen this step.", "error");
        if (data) setAvailableSkills(data as Skill[]);
        setSkillsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Pre-select the skills of the landing page the user came from (max 3).
  useEffect(() => {
    if (skillsPrefilled.current || !campaign?.preselect.length || !availableSkills.length) return;
    skillsPrefilled.current = true;
    const ids = campaign.preselect
      .map((name) => availableSkills.find((sk) => sameName(sk.name, name))?.id)
      .filter((id): id is number => typeof id === "number")
      .slice(0, 3);
    if (ids.length) setSelectedSkillIds((prev) => (prev.length ? prev : ids));
  }, [availableSkills, campaign]);

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
      .then(({ data, error }) => {
        if (error) addToast("Couldn't load services. Check your connection and reopen this step.", "error");
        if (data) setHsCategories(data);
        setHsCategoriesLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (hsPrefilled.current || !campaign?.preselect.length || !hsCategories.length) return;
    hsPrefilled.current = true;
    const ids = campaign.preselect
      .map((name) => hsCategories.find((c) => sameName(c.name, name))?.id)
      .filter((id): id is string => !!id);
    if (ids.length) setSelectedHsCategoryIds((prev) => (prev.length ? prev : ids));
  }, [hsCategories, campaign]);

  // ── Fetch display prices ───────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("platform_settings")
      .select("skilled9ja_display_price, skilled9ja_slash_price")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDisplayPrice(data.skilled9ja_display_price);
          setSlashPrice(data.skilled9ja_slash_price);
        }
      });
  }, []);

  // ── Finish signup ──────────────────────────────────────────────
  /**
   * Activates the account. Prefers the server function `complete_signup`
   * (added by the security migration, which stops browsers from setting
   * account_status themselves). Falls back to the old direct update while
   * that function doesn't exist yet.
   */
  async function completeSignup(uid: string) {
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("complete_signup");
    if (rpcError) {
      const missing = rpcError.code === "PGRST202" || rpcError.code === "42883";
      if (!missing) {
        addToast("Couldn't finish your signup. Try again.", "error");
        return false;
      }
      // active_mode was already set when the account was created.
      const { error } = await supabase
        .from("profiles")
        .update({ account_status: "active", signup_step: 6 })
        .eq("id", uid);
      if (error) {
        addToast("Couldn't finish your signup. Try again.", "error");
        return false;
      }
    }
    await useSessionStore.getState().refreshUser();
    router.push("/dashboard?welcome=1");
    router.refresh();
    return true;
  }

  // ── Handlers ───────────────────────────────────────────────────
  async function handleBasicSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep("role");
  }

  async function handleRoleSubmit() {
    if (!isHomeServiceMode && !isClient && !isArtisan && !isCompany) {
      addToast("Please select at least one profile type", "error");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/signup?resume=true&step=3${isHomeServiceMode ? "&mode=homeservice" : ""}`,
        data: {
          full_name: fullName.trim(),
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
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      addToast("This email already has an account. Log in instead.", "error");
      setIsLoading(false);
      return;
    }
    if (!data.session) {
      addToast("Check your email and tap the link to continue your signup.", "success");
      setIsLoading(false);
      return;
    }

    const uid = data.user?.id;
    if (uid) {
      setUserId(uid);
      const activeMode = isHomeService ? "home_service_provider" : isArtisan ? "artisan" : isCompany ? "company" : "client";
      const { error: stepError } = await supabase
        .from("profiles")
        .update({ signup_step: 3, active_mode: activeMode }) // account_status is already "incomplete" from the signup trigger
        .eq("id", uid);
      if (stepError) console.warn("signup step not saved", stepError.message);
    }

    setIsLoading(false);
    setStep("setup");
  }

  function handleUseMyLocation() {
    if (!("geolocation" in navigator)) {
      addToast("Your browser can't share location. Enter your state and city instead.", "error");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocating(false);
      },
      (err) => {
        addToast(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked. Allow it in your browser settings, or enter your state and city."
            : "Couldn't get your location. Enter your state and city instead.",
          "error"
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  }

  async function handleSetupSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      addToast("Your session has ended. Log in to continue.", "error");
      return;
    }
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        bio: bio.trim(),
        state,
        city,
        lga: lga || null,
        latitude,
        longitude,
        profile_image_url: profileImageUrl || null,
        signup_step: 4,
        ...(isCompany && {
          company_name: companyName.trim(),
          industry: industry,
          city: companyLocation || city,
        }),
      })
      .eq("id", userId);
    setIsLoading(false);

    if (error) {
      addToast("Couldn't save your profile. Check your connection and try again.", "error");
      return;
    }

    if (isArtisan) {
      setStep("skills");
    } else if (isHomeService) {
      setStep("hs_services");
    } else if (isPaidRole) {
      await loadBankDetails();
      setStep("payment");
    } else {
      setIsLoading(true);
      await completeSignup(userId);
      setIsLoading(false);
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

    // Replace rather than append, so going back and changing skills never duplicates.
    const { error: clearError } = await supabase.from("user_skills").delete().eq("user_id", userId);
    const { error: skillError } = clearError
      ? { error: clearError }
      : await supabase.from("user_skills").insert(selectedSkillIds.map((skill_id) => ({ user_id: userId, skill_id })));
    if (skillError) {
      setIsLoading(false);
      addToast("Couldn't save your skills. Try again.", "error");
      return;
    }

    if (!isPaidRole) {
      await completeSignup(userId);
      setIsLoading(false);
      return;
    }

    await supabase.from("profiles").update({ signup_step: 5, account_status: "pending_payment" }).eq("id", userId);
    await loadBankDetails();
    setIsLoading(false);
    setStep("payment");
  }

  async function handleManualSubmit(amount: number) {
    if (!userId) return;
    setIsLoading(true);
    const supabase = createClient();

    const { error: payError } = await supabase.from("user_payments").insert({
      user_id: userId,
      amount,
      status: "pending",
    });
    if (payError) {
      setIsLoading(false);
      addToast("Couldn't record your transfer. Try again.", "error");
      return;
    }
    await supabase.from("profiles").update({ signup_step: 5, account_status: "pending_manual" }).eq("id", userId);

    setIsLoading(false);
    setStep("pending");
  }

  /** Waits for the Paystack webhook to activate the account. */
  async function waitForActivation(uid: string) {
    setConfirmingPayment(true);
    const supabase = createClient();
    const started = Date.now();
    while (Date.now() - started < PAYMENT_CONFIRM_TIMEOUT_MS) {
      const { data } = await supabase.from("profiles").select("account_status").eq("id", uid).maybeSingle();
      if (data?.account_status === "active") {
        setConfirmingPayment(false);
        await useSessionStore.getState().refreshUser();
        setStep("success");
        return;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    setConfirmingPayment(false);
    addToast("Payment received. We're still confirming it; your account opens as soon as it clears.", "success");
    setStep("pending");
  }

  async function handlePaystackPay(amount: number) {
    if (!userId || !email) return;
    if (!Number.isFinite(amount) || amount <= 0) {
      addToast("Couldn't work out the amount. Go back and choose your plan again.", "error");
      return;
    }

    const supabase = createClient();
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("paystack_public_key")
      .maybeSingle();
    const paystackKey = settings?.paystack_public_key;
    if (!paystackKey) {
      addToast("Payment unavailable. Contact support.", "error");
      return;
    }

    const orderType = isHomeService
      ? hsPlan === "business"
        ? "home_business"
        : hsPlan === "unlimited"
        ? "home_unlimited"
        : "home_growth"
      : isCompany && !isArtisan
      ? "company_subscription"
      : "artisan_subscription";

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({ user_id: userId, amount, status: "pending", order_type: orderType })
      .select("id")
      .single();

    if (orderError || !order) {
      addToast("Could not initiate payment. Try again.", "error");
      return;
    }

    // The webhook reads the order id after the first dash: "<timestamp>-<orderId>".
    // Sending the bare UUID (as before) made it cut the id short and never find the order.
    const reference = `${Date.now()}-${order.id}`;

    const open = () => {
      // @ts-ignore Paystack inline script global
      const handler = window.PaystackPop.setup({
        key: paystackKey,
        email,
        amount: Math.round(amount * 100),
        ref: reference,
        currency: "NGN",
        callback: () => {
          // Don't show success yet: the account opens only when the webhook confirms.
          void waitForActivation(userId);
        },
        onClose: () => addToast("Payment cancelled", "error"),
      });
      handler.openIframe();
    };

    // @ts-ignore
    if (window.PaystackPop) return open();
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = open;
    script.onerror = () => addToast("Couldn't load Paystack. Check your connection and try again.", "error");
    document.body.appendChild(script);
  }

  async function handleHsServicesSubmit() {
    if (selectedHsCategoryIds.length === 0) {
      addToast("Please select at least one service", "error");
      return;
    }
    if (!userId) return;
    setIsLoading(true);
    const supabase = createClient();

    // Save the chosen services (they were previously thrown away). Prices are
    // quote-based until the provider sets them from the dashboard.
    const rows = selectedHsCategoryIds.map((category_id) => ({
      provider_id: userId,
      category_id,
      name: hsCategories.find((c) => c.id === category_id)?.name ?? "Service",
      is_quote_based: true,
      is_active: true,
    }));
    const { error: clearError } = await supabase.from("provider_service_options").delete().eq("provider_id", userId);
    const { error } = clearError ? { error: clearError } : await supabase.from("provider_service_options").insert(rows);
    if (error) {
      setIsLoading(false);
      addToast("Couldn't save your services. Try again.", "error");
      return;
    }

    if (!isPaidRole) {
      await completeSignup(userId);
      setIsLoading(false);
      return;
    }
    setIsLoading(false);
    setStep("hs_plan");
  }

  async function handleHsPlanSubmit() {
    await loadBankDetails();
    if (userId) {
      const supabase = createClient();
      await supabase.from("profiles").update({ signup_step: 5, account_status: "pending_payment" }).eq("id", userId);
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
    campaign,
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
    confirmingPayment,
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
