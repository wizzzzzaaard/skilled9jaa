import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Reset your password | Skilled9ja", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-text-primary mb-2 text-center">Reset your password</h1>
        <p className="text-text-secondary text-center mb-8">Enter the email you signed up with and we&apos;ll send you a reset link.</p>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <ForgotPasswordForm />
        </div>
        <p className="text-center mt-6 text-sm text-text-secondary">
          Remembered it?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
