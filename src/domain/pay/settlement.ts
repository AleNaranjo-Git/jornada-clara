/** Pending amounts supplied by the user. Vacation days are a quantity, not an amount. */
export type PendingAmounts = Readonly<{
  notice: number;
  severance: number;
  wages: number;
  aguinaldo: number;
  vacationDays: number;
}>;

export type SettlementSummary = Readonly<{
  overtimeSubtotal: number;
  dailySalary: number;
  pending: PendingAmounts;
  vacationAmount: number;
  pendingSubtotal: number;
  grandTotal: number;
}>;

/**
 * Vacation estimate = pending days × reference daily salary.
 * Aguinaldo, notice, severance and wages are manually entered amounts.
 * This is an arithmetic summary, not a statutory entitlement calculation.
 */
export function summarizeSettlement(
  overtimeSubtotal: number,
  dailySalary: number,
  pending: PendingAmounts,
): SettlementSummary {
  const inputs = [overtimeSubtotal, dailySalary, pending.notice, pending.severance,
    pending.wages, pending.aguinaldo, pending.vacationDays];
  if (inputs.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('Los montos y días deben ser números válidos y no negativos.');
  }
  const vacationAmount = pending.vacationDays * dailySalary;
  const pendingSubtotal = pending.notice + pending.severance + pending.wages
    + pending.aguinaldo + vacationAmount;
  const grandTotal = overtimeSubtotal + pendingSubtotal;
  if (![vacationAmount, pendingSubtotal, grandTotal].every(Number.isFinite)) {
    throw new Error('El resultado excede el rango numérico permitido.');
  }
  return { overtimeSubtotal, dailySalary, pending, vacationAmount, pendingSubtotal, grandTotal };
}
