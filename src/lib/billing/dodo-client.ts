import DodoPayments from "dodopayments";

export type DodoEnvironment = "test_mode" | "live_mode";

/** Strips whitespace and stray quotes that env editors commonly add. */
export function sanitizeEnvSecret(value: string | undefined) {
  return value?.trim().replace(/^["']+|["']+$/g, "").trim() ?? "";
}

/**
 * Builds the Dodo client from explicit configuration. The environment is never
 * guessed: an unset DODO_PAYMENTS_ENV means live mode, and a test key in live
 * mode is refused so a misconfigured deployment fails loudly.
 */
export function getDodoClient(options: { requireWebhookKey?: boolean } = {}) {
  const apiKey = sanitizeEnvSecret(process.env.DODO_PAYMENTS_API_KEY);
  if (!apiKey) throw new Error("Missing DODO_PAYMENTS_API_KEY environment variable.");

  const webhookKey = sanitizeEnvSecret(process.env.DODO_PAYMENTS_WEBHOOK_KEY);
  if (options.requireWebhookKey && !webhookKey) throw new Error("Missing DODO_PAYMENTS_WEBHOOK_KEY environment variable.");

  const configured = sanitizeEnvSecret(process.env.DODO_PAYMENTS_ENV);
  const environment: DodoEnvironment = configured === "test_mode" ? "test_mode" : "live_mode";
  if (configured !== "test_mode" && configured !== "live_mode") {
    console.warn("[billing] DODO_PAYMENTS_ENV is not set to test_mode or live_mode; using live_mode.");
  }
  if (environment === "live_mode" && /^(sk_)?test_/.test(apiKey)) {
    throw new Error("DODO_PAYMENTS_API_KEY looks like a test key, but Dodo Payments is in live_mode.");
  }

  const client = new DodoPayments({ bearerToken: apiKey, environment, ...(options.requireWebhookKey ? { webhookKey } : {}) });
  return { client, environment };
}
