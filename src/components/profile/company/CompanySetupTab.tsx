"use client";
import { useState, useEffect, } from "react";
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

const INDUSTRIES = [
  "Agriculture", "Construction", "Education", "Energy", "Finance",
  "Healthcare", "Hospitality", "IT & Technology", "Legal", "Logistics",
  "Manufacturing", "Media & Entertainment", "Other", "Real Estate",
  "Retail", "Services", "Telecommunications", "Transportation",
];

const BUSINESS_TYPES = [
  "Bank", "Car Dealership", "Cleaning Service", "Delivery Service",
  "Dry Cleaning/Laundry", "Fintech Startup", "Hospital/Clinic",
  "Logistics", "Media/Broadcasting", "Photography Studio",
  "Printing Press", "Real Estate Company", "Recruitment Agency",
  "Software Agency", "Solar Energy Company", "Tech Company",
  "Telecommunications", "Other",
];

export function CompanySetupTab() {
  const { user, refreshUser } = useSessionStore();
  const { addToast } = useUIStore();
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState(user?.company_name || "");
  const [description, setDescription] = useState(user?.company_description || "");
  const [website, setWebsite] = useState(user?.company_website || "");
  const [industry, setIndustry] = useState(user?.industry || "");
  const [businessType, setBusinessType] = useState(user?.business_type || "");
  const [companySize, setCompanySize] = useState(user?.company_size || "");
  const [state, setState] = useState(user?.state || "");
  const [city, setCity] = useState(user?.city || "");
  const [hrName, setHrName] = useState("");
  const [hrPhone, setHrPhone] = useState("");
  const [hrEmail, setHrEmail] = useState("");

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase.from("profiles")
      .select("hr_contact_name, hr_contact_phone, hr_contact_email, business_type")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setHrName(data.hr_contact_name || "");
          setHrPhone(data.hr_contact_phone || "");
          setHrEmail(data.hr_contact_email || "");
          setBusinessType(data.business_type || "");
        }
      });
  }, [user?.id]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({
      company_name: companyName,
      company_description: description,
      company_website: website,
      industry,
      business_type: businessType,
      company_size: companySize,
      state,
      city,
      hr_contact_name: hrName,
      hr_contact_phone: hrPhone,
      hr_contact_email: hrEmail,
    }).eq("id", user.id);

    if (error) {
      addToast("Failed to save", "error");
    } else {
      addToast("Company profile updated", "success");
      await refreshUser();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-text-primary">Company Setup</h3>

      <Input label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
      
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">About the Company</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          placeholder="Describe your company..."
        />
      </div>

      <Input label="Website (optional)" placeholder="https://..." value={website} onChange={(e) => setWebsite(e.target.value)} />

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Industry</label>
        <select
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        >
          <option value="">Select industry</option>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Business Type</label>
        <select
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
        >
          <option value="">Select business type</option>
          {BUSINESS_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Company Size</label>
        <select
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={companySize}
          onChange={(e) => setCompanySize(e.target.value)}
        >
          <option value="">Select size</option>
          {["1-10", "11-50", "51-200", "201-500", "500+"].map((s) => (
            <option key={s} value={s}>{s} employees</option>
          ))}
        </select>
      </div>

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

      <div className="space-y-3 p-3 bg-surface rounded-xl border border-gray-100">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">HR Contact</p>
        <Input label="HR Contact Name" placeholder="e.g. Amaka Johnson" value={hrName} onChange={(e) => setHrName(e.target.value)} />
        <Input label="HR Phone" placeholder="080XXXXXXXXX" value={hrPhone} onChange={(e) => setHrPhone(e.target.value)} />
        <Input label="HR Email" placeholder="hr@company.com" value={hrEmail} onChange={(e) => setHrEmail(e.target.value)} />
      </div>

      <Button variant="primary" className="w-full" isLoading={saving} onClick={handleSave}>
        Save Changes
      </Button>
    </div>
  );
}