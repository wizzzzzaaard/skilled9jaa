import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Privacy notice | Skilled9ja", alternates: { canonical: "/privacy" } };

// DRAFT: have this reviewed against the Nigeria Data Protection Act 2023 before launch.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy notice" updated="31 October 2026">
      <h2>What we collect</h2>
      <ul>
        <li>Your name, phone number, email and password when you create an account.</li>
        <li>Your profile: photo, bio, skills, state, city and, if you allow it, your approximate location.</li>
        <li>Identity details you choose to submit for verification.</li>
        <li>Jobs you post or apply for, posts you upload and payments you make.</li>
        <li>Which link or advert brought you to Skilled9ja.</li>
      </ul>
      <h2>Why we use it</h2>
      <ul>
        <li>To run your account and show your profile to people near you.</li>
        <li>To match jobs, clients and pros by distance.</li>
        <li>To verify identities and keep the platform safe.</li>
        <li>To process payments and send you messages about your account.</li>
        <li>To understand which promotions work.</li>
      </ul>
      <h2>Who can see it</h2>
      <p>
        Other users see your public profile: name, photo, skills, area and distance. Your email, phone number and
        identity details are not shown publicly. Payment providers (Paystack) process payments for us.
      </p>
      <h2>Your rights</h2>
      <p>
        You can ask to see, correct or delete your data, or withdraw consent, from your settings or by contacting us.
        We keep account data while your account is open and delete it when you ask, unless the law requires us to keep it.
      </p>
    </LegalPage>
  );
}
