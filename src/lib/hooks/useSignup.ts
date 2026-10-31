"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSessionStore } from "@/store/sessionStore";
import { getCampaign } from "@/lib/campaigns";
import { FREE_SIGNUP, PAYMENT_CONFIRM_TIMEOUT_MS } from "@/lib/config";
import { normalizeNgPhone } from "@/lib/utils/phone";
import { explainSignupError, validateAccount, type AccountErrors } from "@/lib/signupRules";
import { captureAttribution, track } from "@/lib/utils/attribution";
import {
  homeServiceTotal,
  loadBankDetails,
  loadPricing,
  recordTransfer,
  startPaystackCheckout,
  waitForProfile,
  type BankDetails,
  type OrderType,
  type Pricing,
} from "@/lib/payments";
import { normalizeState } from "@/lib/nigeria-places";
import type { SignupPath, Skill, Step } from "@/types/signup";

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Reads ?role= / ?mode= links from the header, homepage and old pages. */
function pathFromParams(role: string | null, mode: string | null): SignupPath | null {
  if (mode === "homeservice") return role === "client" ? "hire_pro" : "home_service";
  if (role === "artisan" || role === "work" || role === "provider") return "work";
  if (role === "client") return "hire_pro";
  if (role === "company") return "hire_staff";
  return null;
}

function flagsFor(path: SignupPath) {
  return {
    is_client: path === "hire_pro" || path === "hire_staff",
    is_artisan: path === "work",
    is_home_service_provider: path === "home_service",
    is_company: path === "hire_staff",
  };
}

function modeFor(path: SignupPath) {
  return path === "home_service" ? "home_service_provider" : path === "work" ? "artisan" : path === "hire_staff" ? "company" : "client";
}

export type SetupErrors = Partial<Record<"state" | "city" | "companyName" | "form", string>>;

export function useSignup() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const resumeParam = searchParams.get("resume");
  const stepParam = searchParams.get("step");
  const campaign = getCampaign(searchParams.get("niche") ?? "");
  const presetPath = pathFromParams(searchParams.get("role"), searchParams.get("mode"));

  const [step, setStep] = useState<Step>(resumeParam ? "intro" : presetPath ? "basic" : "role");
  const [path, setPath] = useState<SignupPath | null>(presetPath);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Account
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [accountErrors, setAccountErrors] = useState<AccountErrors>({});
  const [formError, setFormError] = useState<{ text: string; login?: boolean } | null>(null);

  // Profile
  const [bio, setBio] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [lga, setLga] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [setupErrors, setSetupErrors] = useState<SetupErrors>({});

  // An error disappears as soon as the person changes that field.
  const clearAcc = (k: keyof AccountErrors) => setAccountErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  const clearSetup = (k: keyof SetupErrors) => setSetupErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));

  // Skills / services
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const skillsPrefilled = useRef(false);
  const [hsCategories, setHsCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedHsCategoryIds, setSelectedHsCategoryIds] = useState<string[]>([]);
  const [hsCategoriesLoading, setHsCategoriesLoading] = useState(false);
  const hsPrefilled = useRef(false);
  const [hsPlan, setHsPlan] = useState<"growth" | "business" | "unlimited">("growth");

  // Payment (only when free signup is switched off)
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "manual">("paystack");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  const isArtisan = path === "work";
  const isCompany = path === "hire_staff";
  const isHomeService = path === "home_service";
  const isClient = path === "hire_pro" || path === "hire_staff";
  const isPaidRole = !FREE_SIGNUP && (isArtisan || isHomeService);

  const steps = useMemo(() => {
    const list: { key: Step; label: string }[] = [
      { key: "role", label: "Your goal" },
      { key: "basic", label: "Account" },
      { key: "setup", label: "Profile" },
    ];
    if (!path) list.push({ key: "skills", label: "Details" }); // most paths have a 4th step
    if (isArtisan) list.push({ key: "skills", label: "Skills" });
    if (isHomeService) list.push({ key: "hs_services", label: "Services" });
    if (isPaidRole && isHomeService) list.push({ key: "hs_plan", label: "Plan" });
    if (isPaidRole) list.push({ key: "payment", label: "Payment" });
    return list;
  }, [path, isArtisan, isHomeService, isPaidRole]);
  const stepIndex = Math.max(0, steps.findIndex((s) => s.key === step));

  const amountDue = useMemo(() => {
    if (!pricing) return 0;
    return isHomeService ? homeServiceTotal(pricing, selectedHsCategoryIds.length, hsPlan) : pricing.artisanPrice;
  }, [pricing, isHomeService, selectedHsCategoryIds.length, hsPlan]);

  useEffect(() => {
    captureAttribution(window.location.search, window.location.pathname);
    loadPricing().then(setPricing);
  }, []);

  // ── Resume (email link, unfinished signup, or redirect from the app) ──
  useEffect(() => {
    if (!resumeParam) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      setUserId(data.user.id);
      setEmail(data.user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, is_artisan, is_company, is_home_service_provider, is_client, signup_step, account_status, state, city, lga, bio, latitude, longitude, profile_image_url, company_name, industry")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.account_status === "active") {
        router.push("/dashboard");
        return;
      }
      if (profile?.account_status === "pending_manual") {
        router.push("/signup/pending");
        return;
      }

      const resumedPath: SignupPath = profile?.is_home_service_provider
        ? "home_service"
        : profile?.is_artisan
        ? "work"
        : profile?.is_company
        ? "hire_staff"
        : "hire_pro";
      setPath(resumedPath);
      if (profile) {
        setFullName(profile.full_name ?? "");
        setState(normalizeState(profile.state));
        setCity(profile.city ?? "");
        setLga(profile.lga ?? "");
        setBio(profile.bio ?? "");
        setLatitude(profile.latitude ?? null);
        setLongitude(profile.longitude ?? null);
        setProfileImageUrl(profile.profile_image_url ?? "");
        setCompanyName(profile.company_name ?? "");
        setIndustry(profile.industry ?? "");
      }

      const stepNum = parseInt(stepParam || "0");
      const wantsPayment = stepParam === "payment" || stepNum === 5;
      if (wantsPayment) {
        if (FREE_SIGNUP) {
          // Accounts that were stuck at "pay before entry" go straight in.
          await completeSignup(data.user.id);
          return;
        }
        setBankDetails(await loadBankDetails());
        setStep("payment");
      } else if (stepNum >= 4) {
        setStep(resumedPath === "work" ? "skills" : resumedPath === "home_service" ? "hs_services" : "setup");
      } else {
        setStep("setup");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeParam, stepParam]);

  // ── Load skills / services when their step opens ──
  useEffect(() => {
    if (step !== "skills" || availableSkills.length) return;
    setSkillsLoading(true);
    setSkillsError(null);
    createClient()
      .from("skills")
      .select("id, name, type")
      .order("name")
      .then(({ data, error }) => {
        if (error || !data) setSkillsError("Couldn't load the skills list. Check your connection.");
        else setAvailableSkills(data as Skill[]);
        setSkillsLoading(false);
      });
  }, [step, availableSkills.length]);

  useEffect(() => {
    if (skillsPrefilled.current || !campaign?.preselect.length || !availableSkills.length) return;
    skillsPrefilled.current = true;
    const ids = campaign.preselect
      .map((name) => availableSkills.find((sk) => sameName(sk.name, name))?.id)
      .filter((id): id is number => typeof id === "number")
      .slice(0, 3);
    if (ids.length) setSelectedSkillIds((prev) => (prev.length ? prev : ids));
  }, [availableSkills, campaign]);

  useEffect(() => {
    if (step !== "hs_services" || hsCategories.length) return;
    setHsCategoriesLoading(true);
    createClient()
      .from("home_service_categories")
      .select("id, name")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data, error }) => {
        if (error || !data) setSkillsError("Couldn't load the services list. Check your connection.");
        else setHsCategories(data);
        setHsCategoriesLoading(false);
      });
  }, [step, hsCategories.length]);

  useEffect(() => {
    if (hsPrefilled.current || !campaign?.preselect.length || !hsCategories.length) return;
    hsPrefilled.current = true;
    const ids = campaign.preselect.map((name) => hsCategories.find((c) => sameName(c.name, name))?.id).filter((id): id is string => !!id);
    if (ids.length) setSelectedHsCategoryIds((prev) => (prev.length ? prev : ids));
  }, [hsCategories, campaign]);

  // ── Finish ──
  /** Activates the account on the server, falling back to the old direct update until the migration lands. */
  async function completeSignup(uid: string) {
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("complete_signup");
    if (rpcError) {
      const missing = rpcError.code === "PGRST202" || rpcError.code === "42883";
      if (!missing) {
        setFormError({ text: "Couldn't finish your signup. Try again." });
        return false;
      }
      const { error } = await supabase.from("profiles").update({ account_status: "active", signup_step: 6 }).eq("id", uid);
      if (error) {
        setFormError({ text: "Couldn't finish your signup. Try again." });
        return false;
      }
    }
    track("signup_complete", { path: path ?? "unknown" });
    await useSessionStore.getState().refreshUser();
    router.push("/dashboard?welcome=1");
    router.refresh();
    return true;
  }

  // ── Step handlers ──
  function choosePath(p: SignupPath) {
    setPath(p);
    setFormError(null);
  }

  function handleRoleSubmit() {
    if (!path) {
      setFormError({ text: "Choose what you want to do on Skilled9ja." });
      return;
    }
    setFormError(null);
    setStep("basic");
  }

  async function handleBasicSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (isLoading || !path) return;
    setFormError(null);
    const found = validateAccount({ fullName, phone, email, password, consent });
    setAccountErrors(found);
    if (Object.keys(found).length) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setFormError({ text: "You're offline. Connect to the internet, then try again." });
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const cleanEmail = email.trim().toLowerCase();
    const next = `/signup?resume=true&step=3${isHomeService ? "&mode=homeservice" : ""}${campaign ? `&niche=${campaign.slug}` : ""}`;
    let attribution = {};
    try {
      const raw = window.sessionStorage.getItem("s9_attribution");
      attribution = raw ? JSON.parse(raw) : {};
    } catch {
      /* ignore */
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${next}`,
          data: {
            full_name: fullName.trim().replace(/\s+/g, " "),
            phone_number: normalizeNgPhone(phone),
            ...flagsFor(path),
            signup_niche: campaign?.slug ?? null,
            ...attribution,
            consent_terms_at: new Date().toISOString(),
          },
        },
      });
      if (error) {
        setFormError(explainSignupError(error.message));
        return;
      }
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setFormError({ text: "This email already has an account.", login: true });
        return;
      }
      track("sign_up", { path, method: "email" });
      if (!data.session) {
        setStep("check_email");
        return;
      }
      const uid = data.session.user.id;
      setUserId(uid);
      const { error: stepError } = await supabase.from("profiles").update({ signup_step: 3, active_mode: modeFor(path) }).eq("id", uid);
      if (stepError) console.warn("signup step not saved", stepError.message);
      setStep("setup");
    } catch (err) {
      setFormError(explainSignupError(err instanceof Error ? err.message : "network"));
    } finally {
      setIsLoading(false);
    }
  }

  function handleUseMyLocation() {
    setLocationNote(null);
    if (!("geolocation" in navigator)) {
      setLocationNote("This browser can't share location. Choose your state and city below.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
        setLocating(false);
        setLocationNote("Location saved. Only your area and distance are shown to others.");
      },
      (err) => {
        setLocating(false);
        setLocationNote(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked. Allow it in your browser settings, or just choose your state and city."
            : "Couldn't get your location. Choose your state and city instead.",
        );
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  }

  async function handleSetupSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (isLoading) return;
    if (!userId) {
      setSetupErrors({ form: "Your session has ended. Log in to continue." });
      return;
    }
    const errs: SetupErrors = {};
    if (!state) errs.state = "Choose your state.";
    if (city.trim().length < 2) errs.city = "Enter your city or town.";
    if (isCompany && companyName.trim().length < 2) errs.companyName = "Enter your company name.";
    setSetupErrors(errs);
    if (Object.keys(errs).length) return;

    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        bio: bio.trim() || null,
        state: normalizeState(state),
        city: city.trim(),
        lga: lga || null,
        latitude,
        longitude,
        profile_image_url: profileImageUrl || null,
        signup_step: 4,
        ...(isCompany && { company_name: companyName.trim(), industry: industry.trim() || null }),
      })
      .eq("id", userId);
    setIsLoading(false);
    if (error) {
      setSetupErrors({ form: "Couldn't save your profile. Check your connection and try again." });
      return;
    }

    if (isArtisan) setStep("skills");
    else if (isHomeService) setStep("hs_services");
    else {
      setIsLoading(true);
      await completeSignup(userId);
      setIsLoading(false);
    }
  }

  function toggleSkill(id: number) {
    setSkillsError(null);
    setSelectedSkillIds((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= 3) {
        setSkillsError("You can pick up to 3. Remove one to add another.");
        return prev;
      }
      return [...prev, id];
    });
  }

  async function handleSkillsSubmit() {
    if (!userId || isLoading) return;
    if (selectedSkillIds.length === 0) {
      setSkillsError("Pick at least one skill or job role.");
      return;
    }
    setIsLoading(true);
    const supabase = createClient();
    const { error: clearError } = await supabase.from("user_skills").delete().eq("user_id", userId);
    const { error } = clearError
      ? { error: clearError }
      : await supabase.from("user_skills").insert(selectedSkillIds.map((skill_id) => ({ user_id: userId, skill_id })));
    if (error) {
      setIsLoading(false);
      setSkillsError("Couldn't save your skills. Try again.");
      return;
    }
    if (!isPaidRole) {
      await completeSignup(userId);
      setIsLoading(false);
      return;
    }
    await supabase.from("profiles").update({ signup_step: 5 }).eq("id", userId);
    setBankDetails(await loadBankDetails());
    setIsLoading(false);
    setStep("payment");
  }

  async function handleHsServicesSubmit() {
    if (!userId || isLoading) return;
    if (selectedHsCategoryIds.length === 0) {
      setSkillsError("Pick at least one service.");
      return;
    }
    setIsLoading(true);
    const supabase = createClient();
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
      setSkillsError("Couldn't save your services. Try again.");
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
    setBankDetails(await loadBankDetails());
    setStep("payment");
  }

  async function handlePaystackPay() {
    if (!userId || !pricing) return;
    setPaymentError(null);
    const orderType: OrderType = isHomeService ? (`home_${hsPlan}` as OrderType) : "artisan_subscription";
    const result = await startPaystackCheckout({ userId, email, amount: amountDue, orderType, pricing });
    if (result.status === "error") return setPaymentError(result.message);
    if (result.status === "closed") return setPaymentError("Payment window closed. Nothing was charged. Tap the button to try again.");
    setConfirmingPayment(true);
    const ok = await waitForProfile(userId, (p) => p.account_status === "active", PAYMENT_CONFIRM_TIMEOUT_MS);
    setConfirmingPayment(false);
    if (ok) {
      await useSessionStore.getState().refreshUser();
      setStep("success");
    } else {
      // Paystack took the money but the webhook hasn't arrived yet.
      router.push("/signup/pending?paid=card");
    }
  }

  async function handleManualSubmit() {
    if (!userId || isLoading) return;
    setIsLoading(true);
    setPaymentError(null);
    const ok = await recordTransfer(userId, amountDue);
    if (!ok) {
      setIsLoading(false);
      setPaymentError("Couldn't record your transfer. Try again.");
      return;
    }
    await createClient().from("profiles").update({ signup_step: 5 }).eq("id", userId);
    setIsLoading(false);
    router.push("/signup/pending");
  }

  function goBack() {
    setFormError(null);
    if (step === "basic") setStep("role");
    else if (step === "skills" || step === "hs_services") setStep("setup");
    else if (step === "hs_plan") setStep("hs_services");
    else if (step === "payment") setStep(isHomeService ? "hs_plan" : "skills");
  }
  // Once the account exists there's no going back to the account form.
  const canGoBack = step === "basic" ? !presetPath : ["skills", "hs_services", "hs_plan", "payment"].includes(step);

  return {
    // flow
    step,
    setStep,
    steps,
    stepIndex,
    goBack,
    canGoBack,
    isLoading,
    campaign,
    // path
    path,
    choosePath,
    isArtisan,
    isCompany,
    isHomeService,
    isClient,
    isPaidRole,
    // account
    fullName,
    setFullName: (v: string) => (setFullName(v), clearAcc("fullName")),
    email,
    setEmail: (v: string) => (setEmail(v), clearAcc("email")),
    phone,
    setPhone: (v: string) => (setPhone(v), clearAcc("phone")),
    password,
    setPassword: (v: string) => (setPassword(v), clearAcc("password")),
    consent,
    setConsent: (v: boolean) => (setConsent(v), clearAcc("consent")),
    accountErrors,
    formError,
    handleRoleSubmit,
    handleBasicSubmit,
    // profile
    userId,
    bio,
    setBio,
    state,
    setState: (v: string) => (setState(v), clearSetup("state")),
    city,
    setCity: (v: string) => (setCity(v), clearSetup("city")),
    lga,
    setLga,
    latitude,
    longitude,
    locating,
    locationNote,
    handleUseMyLocation,
    profileImageUrl,
    setProfileImageUrl,
    companyName,
    setCompanyName: (v: string) => (setCompanyName(v), clearSetup("companyName")),
    industry,
    setIndustry,
    setupErrors,
    handleSetupSubmit,
    // skills / services
    availableSkills,
    selectedSkillIds,
    skillsLoading,
    skillsError,
    toggleSkill,
    handleSkillsSubmit,
    hsCategories,
    selectedHsCategoryIds,
    setSelectedHsCategoryIds,
    hsCategoriesLoading,
    handleHsServicesSubmit,
    hsPlan,
    setHsPlan,
    handleHsPlanSubmit,
    // payment
    pricing,
    amountDue,
    bankDetails,
    paymentMethod,
    setPaymentMethod,
    paymentError,
    confirmingPayment,
    handlePaystackPay,
    handleManualSubmit,
  };
}

export type SignupState = ReturnType<typeof useSignup>;
