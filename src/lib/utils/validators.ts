import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupBasicSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().min(10, "Enter a valid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type SignupBasicInput = z.infer<typeof signupBasicSchema>;

export const signupRolesSchema = z.object({
  isClient: z.boolean(),
  isArtisan: z.boolean(),
  isHomeService: z.boolean(),
  isCompany: z.boolean(),
});

export type SignupRolesInput = z.infer<typeof signupRolesSchema>;

export const bookingServiceSchema = z.object({
  serviceOptionId: z.string().min(1, "Select a service"),
});

export const bookingLocationSchema = z.object({
  locationId: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

export const bookingScheduleSchema = z.object({
  date: z.string().min(1, "Select a date"),
  time: z.string().min(1, "Select a time"),
});

export const startCodeSchema = z.object({
  code: z.string().length(4, "Code must be 4 digits").regex(/^\d{4}$/, "Code must be 4 digits"),
});

export type StartCodeInput = z.infer<typeof startCodeSchema>;
