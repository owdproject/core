<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">Core</h1>
<h3 align="center">
  The kernel and runtime engine for Open Web Desktop.
</h3>

<br />

## Overview

This package provides the core runtime engine, Vue composables, and Nuxt module orchestrator for Open Web Desktop. It manages the boot sequence, application registry, and window lifecycle, laying down the foundation for themes and desktop applications to operate in a unified browser-based desktop environment.

## Installation

```bash
pnpm add @owdproject/core
```

## Features

- **Nuxt Orchestration**: Integrates seamlessly as a Nuxt module to structure themes, modules, and apps.
- **Window Management**: Handles window focus, Z-index ordering, dragging, resizing, and lifecycles.
- **State Management**: Provides Pinia-based stores for workspace configurations, active processes, and user settings.
- **Composition API**: Exposes core composables such as `useApplicationManager`, `useWindowManager`, and `useDesktopConfig`.

## Usage

In your Nuxt configuration file (`nuxt.config.ts`), register `@owdproject/core` as a module:

```typescript
export default defineNuxtConfig({
  modules: [
    '@owdproject/core'
  ]
})
```

Configure your desktop options in a `desktop.config.ts` file in the root of your project:

```typescript
import { defineDesktopConfig } from '@owdproject/core'

export default defineDesktopConfig({
  theme: '@owdproject/theme-nova',
  apps: [
    '@owdproject/app-about'
  ],
  modules: []
})
```

## License

This package is released under the [MIT License](LICENSE).
