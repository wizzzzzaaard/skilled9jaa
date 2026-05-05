"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-text-primary mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-4 py-3 border rounded-lg text-sm text-text-primary placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all",
            error
              ? "border-error focus:ring-error"
              : "border-gray-200 focus:ring-primary",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-text-secondary">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
