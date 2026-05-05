import ProviderClient from "./ProviderClient";

export function generateStaticParams() {
  return [{ slug: "demo" }];
}

export default function ProviderPage() {
  return <ProviderClient />;
}
