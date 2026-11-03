/** Una unidad del ciclo corresponde a UN día calendario. */
export type ShiftKind = 'diurno' | 'nocturno' | 'libre';

export type ShiftDay = Readonly<{
  id: string;
  kind: ShiftKind;
  /** Duración programada. No representa horas extra reconocidas legalmente. */
  hours: number;
}>;

export type ScheduleRequest = Readonly<{
  startDate: string; // ISO local YYYY-MM-DD
  endDate: string; // ISO local YYYY-MM-DD, inclusiva
  cycle: readonly ShiftDay[];
  /** Posición del ciclo correspondiente al primer día del período; base 1. */
  startingDayInCycle: number;
}>;

export type ShiftCounts = Record<ShiftKind, number>;

export type ScheduleSummary = Readonly<{
  totalDays: number;
  cycleLength: number;
  completeCycles: number;
  remainingDays: number;
  counts: ShiftCounts;
  scheduledHours: number;
}>;

export type PreviewDay = Readonly<{
  date: string;
  cyclePosition: number;
  shift: ShiftDay;
}>;
