# Releasing Guide

This document describes the process for releasing new versions of `msw-ui-widget`.

## Prerequisites

- All changes must be committed using [Conventional Commits](https://www.conventionalcommits.org/) format
- All tests must pass (`npm run test`)
- All linting checks must pass (`npm run lint`)
- Code must be formatted (`npm run format:check`)

## Release Process

### 1. Ensure Everything is Ready

Before creating a release, make sure:

```bash
# Run all checks
npm run test
npm run lint
npm run type-check
npm run knip
npm run format:check
```

### 2. Choose Release Type

The release type is determined automatically based on commit messages since the last release:

- **Patch** (`0.1.0` → `0.1.1`): Bug fixes (`fix:`)
- **Minor** (`0.1.0` → `0.2.0`): New features (`feat:`)
- **Major** (`0.1.0` → `1.0.0`): Breaking changes (`feat!:` or `BREAKING CHANGE:`)

You can also force a specific version:

```bash
# Automatic (recommended)
npm run release

# Force patch version
npm run release:patch

# Force minor version
npm run release:minor

# Force major version
npm run release:major
```

### 3. Create Release

Run the release command:

```bash
npm run release
```

This will:

1. Bump the version in `package.json` and `package-lock.json`
2. Generate/update `CHANGELOG.md` based on commit messages
3. Create a git commit with the changes
4. Create a git tag for the version

### 4. Review Changes

Review the generated `CHANGELOG.md` and the commit. If everything looks good, continue.

### 5. Push to Repository

Push the release commit and tags:

```bash
git push --follow-tags
```

Or separately:

```bash
git push
git push --tags
```

### 6. Automatic Publishing

After pushing the tag, GitHub Actions will automatically:

1. **Build the package** - Verify the build succeeds
2. **Publish to npm** - Publish the new version to npm registry (requires `NPM_TOKEN` secret)
3. **Create GitHub Release** - Create a release on GitHub with changelog

**Note**: Make sure `NPM_TOKEN` secret is configured in GitHub repository settings for automatic npm publishing.

## Pre-releases

For alpha or beta releases:

```bash
# Alpha release (e.g., 0.1.1-alpha.0)
npm run release:alpha

# Beta release (e.g., 0.1.1-beta.0)
npm run release:beta
```

## Release Workflow Example

```bash
# 1. Make your changes and commit with conventional commits
git add .
git commit -m "feat: add new feature"
git commit -m "fix: fix bug in feature"

# 2. Ensure everything passes
npm run test
npm run lint

# 3. Create release (will auto-detect as minor version due to feat:)
npm run release

# 4. Review CHANGELOG.md
cat CHANGELOG.md

# 5. Push release
git push --follow-tags
```

## Commit Message Format

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semi colons, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Changes to build system or dependencies
- `ci`: Changes to CI configuration
- `chore`: Other changes that don't modify src or test files

### Examples

```bash
# Feature
git commit -m "feat: add delay configuration for mock responses"

# Bug fix
git commit -m "fix: correct delay handling in queue items"

# Breaking change
git commit -m "feat!: change API for mock configuration

BREAKING CHANGE: MockEditor now requires delay parameter"
```

## Troubleshooting

### Release Failed

If the release fails, you can:

1. Check what would happen without making changes:

   ```bash
   npm run release -- --dry-run
   ```

2. Skip hooks if needed (not recommended):

   ```bash
   npm run release -- --skip.hooks
   ```

3. Abort and start over:
   ```bash
   git reset --hard HEAD
   ```

### Wrong Version Bumped

If the wrong version was detected:

1. Reset the release:

   ```bash
   git reset --hard HEAD~1
   git tag -d v<version>
   ```

2. Force the correct version:
   ```bash
   npm run release:patch  # or :minor, :major
   ```

## Publishing to npm

### Automatic Publishing (Recommended)

After pushing the release tag, GitHub Actions will automatically publish to npm. Make sure:

1. `NPM_TOKEN` secret is configured in GitHub repository settings
2. The token has publish permissions for the package

### Manual Publishing

If you need to publish manually:

```bash
# Build the package
npm run build

# Publish (requires npm login)
npm publish --access public
```

For scoped packages or private packages, adjust the publish command accordingly.

## Version History

All version history is maintained in `CHANGELOG.md`. The format follows [Keep a Changelog](https://keepachangelog.com/) conventions.
