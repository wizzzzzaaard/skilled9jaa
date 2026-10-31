"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    // Tie the label, error and hint to the field so tapping the label focuses it
    // and screen readers announce them.
    const autoId = useId();
    const inputId = id ?? autoId;
    const noteId = error || helperText ? `${inputId}-note` : undefined;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-text-primary mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={noteId}
          className={cn(
            // text-base (16px) stops iPhones zooming into the field
            "w-full px-4 py-3 border rounded-lg text-base sm:text-sm text-text-primary placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all",
            error ? "border-error focus:ring-error" : "border-gray-200 focus:ring-primary",
            className
          )}
          {...props}
        />
        {error && (
          <p id={noteId} className="mt-1 text-xs text-error">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={noteId} className="mt-1 text-xs text-text-secondary">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
