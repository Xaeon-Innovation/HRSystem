import { roundDays } from "./format";
import type { LeaveBalance, LeaveBalanceTransaction } from "./types";

export type BalanceParts = Pick<
  LeaveBalance,
  "openingBalance" | "accrued" | "carryOver" | "adjustments" | "used"
>;

/** remaining = opening + accrued + carryOver + adjustments − approvedLeaveTaken */
export function computeRemaining(parts: BalanceParts): number {
  return roundDays(
    parts.openingBalance +
      parts.accrued +
      parts.carryOver +
      parts.adjustments -
      parts.used,
  );
}

export function availableToRequest(
  balance: Pick<LeaveBalance, "remaining" | "pending" | "negativeAllowed">,
  reservePending: boolean,
): number {
  const reserved = reservePending ? balance.pending : 0;
  const available = roundDays(balance.remaining - reserved);
  if (balance.negativeAllowed) return available;
  return Math.max(0, available);
}

export function applyTransactionToBalance(
  balance: LeaveBalance,
  txn: Pick<LeaveBalanceTransaction, "type" | "amount">,
  updatedAt: string,
): LeaveBalance {
  const next: LeaveBalance = { ...balance };
  const amount = roundDays(txn.amount);

  switch (txn.type) {
    case "ACCRUAL":
      next.accrued = roundDays(next.accrued + amount);
      break;
    case "CARRY_OVER":
      next.carryOver = roundDays(next.carryOver + amount);
      break;
    case "MANUAL_ADJUSTMENT":
      next.adjustments = roundDays(next.adjustments + amount);
      break;
    case "DEDUCTION":
      next.used = roundDays(next.used + amount);
      break;
    case "CANCELLATION_CREDIT":
      next.used = roundDays(Math.max(0, next.used - amount));
      break;
    case "EXPIRY":
      next.carryOver = roundDays(Math.max(0, next.carryOver - amount));
      break;
    case "POLICY_RESET":
      next.openingBalance = computeRemaining(next);
      next.accrued = 0;
      next.carryOver = 0;
      next.adjustments = 0;
      next.used = 0;
      next.pending = 0;
      break;
    case "PENDING_RESERVE":
      next.pending = roundDays(next.pending + amount);
      break;
    case "PENDING_RELEASE":
      next.pending = roundDays(Math.max(0, next.pending - amount));
      break;
    default:
      break;
  }

  next.remaining = computeRemaining(next);
  next.updatedAt = updatedAt;
  if (txn.type === "ACCRUAL") next.lastAccrualAt = updatedAt;
  return next;
}

export function isNegative(balance: Pick<LeaveBalance, "remaining">): boolean {
  return balance.remaining < 0;
}
