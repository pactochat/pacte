# Contributing to Pacte Xat

Thank you for your interest in contributing to Pacte Xat! This guide will help you get started and understand our development workflow and requirements.

## Prerequisites

- **Node.js**: v22 or higher
- **Yarn**: v4 or higher (we use [Yarn v4](https://yarnpkg.com/) in node-modules mode)
- **TypeScript**: All code is written in TypeScript (v5.7+)

You can check your versions with:

```sh
node --version
yarn --version
```

## Monorepo Structure & Workspaces

Pacte Xat uses a monorepo managed with Yarn workspaces. Each package/app has its own scripts. To run scripts for a specific package, use:

```sh
yarn workspace <package> <script>
```

**Examples:**

- Start the Expo app (web/native):

  ```sh
  yarn workspace @aipacto/apps-expo start
  ```

- Start the Fastify server:

  ```sh
  yarn workspace @aipacto/apps-server start
  ```

- Build a shared package:

  ```sh
  yarn workspace @aipacto/shared-ui-core build
  ```

## Pre-commit Checks

When you commit staged files, several automated checks will run (see `lefthook.yml`):

- **Linting**: Code style and formatting
- **Dependency Version Consistency**: Ensures all packages use compatible versions
- **Type Checking**: Validates TypeScript types
- **Secret Scanning**: Prevents committing secrets
- **Path Generation**: Updates TypeScript path mappings

If any check fails, your commit will be blocked. **You must fix all errors before committing.**

## Coding Standards

- Follow Clean Architecture and DDD principles (bounded contexts)
- Use TypeScript for all code (frontend and backend)
- For UI: Use Tamagui, Material Design 3, and custom tokens from `@aipacto/shared-ui-core/theme`
- Add new UI text to the appropriate i18n files (e.g., `common.json`)
- Prefer start/end over left/right for layout (LTR/RTL support)
- Apply accessibility best practices
- Keep code and comments clear and concise

## Questions?

Feel free to open an issue or discussion on GitHub if you have questions or need help getting started!
