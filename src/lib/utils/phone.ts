/**
 * Nigerian mobile numbers.
 * Accepts 08031234567, 8031234567, 2348031234567, +234 803 123 4567, 0803-123-4567.
 * Returns E.164 (+2348031234567) or null when it isn't a valid Nigerian mobile.
 */
export function normalizeNgPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  let local: string;
  if (digits.startsWith("234")) local = digits.slice(3);
  else if (digits.startsWith("0")) local = digits.slice(1);
  else local = digits;

  // Nigerian mobile numbers: 10 digits after the country code, starting 7, 8 or 9
  // (070x, 080x, 081x, 090x, 091x...).
  if (!/^[789][01]\d{8}$/.test(local)) return null;
  return `+234${local}`;
}
