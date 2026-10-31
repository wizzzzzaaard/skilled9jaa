"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useUIStore } from "@/store/uiStore";

interface PlatformSettings {
  transport_rate_per_km: number;
  platform_fee_flat: number;
  withdrawal_fee_pct: number;
  artisan_lifetime_price: number;
  home_growth_price: number;
  home_business_price: number;
 home_unlimited_price: number;
  skilled9ja_display_price: number;
  skilled9ja_slash_price: number;
  paystack_enabled?: boolean | null;
  manual_payment_enabled?: boolean | null;
}

export default function AdminSettingsPage() {
  const { addToast } = useUIStore();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const supabase = createClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("*")
      .single();
    if (data) setSettings(data as PlatformSettings);
    setLoading(false);
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("platform_settings")
      .update({
        transport_rate_per_km: settings.transport_rate_per_km,
        platform_fee_flat: settings.platform_fee_flat,
        withdrawal_fee_pct: settings.withdrawal_fee_pct,
        artisan_lifetime_price: settings.artisan_lifetime_price,
        home_growth_price: settings.home_growth_price,
        home_business_price: settings.home_business_price,
      home_unlimited_price: settings.home_unlimited_price,
        skilled9ja_display_price: settings.skilled9ja_display_price,
        skilled9ja_slash_price: settings.skilled9ja_slash_price,
        paystack_enabled: settings.paystack_enabled !== false,
        manual_payment_enabled: settings.manual_payment_enabled !== false,
      })
      .eq("id", 1);

    if (!error && settings.paystack_enabled === false && settings.manual_payment_enabled === false) {
      addToast("Both payment methods are off, so nobody can pay for a plan.", "error");
    }
    if (error) {
      addToast("Failed to save settings", "error");
    } else {
      addToast("Settings saved", "success");
    }
    setSaving(false);
  }

  if (loading) return <Skeleton className="h-64 m-8" />;

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">
        Settings
      </h1>

      {settings && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
          <fieldset className="space-y-3">
            <legend className="font-semibold text-text-primary">Payment methods</legend>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 accent-[#1B4332]"
                checked={settings.paystack_enabled !== false}
                onChange={(e) => setSettings({ ...settings, paystack_enabled: e.target.checked })}
              />
              <span><span className="font-semibold">Card, bank and USSD (Paystack)</span><span className="block text-text-secondary">Members are activated automatically when Paystack confirms.</span></span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 accent-[#1B4332]"
                checked={settings.manual_payment_enabled !== false}
                onChange={(e) => setSettings({ ...settings, manual_payment_enabled: e.target.checked })}
              />
              <span><span className="font-semibold">Direct bank transfer</span><span className="block text-text-secondary">You confirm each one in Payments, matched by its S9- reference.</span></span>
            </label>
            {settings.paystack_enabled === false && settings.manual_payment_enabled === false && (
              <p className="text-sm font-semibold text-red-700" role="alert">With both off, nobody can pay for a plan.</p>
            )}
          </fieldset>
          <Input
            label="Transport Rate per KM (₦)"
            type="number"
            value={settings.transport_rate_per_km}
            onChange={(e) =>
              setSettings({
                ...settings,
                transport_rate_per_km: Number(e.target.value),
              })
            }
          />
          <Input
            label="Platform Fee (₦)"
            type="number"
            value={settings.platform_fee_flat}
            onChange={(e) =>
              setSettings({
                ...settings,
                platform_fee_flat: Number(e.target.value),
              })
            }
          />
          <Input
            label="Withdrawal Fee (%)"
            type="number"
            value={settings.withdrawal_fee_pct}
            onChange={(e) =>
              setSettings({
                ...settings,
                withdrawal_fee_pct: Number(e.target.value),
              })
            }
          />
          <Input
            label="Artisan Lifetime Price (₦)"
            type="number"
            value={settings.artisan_lifetime_price}
            onChange={(e) =>
              setSettings({
                ...settings,
                artisan_lifetime_price: Number(e.target.value),
              })
            }
          />
          <Input
            label="Home Service Growth Price (₦)"
            type="number"
            value={settings.home_growth_price}
            onChange={(e) =>
              setSettings({
                ...settings,
                home_growth_price: Number(e.target.value),
              })
            }
          />
          <Input
            label="Home Service Business Price (₦)"
            type="number"
            value={settings.home_business_price}
            onChange={(e) =>
              setSettings({
                ...settings,
                home_business_price: Number(e.target.value),
              })
            }
          />
          <Input
            label="Home Service Unlimited Price (₦)"
            type="number"
            value={settings.home_unlimited_price}
            onChange={(e) =>
              setSettings({
                ...settings,
                home_unlimited_price: Number(e.target.value),
              })
            }
          />
          <Input
            label="Artisan Standard Price — ₦ (display)"
            type="number"
            value={settings.skilled9ja_display_price}
            onChange={(e) =>
              setSettings({ ...settings, skilled9ja_display_price: Number(e.target.value) })
            }
          />
          <Input
            label="Artisan Premium Price — ₦ (not used: no screen sells this yet)"
            type="number"
            value={settings.skilled9ja_slash_price}
            onChange={(e) =>
              setSettings({ ...settings, skilled9ja_slash_price: Number(e.target.value) })
            }
          />
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={saving}
            className="w-full"
          >
            Save Settings
          </Button>
        </div>
      )}
    </div>
  );
}
