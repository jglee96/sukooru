# Release Process

This repository publishes packages from `main` with Changesets.

## What happens on merge to `main`

If a merged PR includes a `.changeset/*.md` file:

1. GitHub Actions runs the `Release` workflow on the `main` push.
2. The workflow runs `pnpm version-packages`.
3. The workflow commits the version bumps back to `main` as:
   - `chore(release): publish packages [skip ci]`
4. The workflow runs `pnpm release`.
5. `changeset publish` publishes any unpublished package versions to npm and creates git tags.
6. The workflow pushes the release commit and tags.
7. The workflow creates a GitHub Release for each new tag.

If a `main` push has no pending changesets, the workflow still runs `pnpm release` so a failed publish can be retried without creating a new version bump.

## How to ship a patch release

1. Make your package change in a PR.
2. Run:

```bash
pnpm changeset
```

3. Choose `patch`.
4. Select the package or packages that changed.
5. Write a short English summary for the release note.
6. Commit the generated `.changeset/*.md` file with the PR.
7. Merge the PR to `main`.

After merge, the workflow publishes the patch release automatically.

## How to ship minor or major releases

The process is identical. The only difference is the version type you choose in `pnpm changeset`:

- `patch`: bug fixes and small backward-compatible changes
- `minor`: backward-compatible features
- `major`: breaking changes

## Requirements

- `NPM_TOKEN` must be configured in GitHub Actions secrets.
- GitHub Actions must be allowed to push commits to `main`.
- Branch protection must not block the workflow bot from writing the release commit.

If branch protection blocks direct pushes from `GITHUB_TOKEN`, either allow GitHub Actions to bypass the restriction or switch the workflow to a PAT-based push.

## GitHub Releases vs GitHub Packages

- npm packages are published to the npm registry, not GitHub Packages.
- GitHub Releases are created automatically from the package tags generated during publish.

## Local commands

```bash
pnpm changeset
pnpm verify:sizes
pnpm verify:packages
pnpm version-packages
pnpm release
```

- `pnpm changeset`: create the release intent file for a PR
- `pnpm verify:sizes`: confirm published packages exclude sourcemaps and stay within size budgets
- `pnpm verify:packages`: run export checks and package-size verification together
- `pnpm version-packages`: apply pending version bumps locally
- `pnpm release`: build packages and publish unpublished versions

## Package size policy

- Treat npm `packed size`, `unpacked size`, and application runtime bundle size as separate measurements.
- Release builds should optimize the published package footprint first. Runtime bundle size should be checked against representative consumer imports instead of npm unpacked size alone.
