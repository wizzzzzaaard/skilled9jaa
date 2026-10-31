import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Choose a new password | Skilled9ja", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-text-primary mb-8 text-center">Choose a new password</h1>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
