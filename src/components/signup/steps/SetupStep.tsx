"use client";

import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import type { SignupState } from "@/lib/hooks/useSignup";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { CITIES_BY_STATE, LGA_BY_STATE } from "@/lib/nigeria-places";
import s from "../flow.module.css";

const MAX_UPLOAD_MB = 15;

const BIO_EXAMPLE: Record<string, string> = {
  work: "Electrician with 6 years' experience wiring homes and shops around Ikeja. I fix faults the same day and charge from ₦5,000.",
  home_service: "Bridal and party makeup artist in Lekki. I come to you with everything needed. Bookings from ₦25,000.",
  hire_pro: "",
  hire_staff: "We run three pharmacies in Surulere and hire cashiers, sales reps and pharmacists.",
};

export function SetupStep({ s: f }: { s: SignupState }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [typeCity, setTypeCity] = useState(false);
  const cities = CITIES_BY_STATE[f.state] ?? [];
  const lgas = LGA_BY_STATE[f.state] ?? [];
  const e = f.setupErrors;

  useEffect(() => {
    const first = (["companyName", "state", "city"] as const).find((k) => e[k]);
    if (first) document.getElementById(`setup-${first}`)?.focus();
  }, [e]);

  // A city typed earlier that isn't in the list keeps the text box open.
  useEffect(() => {
    if (f.city && cities.length && !cities.includes(f.city)) setTypeCity(true);
  }, [f.city, cities]);

  async function onPhoto(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = ""; // allow picking the same file again
    if (!file || !f.userId) return;
    setUploadError(null);
    if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
      setUploadError("Choose a photo (JPG, PNG, WebP or HEIC).");
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setUploadError(`That photo is over ${MAX_UPLOAD_MB} MB. Choose a smaller one.`);
      return;
    }
    setUploading(true);
    try {
      const small = await Promise.race([
        imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 800, fileType: "image/webp", useWebWorker: true }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 30000)),
      ]);
      const path = `profiles/${f.userId}/avatar-${Date.now()}.webp`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("skilled-niger-assets").upload(path, small, { upsert: true, contentType: "image/webp" });
      if (error) throw error;
      const { data } = supabase.storage.from("skilled-niger-assets").getPublicUrl(path);
      f.setProfileImageUrl(data.publicUrl);
    } catch (err) {
      setUploadError(
        err instanceof Error && err.message === "timeout"
          ? "The photo took too long. Try a different one, or skip it for now."
          : "Couldn't use that photo. Try a JPG or PNG, or skip it for now.",
      );
    } finally {
      setUploading(false);
    }
  }

  const fieldErr = (k: keyof typeof e) =>
    e[k] ? (
      <p className={s.err} id={`setup-${k}-err`}>
        {e[k]}
      </p>
    ) : null;
  const inv = (k: keyof typeof e) => ({ "aria-invalid": e[k] ? (true as const) : undefined, "aria-describedby": e[k] ? `setup-${k}-err` : undefined });

  return (
    <form className={s.card} onSubmit={f.handleSetupSubmit} noValidate aria-labelledby="setup-title">
      <h1 className={s.title} id="setup-title">
        {f.isCompany ? "About your company" : f.path === "hire_pro" ? "Where are you?" : "Set up your profile"}
      </h1>
      <p className={s.sub}>
        {f.path === "hire_pro"
          ? "We use this to show pros closest to you first."
          : "Your area is how people near you find you. Only your area and distance are shown, never your address."}
      </p>

      <div className={s.stack}>
        {f.isCompany && (
          <>
            <div className={s.field}>
              <label htmlFor="setup-companyName">Company name</label>
              <input id="setup-companyName" {...inv("companyName")} value={f.companyName} onChange={(ev) => f.setCompanyName(ev.target.value)} maxLength={100} autoComplete="organization" />
              {fieldErr("companyName")}
            </div>
            <div className={s.field}>
              <label htmlFor="setup-industry">Industry (optional)</label>
              <input id="setup-industry" value={f.industry} onChange={(ev) => f.setIndustry(ev.target.value)} maxLength={60} placeholder="Retail, logistics, healthcare…" />
            </div>
          </>
        )}

        {f.path !== "hire_pro" && (
          <div>
            <span className={s.label}>{f.isCompany ? "Logo (optional)" : "Profile photo (optional)"}</span>
            <div className={s.photoRow}>
              <div className={s.avatar}>
                {f.profileImageUrl ? <img src={f.profileImageUrl} alt="Your photo" /> : <span aria-hidden="true">Photo</span>}
              </div>
              <div>
                <button type="button" className={s.ghostBtn} onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? "Uploading…" : f.profileImageUrl ? "Change photo" : "Add photo"}
                </button>
                {f.profileImageUrl && !uploading && (
                  <button type="button" className={s.textBtn} style={{ marginLeft: "0.75rem" }} onClick={() => f.setProfileImageUrl("")}>
                    Remove
                  </button>
                )}
                <p className={s.hint}>A clear photo of your face gets more replies.</p>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*,.heic,.heif" hidden onChange={onPhoto} aria-label="Choose a profile photo" />
            {uploadError && <p className={s.err} role="alert">{uploadError}</p>}
          </div>
        )}

        <div className={s.locBox}>
          <span className={s.label} style={{ margin: 0 }}>Your location</span>
          {f.latitude != null && f.longitude != null ? (
            <p className={s.locDone}>Location set. Results will be sorted from here.</p>
          ) : (
            <p className={s.hint} style={{ margin: 0 }}>Most accurate way to be matched with people nearby.</p>
          )}
          <div>
            <button type="button" className={s.ghostBtn} onClick={f.handleUseMyLocation} disabled={f.locating}>
              {f.locating ? "Finding you…" : f.latitude != null ? "Update my location" : "Use my current location"}
            </button>
          </div>
          {f.locationNote && <p className={s.hint} role="status">{f.locationNote}</p>}
        </div>

        <div className={s.two}>
          <div className={s.field}>
            <label htmlFor="setup-state">State</label>
            <select
              id="setup-state"
              {...inv("state")}
              value={f.state}
              onChange={(ev) => {
                f.setState(ev.target.value);
                f.setCity("");
                f.setLga("");
                setTypeCity(false);
              }}
              autoComplete="address-level1"
            >
              <option value="">Choose a state</option>
              {NIGERIAN_STATES.map((st) => (
                <option key={st}>{st}</option>
              ))}
            </select>
            {fieldErr("state")}
          </div>

          <div className={s.field}>
            <div className={s.labelRow}>
              <label htmlFor="setup-city">City or town</label>
              {cities.length > 0 && (
                <button type="button" className={s.textBtn} onClick={() => { setTypeCity((v) => !v); f.setCity(""); }}>
                  {typeCity ? "Pick from list" : "Not listed?"}
                </button>
              )}
            </div>
            {cities.length > 0 && !typeCity ? (
              <select id="setup-city" {...inv("city")} value={f.city} onChange={(ev) => f.setCity(ev.target.value)}>
                <option value="">Choose a town</option>
                {cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            ) : (
              <input id="setup-city" {...inv("city")} value={f.city} onChange={(ev) => f.setCity(ev.target.value)} maxLength={60} autoComplete="address-level2" placeholder={f.state ? "Type your town" : "Choose a state first"} disabled={!f.state} />
            )}
            {fieldErr("city")}
          </div>
        </div>

        {lgas.length > 0 && (
          <div className={s.field}>
            <label htmlFor="setup-lga">Local government area (optional)</label>
            <select id="setup-lga" value={f.lga} onChange={(ev) => f.setLga(ev.target.value)}>
              <option value="">Choose an LGA</option>
              {lgas.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
        )}

        {f.path !== "hire_pro" && (
          <div className={s.field}>
            <div className={s.labelRow}>
              <label htmlFor="setup-bio">{f.isCompany ? "What your company does (optional)" : "Short bio (optional)"}</label>
              <span className={s.hint} style={{ margin: 0 }} aria-live="polite">
                {f.bio.length}/500
              </span>
            </div>
            <textarea id="setup-bio" value={f.bio} onChange={(ev) => f.setBio(ev.target.value.slice(0, 500))} placeholder={BIO_EXAMPLE[f.path ?? "work"]} rows={4} />
            <p className={s.hint}>Your experience, your area and your usual prices.</p>
          </div>
        )}

        {e.form && (
          <p className={s.alert} role="alert">
            {e.form} {e.form.includes("Log in") && <a href="/login">Log in</a>}
          </p>
        )}
      </div>

      <div className={s.actions}>
        <button type="submit" className={s.primary} disabled={f.isLoading || uploading} aria-busy={f.isLoading}>
          {f.isLoading ? "Saving…" : f.isArtisan ? "Next: your skills" : f.isHomeService ? "Next: your services" : "Finish"}
        </button>
      </div>
    </form>
  );
}
