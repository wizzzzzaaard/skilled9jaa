import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";

export const metadata = {
  title: "Log In - Skilled9ja",
  description: "Sign in to your Skilled9ja account",
};

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            Welcome back
          </h1>
          <p className="text-text-secondary">
            Sign in to your Skilled9ja account
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="text-center mt-6 text-sm text-text-secondary">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
