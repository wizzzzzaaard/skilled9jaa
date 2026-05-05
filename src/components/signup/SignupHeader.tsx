"use client";

interface Props {
  isHomeServiceMode: boolean;
}

export function SignupHeader({ isHomeServiceMode }: Props) {
  return (
    <div className="text-center mb-8">
      {isHomeServiceMode && (
        <div className="inline-flex items-center gap-2 bg-primary/8 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          🏠 Home Service Sign Up
        </div>
      )}
      <h1 className="text-2xl font-semibold text-text-primary mb-2">
        Create your account
      </h1>
      <p className="text-text-secondary">
        {isHomeServiceMode
          ? "Join Skilled9ja Home Service"
          : "Join thousands of professionals across Nigeria"}
      </p>
    </div>
  );
}