/**
 * Campaign attribution and analytics events.
 * UTM tags are captured on the landing page and sent with the signup so the
 * admin can see which link brought each user.
 */

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  ref?: string;
  landing_path?: string;
}

const KEY = "s9_attribution";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref"] as const;

function clean(value: string | null): string | undefined {
  if (!value) return undefined;
  // Keep tags short and plain so they can't carry markup into the admin.
  const v = value.trim().slice(0, 64).replace(/[^\w\-.]/g, "");
  return v || undefined;
}

export function captureAttribution(search: string, path: string): Attribution {
  const params = new URLSearchParams(search);
  const fresh: Attribution = { landing_path: path };
  let hasTags = false;
  for (const k of UTM_KEYS) {
    const v = clean(params.get(k));
    if (v) {
      fresh[k] = v;
      hasTags = true;
    }
  }

  // First touch wins: keep stored tags unless this visit carries new ones.
  let stored: Attribution | null = null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    stored = raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    stored = null;
  }
  const result = hasTags || !stored ? fresh : stored;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(result));
  } catch {
    /* storage can be blocked; attribution still travels in memory */
  }
  return result;
}

type Win = Window & {
  dataLayer?: unknown[];
  fbq?: (...args: unknown[]) => void;
  ttq?: { track: (event: string, params?: Record<string, unknown>) => void };
};

/**
 * Sends an event to whichever tag managers the site has loaded (only after
 * the visitor has accepted analytics cookies). Does nothing otherwise.
 */
export function track(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  const w = window as Win;
  try {
    w.dataLayer?.push({ event, ...params });
    if (event === "sign_up") {
      w.fbq?.("track", "CompleteRegistration", params);
      w.ttq?.track("CompleteRegistration", params);
    } else if (event === "begin_sign_up") {
      w.fbq?.("track", "Lead", params);
      w.ttq?.track("SubmitForm", params);
    }
  } catch {
    /* analytics must never break signup */
  }
}
