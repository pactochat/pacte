# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Aipacto is an AI-powered chat platform for local and regional governments. It's built as a TypeScript monorepo using Clean Architecture and Domain-Driven Design principles, with a focus on collaborative workspaces and AI agent orchestration.

## Essential Development Commands

### Development

```bash
# Start the Fastify server
yarn server
# Or specifically: yarn workspace @aipacto/apps-server start

# Start Expo app (web)
yarn web
# Or specifically: yarn workspace @aipacto/apps-expo web

# Start Expo app (native)
yarn workspace @aipacto/apps-expo start

# Build all packages
yarn build

# Generate TypeScript path mappings (auto-run in pre-commit)
yarn generate-paths
```

### Code Quality

```bash
# Lint and format code (Biome)
yarn lint

# Type checking
yarn check-types # Or `yarn workspace @aipacto/xxxx check-types`

# Check dependency versions consistency
yarn check-deps

# Check for secrets in code
yarn check-secrets
```

## Architecture Overview

### Bounded Contexts & Packages

- **Agents**: AI agent domain logic and LangChain infrastructure
  - `packages/agents/domain` - Agent types, contracts
  - `packages/agents/infrastructure/langchain` - LangGraph-based agent implementations
- **Workspace**: Collaborative document management
  - `packages/workspace/domain` - Organizations, folders, files entities
  - `packages/workspace/infrastructure/authz` - OpenFGA authorization
  - `packages/workspace/infrastructure/storage` - File storage abstraction
- **Harvesting**: Data collection and processing
  - `packages/harvesting/domain` - Data harvesting domain
  - `packages/harvesting/infrastructure/pipeline` - Crawling/scraping pipeline
- **Shared**: Cross-cutting concerns
  - `packages/shared/domain` - Common entities, types, utilities
  - `packages/shared/ui/core` - Tamagui components, theme, icons
  - `packages/shared/ui/localization` - i18n support (cat/eng/spa)
  - `packages/shared/utils/logging` - Effect-based logging

### Applications

- **Server** (`apps/server`): Fastify API with Clerk auth, Effect, and LangChain integration
- **Expo** (`apps/expo`): Cross-platform React Native app with Expo Router v4
- **Web** (`apps/web`): Vite-based web app (TanStack Router)
- **Marketing** (`apps/marketing`): Next.js marketing site with PayloadCMS

## Key Technologies & Patterns

### Core Stack

- **TypeScript v5.8**: ESM-only, tsconfig as "bundler"
- **Effect v3.14+**: Functional programming, error handling, dependency injection
- **Yarn v4**: Workspace management in node-modules mode
- **Turbo**: Monorepo build orchestration

### Frontend

- **React 18.3.1** with **Expo v52** and **Expo Router v4**
- **Tamagui v1.126+**: Cross-platform UI with Material Design 3
- **Clerk v2.10+**: Authentication with workspace-level permissions

### Backend

- **Fastify v5**: Server framework
- **LangChain v0.3** + **LangGraph v0.2.71**: AI agent orchestration
- **OpenFGA**: Fine-grained authorization
- **PostgreSQL**: Primary database

### Key Libraries

- **Effect**: Used extensively for typed errors, dependency injection, and data transformation
- **Schema (from Effect)**: Runtime validation and type generation
- **Tamagui**: All UI components must use the design system from `@aipacto/shared-ui-core`

## Development Workflow

### Path Mapping

TypeScript paths are auto-generated from workspace configuration. Always use workspace imports like `@aipacto/package-name`.

### Pre-commit Hooks (Lefthook)

All commits trigger:

- Secret scanning
- TypeScript path generation
- Dependency consistency checks
- Type checking (main branch only)
- Biome linting and formatting

### Code Standards

- Follow Clean Architecture: domain → infrastructure → application layers
- Use Effect Schema for runtime validation
- Prefer functional programming patterns
- Place UI text in appropriate i18n files (`common.json`)
- Use start/end instead of left/right for RTL support
- Follow accessibility best practices

### Environment Requirements

- Node.js v22+
- Yarn v4+
- TypeScript v5.8.3 (enforced via resolutions)

## Common Issues

- **Build failures**: Run `yarn generate-paths` if TypeScript can't resolve workspace imports
- **Type errors**: Ensure all packages build their dependencies first with `yarn build`
- **Lint errors**: Use `yarn lint` to auto-fix most formatting issues
- **Pre-commit blocked**: All hooks must pass - fix errors before committing
