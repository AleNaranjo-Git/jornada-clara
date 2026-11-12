import type {
  PreviewDay,
  ScheduleRequest,
  ScheduleSummary,
  ShiftCounts,
  ShiftDay,
  ShiftKind,
} from './types.ts';

const ONE_DAY_MS = 86_400_000;
const KINDS: readonly ShiftKind[] = ['diurno', 'nocturno', 'mixto', 'libre'];

/**
 * Interpreta YYYY-MM-DD como fecha CALENDARIO, no como hora local.
 * Se usa UTC para evitar fallos por cambios de huso horario / DST.
 */
export function parseCalendarDate(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Las fechas deben tener el formato YYYY-MM-DD.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 100 || year > 9999) throw new Error('El año está fuera de rango.');
  const result = Date.UTC(year, month - 1, day);
  if (new Date(result).toISOString().slice(0, 10) !== value) {
    throw new Error('Se indicó una fecha calendario inexistente.');
  }
  return result;
}

export function countInclusiveDays(startDate: string, endDate: string): number {
  const start = parseCalendarDate(startDate);
  const end = parseCalendarDate(endDate);
  if (end < start) throw new Error('La fecha final debe ser igual o posterior a la inicial.');
  return Math.round((end - start) / ONE_DAY_MS) + 1;
}

function validateCycle(cycle: readonly ShiftDay[], startingDayInCycle: number): void {
  if (cycle.length === 0) throw new Error('El ciclo debe tener al menos un día.');
  if (!Number.isInteger(startingDayInCycle) || startingDayInCycle < 1 || startingDayInCycle > cycle.length) {
    throw new Error('El día inicial debe estar dentro del ciclo.');
  }
  for (const shift of cycle) {
    if (!KINDS.includes(shift.kind)) throw new Error('Existe un tipo de turno no reconocido.');
    if (!Number.isFinite(shift.hours) || shift.hours < 0 || shift.hours > 24) {
      throw new Error('Las horas programadas deben estar entre 0 y 24.');
    }
    if (shift.kind === 'libre' && shift.hours !== 0) {
      throw new Error('Un día libre debe tener 0 horas programadas.');
    }
    if (shift.kind !== 'libre' && shift.hours === 0) {
      throw new Error('Un turno trabajado debe tener al menos una hora.');
    }
  }
}

/**
 * Cuenta turnos por patrón repetitivo, INCLUYENDO el último ciclo incompleto.
 * No aplica recargos salariales, feriados ni reglas de reconocimiento de extras.
 */
export function summarizeSchedule(request: ScheduleRequest): ScheduleSummary {
  const { startDate, endDate, cycle, startingDayInCycle } = request;
  validateCycle(cycle, startingDayInCycle);
  const totalDays = countInclusiveDays(startDate, endDate);
  const cycleLength = cycle.length;
  const completeCycles = Math.floor(totalDays / cycleLength);
  const remainingDays = totalDays % cycleLength;
  const counts: ShiftCounts = { diurno: 0, nocturno: 0, mixto: 0, libre: 0 };
  let scheduledHours = 0;
  const scheduledHoursByKind: Record<ShiftKind, number> = { diurno: 0, nocturno: 0, mixto: 0, libre: 0 };

  // Cada ciclo completo contiene todos los turnos una vez, independientemente de la fase.
  for (const shift of cycle) {
    counts[shift.kind] += completeCycles;
    scheduledHours += shift.hours * completeCycles;
    scheduledHoursByKind[shift.kind] += shift.hours * completeCycles;
  }

  // Los días sobrantes comienzan en la posición del ciclo asignada al inicio.
  const zeroBasedStart = startingDayInCycle - 1;
  for (let offset = 0; offset < remainingDays; offset += 1) {
    const shift = cycle[(zeroBasedStart + offset) % cycleLength];
    counts[shift.kind] += 1;
    scheduledHours += shift.hours;
    scheduledHoursByKind[shift.kind] += shift.hours;
  }

  return {
    totalDays,
    cycleLength,
    completeCycles,
    remainingDays,
    counts,
    scheduledHours,
    scheduledHoursByKind,
  };
}

/** Obtiene los primeros días de un período para una vista preliminar. */
export function previewSchedule(request: ScheduleRequest, limit = 12): PreviewDay[] {
  validateCycle(request.cycle, request.startingDayInCycle);
  const totalDays = countInclusiveDays(request.startDate, request.endDate);
  const start = parseCalendarDate(request.startDate);
  const maxDays = Math.min(totalDays, Math.max(0, Math.floor(limit)));
  return Array.from({ length: maxDays }, (_, i) => {
    const cycleIndex = (request.startingDayInCycle - 1 + i) % request.cycle.length;
    return {
      date: new Date(start + i * ONE_DAY_MS).toISOString().slice(0, 10),
      cyclePosition: cycleIndex + 1,
      shift: request.cycle[cycleIndex],
    };
  });
}
