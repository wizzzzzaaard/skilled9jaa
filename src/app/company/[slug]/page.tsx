import CompanyClient from "./CompanyClient";

export function generateStaticParams() {
  return [{ slug: "demo" }];
}

export default function CompanyPage() {
  return <CompanyClient />;
}
