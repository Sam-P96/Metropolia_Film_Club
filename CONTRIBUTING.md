# Contributing

For local setup, see the [README](README.md#setup).

## Rules

- Do not commit `.env` files, `node_modules/`, or build output. Only
  `*.env.example` files with placeholder values belong in the repo.
- Do not push directly to `main`. Every change goes through a branch and a
  pull request.

## Workflow

1. Update main: `git checkout main && git pull origin main`
2. Branch off main: `git checkout -b feat/short-description`
3. Make your change and run the relevant checks:
   - Frontend: `cd frontend && npm run lint && npm run build`
   - Backend: `cd backend && npm run dev` and confirm it boots
4. Push and open a PR against `main`: `git push -u origin feat/short-description`
5. Request a review and address feedback.

## Branch names

Use a type prefix and a short kebab-case description.

| Prefix      | For                                    |
|-------------|----------------------------------------|
| `feat/`     | New feature                            |
| `fix/`      | Bug fix                                |
| `chore/`    | Tooling, config, dependencies          |
| `docs/`     | Documentation only                     |
| `refactor/` | Code change that is not a feature/fix  |

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <summary in the imperative mood>
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`, `perf`.
Keep the summary under 72 characters. Add a body for context when needed.

## Pull requests

- One change per PR.
- Clear title and a description of what changed and why.
- Update the Unreleased section of [CHANGELOG.md](CHANGELOG.md) for
  user-visible changes.
- Update docs when setup or behavior changes.

## Code style

- Frontend: run `npm run lint` before pushing. Components in PascalCase,
  grouped by feature under `src/components/`.
- Backend: routes in `routes/`, handlers in `controllers/`, schemas in
  `models/`. Keep route files thin.
- A shared [.editorconfig](.editorconfig) keeps indentation and line endings
  consistent.
