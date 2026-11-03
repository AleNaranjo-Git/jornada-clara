import type { ShiftDay, ShiftKind } from './types.ts';

export type PresetId = '222' | '42' | '61';

export const PRESETS: ReadonlyArray<{
  id: PresetId;
  name: string;
  description: string;
  kinds: readonly ShiftKind[];
}> = [
  {
    id: '222',
    name: '2 × 2 × 2',
    description: '2 diurnos · 2 nocturnos · 2 libres',
    kinds: ['diurno', 'diurno', 'nocturno', 'nocturno', 'libre', 'libre'],
  },
  {
    id: '42',
    name: '4 × 2',
    description: '4 diurnos · 2 libres (solo ejemplo)',
    kinds: ['diurno', 'diurno', 'diurno', 'diurno', 'libre', 'libre'],
  },
  {
    id: '61',
    name: '6 × 1',
    description: '6 diurnos · 1 libre (solo ejemplo)',
    kinds: ['diurno', 'diurno', 'diurno', 'diurno', 'diurno', 'diurno', 'libre'],
  },
];

export function createPreset(id: PresetId): ShiftDay[] {
  const found = PRESETS.find((preset) => preset.id === id);
  if (!found) throw new Error(`Preset desconocido: ${id}`);
  return found.kinds.map((kind, index) => ({
    id: `${id}-${index + 1}`,
    kind,
    hours: kind === 'libre' ? 0 : 12,
  }));
}
