/**
 * Floor + overage seat quotes for Ops / Scale.
 * Keeps the ladder honest vs Field/People and between Ops vs Scale.
 */
export type SeatQuoteCode = "ops" | "scale";

export type SeatQuote = {
  min: number;
  max: number;
  step: number;
  /** Included seats covered by the plan floor (no overage). */
  included: number;
  floorCents: number;
  overageCents: number;
};

export const SEAT_QUOTES: Record<SeatQuoteCode, SeatQuote> = {
  ops: {
    min: 25,
    max: 100,
    step: 5,
    included: 50,
    floorCents: 24900,
    overageCents: 600, // $6 / seat above 50 → 100 seats = $549 (< Scale floor)
  },
  scale: {
    min: 100,
    max: 250,
    step: 10,
    included: 150,
    floorCents: 59900,
    overageCents: 450, // $4.50 / seat above 150
  },
};

export function isSeatQuoteCode(code: string): code is SeatQuoteCode {
  return code === "ops" || code === "scale";
}

export function quoteForSeats(code: SeatQuoteCode, seats: number): number {
  const q = SEAT_QUOTES[code];
  const clamped = Math.min(q.max, Math.max(q.min, seats));
  if (clamped <= q.included) return q.floorCents;
  return q.floorCents + (clamped - q.included) * q.overageCents;
}

export function clampSeats(code: SeatQuoteCode, seats: number): number {
  const q = SEAT_QUOTES[code];
  return Math.min(q.max, Math.max(q.min, seats));
}

/**
 * Validate a seat count for checkout / resize.
 * Returns null if valid, otherwise an error message.
 */
export function validateSeatCount(
  planCode: string,
  seats: number | null | undefined,
): string | null {
  if (!isSeatQuoteCode(planCode)) {
    if (seats != null) {
      return "This plan does not support selectable seats";
    }
    return null;
  }
  if (seats == null || !Number.isInteger(seats)) {
    return "Seat count is required for this plan";
  }
  const q = SEAT_QUOTES[planCode];
  if (seats < q.min || seats > q.max) {
    return `Seat count must be between ${q.min} and ${q.max}`;
  }
  if ((seats - q.min) % q.step !== 0) {
    return `Seat count must be in steps of ${q.step}`;
  }
  return null;
}

/** Polar graduated seat tiers: included band at $0, then overage. */
export function polarSeatTiers(code: SeatQuoteCode): Array<{
  minSeats: number;
  maxSeats: number;
  pricePerSeat: number;
}> {
  const q = SEAT_QUOTES[code];
  return [
    {
      minSeats: q.min,
      maxSeats: q.included,
      pricePerSeat: 0,
    },
    {
      minSeats: q.included + 1,
      maxSeats: q.max,
      pricePerSeat: q.overageCents,
    },
  ];
}
