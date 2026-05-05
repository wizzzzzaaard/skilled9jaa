import BillClient from "./BillClient";

export function generateStaticParams() {
  return [{ token: "demo" }];
}

export default function BillPage() {
  return <BillClient />;
}
