"use client";
import { useState, useEffect } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useUIStore } from "@/store/uiStore";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara",
];

export function SetupTab() {
  const { user, refreshUser } = useSessionStore();
  const { addToast } = useUIStore();
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone_number || "");
  const [additionalPhone, setAdditionalPhone] = useState("");
  const [bio, setBio] = useState(user?.bio || "");
  const [state, setState] = useState(user?.state || "");
  const [city, setCity] = useState(user?.city || "");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase.from("profiles")
      .select("additional_phone_number, whatsapp_url, instagram_url, twitter, linkedin_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setAdditionalPhone(data.additional_phone_number || "");
          setWhatsapp(data.whatsapp_url || "");
          setInstagram(data.instagram_url || "");
          setTwitter(data.twitter || "");
          setLinkedin(data.linkedin_url || "");
        }
      });
  }, [user?.id]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({
      full_name: fullName,
      phone_number: phone,
      additional_phone_number: additionalPhone,
      bio,
      state,
      city,
      whatsapp_url: whatsapp,
      instagram_url: instagram,
      twitter,
      linkedin_url: linkedin,
    }).eq("id", user.id);

    if (error) {
      addToast("Failed to save", "error");
    } else {
      addToast("Profile updated", "success");
      await refreshUser();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-text-primary">Profile Setup</h3>

      <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Input label="Additional Phone (optional)" value={additionalPhone} onChange={(e) => setAdditionalPhone(e.target.value)} />

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">State</label>
        <select
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={state}
          onChange={(e) => setState(e.target.value)}
        >
          <option value="">Select state</option>
          {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Bio</label>
        <textarea
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          placeholder="Tell clients what you do..."
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Social & Contact Links</p>
        <Input placeholder="WhatsApp URL — https://wa.me/234..." value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        <Input placeholder="Instagram — @username" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
        <Input placeholder="Twitter — @username" value={twitter} onChange={(e) => setTwitter(e.target.value)} />
        <Input placeholder="LinkedIn URL" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
      </div>

      <Button variant="primary" className="w-full" isLoading={saving} onClick={handleSave}>
        Save Changes
      </Button>
    </div>
  );
}