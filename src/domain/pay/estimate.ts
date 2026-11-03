import { summarizeSchedule } from '../cycles/calculator.ts';
import type { ScheduleRequest, ShiftKind } from '../cycles/types.ts';

/**
 * DEMONSTRATION ONLY — not an assertion of legal overtime entitlement.
 * Reference formula: monthly salary / 30, hourly pay using an 8-hour
 * day or 6-hour night divisor, then a 1.5 multiplier.
 * Shifts may be subject to exceptions, weekly thresholds and special regimes.
 */
export const DEMO_RULE = Object.freeze({
  daysPerMonth: 30,
  dailyOrdinaryHours: { diurno: 8, nocturno: 6 } as const,
  overtimeMultiplier: 1.5,
});

export type IllustrativePayEstimate = Readonly<{
  monthlySalary: number;
  dailySalary: number;
  overtimeHourlyRates: Readonly<{ diurno: number; nocturno: number }>;
  illustrativeOvertimeHours: Readonly<{ diurno: number; nocturno: number }>;
  subtotals: Readonly<{ diurno: number; nocturno: number }>;
  total: number;
}>;

/**
 * Efficiently counts overtime HOURS for complete cycles and partial cycles;
 * it respects the order and starting position of the shifts.
 */
export function estimateIllustrativeOvertime(
  schedule: ScheduleRequest,
  monthlySalary: number,
): IllustrativePayEstimate {
  if (!Number.isFinite(monthlySalary) || monthlySalary < 0) {
    throw new Error('El salario mensual debe ser un número válido y no negativo.');
  }
  const summary = summarizeSchedule(schedule); // validates dates, shifts and starting phase
  const perShift = (kind: ShiftKind, hours: number): number =>
    kind === 'libre' ? 0 : Math.max(0, hours - DEMO_RULE.dailyOrdinaryHours[kind]);

  const hours = { diurno: 0, nocturno: 0 };
  for (const shift of schedule.cycle) {
    if (shift.kind !== 'libre') {
      hours[shift.kind] += perShift(shift.kind, shift.hours) * summary.completeCycles;
    }
  }
  for (let i = 0; i < summary.remainingDays; i += 1) {
    const shift = schedule.cycle[(schedule.startingDayInCycle - 1 + i) % schedule.cycle.length];
    if (shift.kind !== 'libre') {
      hours[shift.kind] += perShift(shift.kind, shift.hours);
    }
  }

  const dailySalary = monthlySalary / DEMO_RULE.daysPerMonth;
  const overtimeHourlyRates = {
    diurno: dailySalary / DEMO_RULE.dailyOrdinaryHours.diurno * DEMO_RULE.overtimeMultiplier,
    nocturno: dailySalary / DEMO_RULE.dailyOrdinaryHours.nocturno * DEMO_RULE.overtimeMultiplier,
  };
  const subtotals = {
    diurno: hours.diurno * overtimeHourlyRates.diurno,
    nocturno: hours.nocturno * overtimeHourlyRates.nocturno,
  };
  return {
    monthlySalary,
    dailySalary,
    overtimeHourlyRates,
    illustrativeOvertimeHours: hours,
    subtotals,
    total: subtotals.diurno + subtotals.nocturno,
  };
}
