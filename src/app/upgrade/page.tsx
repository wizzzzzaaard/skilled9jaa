import "@fontsource-variable/bricolage-grotesque/wdth.css";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import { UpgradeClient } from "@/components/payments/UpgradeClient";

export const metadata = { title: "Upgrade your profile | Skilled9ja", robots: { index: false } };

export default function UpgradePage() {
  return <UpgradeClient />;
}
