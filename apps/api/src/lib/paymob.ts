import { createHmac, timingSafeEqual } from "node:crypto";

export type PaymobConfig = {
  baseUrl: string;
  apiKey: string;
  secretKey: string;
  publicKey: string;
  integrationId: number;
  hmacSecret: string;
  currency: string;
  webAppUrl: string;
  apiPublicUrl: string;
};

export function getPaymobConfig(): PaymobConfig | null {
  const secretKey = process.env.PAYMOB_SECRET_KEY;
  const apiKey = process.env.PAYMOB_API_KEY;
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
  const integrationId = Number(process.env.PAYMOB_INTEGRATION_ID ?? "");
  if (!secretKey || !apiKey || !hmacSecret || !integrationId) {
    return null;
  }
  return {
    baseUrl: (process.env.PAYMOB_BASE_URL ?? "https://accept.paymob.com").replace(
      /\/$/,
      "",
    ),
    apiKey,
    secretKey,
    publicKey: process.env.PAYMOB_PUBLIC_KEY ?? "",
    integrationId,
    hmacSecret,
    currency: process.env.PAYMOB_CURRENCY ?? "USD",
    webAppUrl: (
      process.env.WEB_APP_URL ??
      process.env.CORS_ORIGIN ??
      "http://localhost:3000"
    ).replace(/\/$/, ""),
    apiPublicUrl: (
      process.env.API_PUBLIC_URL ??
      `http://localhost:${process.env.API_PORT ?? 4000}`
    ).replace(/\/$/, ""),
  };
}

export function isPaymobConfigured(): boolean {
  return getPaymobConfig() !== null;
}

function safeEqualHex(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

/** Subscription webhook HMAC: "{trigger_type}for{subscription_data.id}" */
export function verifySubscriptionHmac(
  hmacSecret: string,
  triggerType: string,
  subscriptionId: string | number,
  providedHmac: string,
): boolean {
  const message = `${triggerType}for${subscriptionId}`;
  const expected = createHmac("sha512", hmacSecret)
    .update(message)
    .digest("hex");
  return safeEqualHex(expected.toLowerCase(), providedHmac.toLowerCase());
}

/**
 * Transaction callback HMAC, ordered field concatenation used by Paymob
 * transaction notifications (common Accept order).
 */
export function verifyTransactionHmac(
  hmacSecret: string,
  obj: Record<string, unknown>,
  providedHmac: string,
): boolean {
  const fields = [
    "amount_cents",
    "created_at",
    "currency",
    "error_occured",
    "has_parent_transaction",
    "id",
    "integration_id",
    "is_3d_secure",
    "is_auth",
    "is_capture",
    "is_refunded",
    "is_standalone_payment",
    "is_voided",
    "order",
    "owner",
    "pending",
    "source_data_pan",
    "source_data_sub_type",
    "source_data_type",
    "success",
  ];
  const message = fields
    .map((key) => {
      if (key === "order") {
        const order = obj.order as { id?: unknown } | unknown;
        if (order && typeof order === "object" && "id" in order) {
          return String((order as { id: unknown }).id ?? "");
        }
        return String(obj.order ?? "");
      }
      if (key.startsWith("source_data_")) {
        const src = (obj.source_data ?? {}) as Record<string, unknown>;
        const sub = key.replace("source_data_", "");
        return String(src[sub] ?? "");
      }
      return String(obj[key] ?? "");
    })
    .join("");
  const expected = createHmac("sha512", hmacSecret)
    .update(message)
    .digest("hex");
  return safeEqualHex(expected.toLowerCase(), providedHmac.toLowerCase());
}

async function paymobFetch<T>(
  config: PaymobConfig,
  path: string,
  init: RequestInit & { auth?: "token" | "bearer"; bearer?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.auth === "bearer" && init.bearer) {
    headers.Authorization = `Bearer ${init.bearer}`;
  } else {
    headers.Authorization = `Token ${config.secretKey}`;
  }
  const res = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paymob ${path} failed (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

export async function getPaymobAuthToken(
  config: PaymobConfig,
): Promise<string> {
  const data = await paymobFetch<{ token: string }>(config, "/api/auth/tokens", {
    method: "POST",
    body: JSON.stringify({ api_key: config.apiKey }),
    auth: "token",
  });
  return data.token;
}

export async function createPaymobSubscriptionPlan(
  config: PaymobConfig,
  input: {
    name: string;
    amountCents: number;
    currency: string;
    frequencyDays: number;
  },
): Promise<{ id: number }> {
  const token = await getPaymobAuthToken(config);
  return paymobFetch<{ id: number }>(
    config,
    "/api/acceptance/subscription_plans",
    {
      method: "POST",
      auth: "bearer",
      bearer: token,
      body: JSON.stringify({
        name: input.name,
        amount_cents: input.amountCents,
        currency: input.currency,
        frequency: input.frequencyDays,
        reminder_days: 2,
        retrial_days: 1,
      }),
    },
  );
}

export type CreateIntentionResult = {
  id: string | number;
  client_secret?: string;
  payment_keys?: Array<{ key?: string; redirection_url?: string }>;
  intention_order_id?: number | string;
  order?: { id?: number | string };
};

export async function createPaymobIntention(
  config: PaymobConfig,
  input: {
    amountCents: number;
    currency: string;
    subscriptionPlanId: number;
    specialReference: string;
    customer: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
    billingData?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      country?: string;
    };
  },
): Promise<CreateIntentionResult> {
  const billing = {
    apartment: "NA",
    first_name: input.billingData?.firstName ?? input.customer.firstName,
    last_name: input.billingData?.lastName ?? input.customer.lastName,
    street: "NA",
    building: "NA",
    phone_number: input.billingData?.phone ?? input.customer.phone,
    city: "NA",
    country: input.billingData?.country ?? "US",
    email: input.billingData?.email ?? input.customer.email,
    floor: "NA",
    state: "NA",
  };

  return paymobFetch<CreateIntentionResult>(
    config,
    "/v1/intention/",
    {
      method: "POST",
      body: JSON.stringify({
        amount: input.amountCents,
        currency: input.currency,
        payment_methods: [config.integrationId],
        items: [
          {
            name: "HR Track subscription",
            amount: input.amountCents,
            description: input.specialReference,
            quantity: 1,
          },
        ],
        billing_data: billing,
        customer: {
          first_name: input.customer.firstName,
          last_name: input.customer.lastName,
          email: input.customer.email,
          extras: { tenant_subscription_ref: input.specialReference },
        },
        extras: { tenant_subscription_ref: input.specialReference },
        special_reference: input.specialReference,
        notification_url: `${config.apiPublicUrl}/v1/webhooks/paymob`,
        redirection_url: `${config.webAppUrl}/app/billing?checkout=done`,
        recurring: {
          subscription_plan: input.subscriptionPlanId,
          auto_debit: true,
        },
      }),
    },
  );
}

export function checkoutUrlFromIntention(
  config: PaymobConfig,
  intention: CreateIntentionResult,
): string {
  if (intention.client_secret && config.publicKey) {
    return `${config.baseUrl}/unifiedcheckout/?publicKey=${encodeURIComponent(config.publicKey)}&clientSecret=${encodeURIComponent(intention.client_secret)}`;
  }
  const key = intention.payment_keys?.[0]?.key;
  if (key) {
    return `${config.baseUrl}/api/acceptance/iframes/0?payment_token=${encodeURIComponent(key)}`;
  }
  throw new Error("Paymob intention missing checkout credentials");
}

export async function cancelPaymobSubscription(
  config: PaymobConfig,
  subscriptionId: string,
): Promise<void> {
  await paymobFetch(config, `/api/acceptance/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
