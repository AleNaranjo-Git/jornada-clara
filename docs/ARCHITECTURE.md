# Architecture

The application is frontend-only: React handles inputs and results, while the calculation code is kept in plain TypeScript modules.

| Path | Responsibility |
|---|---|
| `src/domain/cycles/` | Define shift types and presets; count dates, cycles, partial cycles and scheduled hours |
| `src/domain/pay/estimate.ts` | Apply the current illustrative overtime formula to a cycle summary |
| `src/i18n/translations.ts` | English/Spanish text and translated validation messages |
| `src/App.tsx` | Form state, result rendering, preview and browser print action |
| `src/styles.css` | Responsive layout and print-specific styles |

## Calendar behavior

Date ranges include both endpoints. Dates are parsed as calendar dates using UTC to avoid daylight-saving and local timezone shifts. A starting position can be selected for any cycle, including a period that ends partway through a cycle.

## Pay simulation

The current model divides monthly salary by 30, then calculates day/night hourly amounts using divisors of 8 and 6 and a multiplier of 1.5. It treats scheduled hours above those respective thresholds as **illustrative** overtime. Intermediate values use JavaScript `number`; amounts are rounded only for display.

Those assumptions are **not** a complete interpretation of Costa Rican labor law. In particular, the application does not yet handle mixed shifts, special schedules, breaks, holiday rules, salary changes or payments already made. Future legally validated calculations should live in separate modules with corresponding test cases, rather than being added as conditions in React components.

## Reports and privacy

The print button opens the browser's print dialog; users may select “Save as PDF.” It does not generate or store a server-side document. The app has no backend and stores only the language preference locally.
