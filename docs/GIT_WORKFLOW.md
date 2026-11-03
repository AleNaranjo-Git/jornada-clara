# Git workflow

The repository uses a lightweight Git Flow approach:

- `main` — current stable demo / releases.
- `develop` — integration branch for ongoing work.
- `feature/*` and `fix/*` — focused changes created from `develop`.
- `release/*` — final testing and version changes before merging into `main`.
- `hotfix/*` — urgent fixes based on `main`, merged back into `develop` as well.

For a normal feature:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/short-name

# Make and test changes
npm run check

git add -A
git diff --cached
git commit -m "feat: describe the change"
git push -u origin feature/short-name
```

Open a pull request into `develop`, review the diff and check CI before merging. When a release is ready, create a `release/*` branch, verify it, merge it into `main` and bring the release changes back into `develop`. Tag a release on `main` when appropriate.

Use commits for meaningful changes. Avoid commits created only to manufacture a longer history.
