## Tech Stack

- TypeScript 5.7, ESM-only
- Yarn v2 (node-modules), Turborepo v2
- Vite v6, Expo v52, Effect 3.12
- PowerSync for local-first functionality (no login required)

## Frontend Architecture

- Tamagui +v1.121 for Web & React Native
- Package structure:
  - @xiroi/shared-ui-core: Exports Tamagui components with custom tokens
  - @xiroi/shared-ui-components: Reusable component library
- Always prioritize custom tokens from shared-core for colors, spacing, gap, z-index

## Repository Structure

- Hierarchical directory listing
- Each file includes path and full code content
- Timestamp of generation included in metadata

## Requirements

- Try to keep the comments
