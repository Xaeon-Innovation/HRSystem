import { hasSystemModuleRole } from "@hr/shared";
import type { ChangeRequestStatus, CompActor, CompStatus } from "./types";

const ALLOWED: Record<ChangeRequestStatus, ChangeRequestStatus[]> = {
  draft: ["pending"],
  pending: ["approved", "rejected", "returned"],
  returned: ["pending", "draft"],
  approved: [],
  rejected: [],
};

export function canTransition(
  from: ChangeRequestStatus,
  to: ChangeRequestStatus,
): boolean {
  return ALLOWED[from].includes(to);
}

export function isAdminActor(actor: CompActor): boolean {
  return hasSystemModuleRole(actor, "compensation");
}

export function canAccessCompensationPage(actor: CompActor, isManager: boolean): boolean {
  if (isAdminActor(actor)) return true;
  return isManager;
}

export function canViewEmployee(
  actor: CompActor,
  employee: { id: string; managerId: string | null },
  isManager: boolean,
): boolean {
  if (isAdminActor(actor)) return true;
  if (!isManager) return false;
  const selfId = actor.employeeId ?? actor.id;
  return employee.managerId === selfId || employee.id === selfId;
}

export function canProposeChange(actor: CompActor, isManager: boolean): boolean {
  return isAdminActor(actor) || isManager;
}

export function canApprove(actor: CompActor): boolean {
  return isAdminActor(actor);
}

export function canEditSensitive(actor: CompActor): boolean {
  return isAdminActor(actor);
}

export function nextStatusAfterDecision(
  decision: "approved" | "rejected" | "returned",
): ChangeRequestStatus {
  return decision;
}

export function recordStatusAfterChange(
  changeType: string,
  current: CompStatus,
): CompStatus {
  if (changeType === "salary_freeze") return "frozen";
  if (current === "frozen" && changeType !== "salary_freeze") return "active";
  return "active";
}

export function appliesToBase(changeType: string): boolean {
  return (
    changeType === "hire_salary" ||
    changeType === "promotion_increase" ||
    changeType === "merit_increase" ||
    changeType === "adjustment" ||
    changeType === "market_adjustment" ||
    changeType === "salary_reduction" ||
    changeType === "transfer_related"
  );
}

export function isVariableChange(changeType: string): boolean {
  return changeType === "bonus_payout" || changeType === "commission_payout";
}
