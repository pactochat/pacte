## Tech Stack

À la ChatGPT web and app powered by React Native Expo.

- Clean architecture
- TypeScript v5.7, ESM-only, tsconfig as "bundler"
- Yarn v4 in node-modules
- React
- Fastify v5
- Expo v52 (web and native app)
- Expo Router v4 (web and native app)
- Clerk for auth (frontend and backend)

## Frontend Architecture

- Tamagui +v1.126 for web & native
- @aipacto/shared-ui-core/*: Exports Tamagui components, components, providers, icons…
- Always prioritize custom tokens from `@aipacto/shared-ui-core/theme` for colors, spacing, gaps, z-index...

## Requirements

- Try to keep the comments and docs in the code.
- For UI tasks
  - use start-end before left-right terms to support ltr/rtl when Tamagui allows it.
  - apply some accessibility best practices
