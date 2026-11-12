/** Manually supplied pending amounts; no entitlement is inferred here. */
export type PendingAmounts = Readonly<{
  notice: number;
  severance: number;
  wages: number;
}>;

export type SettlementSummary = Readonly<{
  overtimeSubtotal: number;
  pending: PendingAmounts;
  pendingSubtotal: number;
  grandTotal: number;
}>;

/** Combines the illustrative overtime model with amounts entered by the user. */
export function summarizeSettlement(overtimeSubtotal: number, pending: PendingAmounts): SettlementSummary {
  for (const amount of [overtimeSubtotal, pending.notice, pending.severance, pending.wages]) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error('Los montos deben ser números válidos y no negativos.');
    }
  }
  const pendingSubtotal = pending.notice + pending.severance + pending.wages;
  return { overtimeSubtotal, pending, pendingSubtotal, grandTotal: overtimeSubtotal + pendingSubtotal };
}
