# Core UI Components

This package is a central library of user interface (UI) building blocks for our project. Think of it as a toolbox filled with pre-designed elements like buttons, text styles, and layout helpers, all designed to work seamlessly on both web and native mobile apps.

## What is this?

This package provides a consistent set of UI components and a shared theme (colors, fonts, spacing) for Aipacto. Its main purpose is to ensure that our application has a unified look and feel, following **Material Design 3** guidelines.

Material Design 3 is a design system created by Google that helps create high-quality, beautiful digital experiences. By using components from this package, you're helping us stick to this modern design standard.

## What's Inside?

This package offers several key things:

* **Core UI Components:** These are the fundamental, "atomic" visual elements you'll use to build screens and features. Think of them as the most basic building blocks (like atoms, rather than complex molecules). Most of these components are direct implementations or inspired by the standard components defined in Material Design 3. Examples include:
  * Buttons (`CoButtonText`, `CoButtonIcon`)
  * Input fields for forms (`CoTextField`)
  * Cards for organizing content (`CoCard`)
  * And many others for common UI needs.
* **Theming:** A predefined set of styles based on Material Design 3, which includes:
  * **Colors:** A specific palette for light and dark modes, ensuring consistency and accessibility.
  * **Typography:** Standardized fonts and text sizes for headings, body text, labels, etc.
  * **Spacing & Sizing:** Predefined values for margins, paddings, and sizes to maintain visual harmony.
* **Icons:** A collection of commonly used icons (e.g., `IconArrowLeft`, `IconSettings`).

All these are built using **Tamagui**, a UI framework that allows us to write components once and use them across both our web application and native mobile (Expo) apps.

## Why is this important for developers (even non-frontend ones)?

* **Consistency:** Ensures everyone is using the same visual elements, making the app look professional and coherent.
* **Efficiency:** Provides ready-made components, so you don't have to build common UI elements from scratch.
* **Design Standards:** Automatically applies Material Design 3 principles, so UIs are modern and user-friendly.
* **Cross-Platform:** The components are designed to work on both web and native mobile, reducing the effort to support multiple platforms.

## A Quick Look at How It's Used

If you're working on parts of the application that involve the user interface, you'll typically import components directly from this package. For example:

```tsx
import { CoButtonText, CoPage, CoText } from '@aipacto/shared-ui-core';

function MyScreen() {
  return (
    <CoPage title="Welcome">
      <CoText>This is an example page using shared components.</CoText>
      <CoButtonText onPress={() => alert('Button clicked!')}>
        Click Me
      </CoButtonText>
    </CoPage>
  );
}
```

The components like `CoPage`, `CoText`, and `CoButtonText` will automatically use the defined theme (colors, fonts, spacing) from this package.

---

This package is the foundation for our application's visual identity.
