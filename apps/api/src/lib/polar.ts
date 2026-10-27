import { Polar } from "@polar-sh/sdk";
import {
  isSeatQuoteCode,
  polarSeatTiers,
  type SeatQuoteCode,
} from "@hr/shared";

export type PolarConfig = {
  accessToken: string;
  server: "sandbox" | "production";
  webhookSecret: string | null;
  webAppUrl: string;
  apiPublicUrl: string;
};

export function getPolarConfig(): PolarConfig | null {
  const accessToken = process.env.POLAR_ACCESS_TOKEN?.trim();
  if (!accessToken) return null;
  const serverRaw = (process.env.POLAR_SERVER ?? "production").trim();
  const server = serverRaw === "sandbox" ? "sandbox" : "production";
  return {
    accessToken,
    server,
    webhookSecret: process.env.POLAR_WEBHOOK_SECRET?.trim() || null,
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

export function isPolarConfigured(): boolean {
  return getPolarConfig() !== null;
}

export function createPolarClient(config: PolarConfig = getPolarConfig()!) {
  return new Polar({
    accessToken: config.accessToken,
    server: config.server,
  });
}

function toCurrency(currency: string): "usd" | "eur" | "aed" {
  const c = currency.toLowerCase();
  if (c === "eur") return "eur";
  if (c === "aed") return "aed";
  return "usd";
}

export type PolarProductSyncInput = {
  code: string;
  name: string;
  description: string | null;
  amountCents: number;
  currency: string;
};

/**
 * Create a Polar recurring product for a catalog plan.
 * Field/People: fixed only. Ops/Scale: fixed floor + graduated seat overage.
 */
export async function createPolarProductForPlan(
  polar: Polar,
  plan: PolarProductSyncInput,
): Promise<{ id: string }> {
  const created = await polar.products.create({
    name: plan.name,
    description: plan.description,
    recurringInterval: "month",
    metadata: {
      elevora_plan_code: plan.code,
    },
    prices: buildPolarPrices(plan),
  });

  return { id: created.id };
}

function buildPolarPrices(plan: PolarProductSyncInput) {
  const currency = toCurrency(plan.currency || "USD");
  const prices: Array<
    | {
        amountType: "fixed";
        priceAmount: number;
        priceCurrency: "usd" | "eur" | "aed";
      }
    | {
        amountType: "seat_based";
        priceCurrency: "usd" | "eur" | "aed";
        seatTiers: {
          seatTierType: "graduated";
          tiers: Array<{
            minSeats: number;
            maxSeats: number;
            pricePerSeat: number;
          }>;
        };
      }
  > = [
    {
      amountType: "fixed",
      priceAmount: plan.amountCents,
      priceCurrency: currency,
    },
  ];

  if (isSeatQuoteCode(plan.code)) {
    prices.push({
      amountType: "seat_based",
      priceCurrency: currency,
      seatTiers: {
        seatTierType: "graduated",
        tiers: polarSeatTiers(plan.code as SeatQuoteCode),
      },
    });
  }
  return prices;
}

/**
 * Push catalog name/description/prices to an existing Polar product.
 * Omitting prior price ids archives them; new checkouts use the new prices.
 * Existing subscribers stay on grandfathered Polar prices.
 */
export async function updatePolarProductForPlan(
  polar: Polar,
  polarProductId: string,
  plan: PolarProductSyncInput,
): Promise<{ id: string }> {
  const updated = await polar.products.update({
    id: polarProductId,
    productUpdate: {
      name: plan.name,
      description: plan.description,
      metadata: {
        elevora_plan_code: plan.code,
      },
      prices: buildPolarPrices(plan),
    },
  });
  return { id: updated.id };
}

export async function createPolarCheckout(
  polar: Polar,
  config: PolarConfig,
  opts: {
    productId: string;
    seats?: number;
    tenantId: string;
    planId: string;
    customerEmail: string;
    customerName?: string;
  },
) {
  return polar.checkouts.create({
    products: [opts.productId],
    seats: opts.seats ?? null,
    externalCustomerId: opts.tenantId,
    customerEmail: opts.customerEmail,
    customerName: opts.customerName ?? null,
    metadata: {
      tenantId: opts.tenantId,
      planId: opts.planId,
    },
    customerMetadata: {
      tenantId: opts.tenantId,
    },
    successUrl: `${config.webAppUrl}/app/billing?checkout=done&checkout_id={CHECKOUT_ID}`,
    returnUrl: `${config.webAppUrl}/app/billing`,
  });
}

export async function updatePolarSubscriptionSeats(
  polar: Polar,
  subscriptionId: string,
  seats: number,
) {
  return polar.subscriptions.update({
    id: subscriptionId,
    subscriptionUpdate: {
      seats,
      prorationBehavior: "invoice",
    },
  });
}

export async function cancelPolarSubscriptionAtPeriodEnd(
  polar: Polar,
  subscriptionId: string,
) {
  return polar.subscriptions.update({
    id: subscriptionId,
    subscriptionUpdate: {
      cancelAtPeriodEnd: true,
    },
  });
}

export async function createPolarCustomerPortalSession(
  polar: Polar,
  opts: { customerId: string; returnUrl?: string },
) {
  return polar.customerSessions.create({
    customerId: opts.customerId,
    returnUrl: opts.returnUrl ?? null,
  });
}

/** Map Polar subscription status → Polara subscription_status. */
export function mapPolarStatus(
  status: string,
): "trialing" | "active" | "past_due" | "canceled" | "expired" {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "revoked":
    case "incomplete_expired":
      return "canceled";
    case "paused":
      return "expired";
    default:
      return "active";
  }
}
