import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Terms | Skilled9ja", alternates: { canonical: "/terms" } };

// DRAFT: have this reviewed by a lawyer before launch.
export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="31 October 2026">
      <h2>Your account</h2>
      <p>Give accurate information, keep your password private, and use one account per person or company.</p>
      <h2>What Skilled9ja does</h2>
      <p>
        Skilled9ja helps people find pros, jobs and candidates near them. Unless a booking is paid through our escrow,
        any agreement for work is between you and the other person.
      </p>
      <h2>What you must not do</h2>
      <ul>
        <li>Post false, misleading or illegal jobs, services or content.</li>
        <li>Ask applicants to pay to be considered for a job.</li>
        <li>Collect other users&apos; details for spam.</li>
      </ul>
      <h2>Paid features</h2>
      <p>Prices are shown before you pay. Subscriptions renew until you cancel. Boosts and job posts run for the period shown.</p>
      <h2>Ending your account</h2>
      <p>You can close your account at any time. We may suspend accounts that break these terms.</p>
    </LegalPage>
  );
}
