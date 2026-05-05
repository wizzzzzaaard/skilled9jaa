"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Props {
  fullName: string;
  setFullName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  handleBasicSubmit: (e: React.FormEvent) => void;
}

export function BasicStep({
  fullName,
  setFullName,
  email,
  setEmail,
  phone,
  setPhone,
  password,
  setPassword,
  handleBasicSubmit,
}: Props) {
  return (
    <form onSubmit={handleBasicSubmit} className="space-y-4">
      <Input
        label="Full Name"
        placeholder="e.g. Chidi Okeke"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />
      <Input
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        label="Phone Number"
        type="tel"
        placeholder="080XXXXXXXXX"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
      />
      <Input
        label="Password"
        type="password"
        placeholder="Minimum 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" variant="primary" className="w-full">
        Continue →
      </Button>
      <p className="text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <a href="/login" className="text-primary font-semibold">
          Log in
        </a>
      </p>
    </form>
  );
}