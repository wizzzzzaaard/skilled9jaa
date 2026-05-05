import BookClient from "./BookClient";

export function generateStaticParams() {
  return [{ providerSlug: "demo", token: "demo" }];
}

export default function BookInvitePage() {
  return <BookClient />;
}
