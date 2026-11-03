# Development notes

Jornada Clara is a bilingual React / TypeScript app for Costa Rican shift-cycle calculations.

- Read the relevant files before editing. Keep changes focused; don't rewrite unrelated components.
- Keep scheduling logic in `src/domain/cycles/` and pay calculations in `src/domain/pay/`. React components should only use their results.
- Add user-facing copy in **both** languages in `src/i18n/translations.ts`.
- Keep mobile layout and print styles working.
- The overtime calculation is an **illustrative model**, not legally verified. Do not introduce or claim validated legal rules without approved test cases and sources.
- Add or update tests for changes to calculation logic. Run `npm run check` and report any failures.
- Use feature branches from `develop` and pull requests back into `develop`; release changes go to `main`.
- Do not commit, push, merge, tag or deploy without explicit approval.
- Keep personal records and client information out of the repository and tests.

When handing off a change, describe what changed, what was tested and anything left unresolved.
