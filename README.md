<div align="center">

  <h1>@owdproject/core</h1>

  <p>
    <strong>A TypeScript runtime for web desktop interfaces.</strong><br /><br />
    A deterministic, framework-independent runtime for multi-window workspaces,<br />
    XState v5 process orchestration, magnetic snap geometry, and W3C Pointer math.
  </p>

  <br />

  <p>
    <a href="https://npmjs.com/package/@owdproject/core"><img src="https://img.shields.io/npm/v/@owdproject/core/alpha.svg?style=flat&colorA=020420&colorB=00DC82" alt="npm version" /></a>
    <a href="https://npm.chart.dev/@owdproject/core"><img src="https://img.shields.io/npm/dm/@owdproject/core.svg?style=flat&colorA=020420&colorB=00DC82" alt="npm downloads" /></a>
    <a href="https://github.com/owdproject/core/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-00DC82.svg?style=flat&colorA=020420&colorB=00DC82" alt="License" /></a>
  </p>

  <p>
    <a href="#overview">Overview</a> ·
    <a href="#architecture--capabilities">Architecture</a> ·
    <a href="#quick-start">Quick Start</a> ·
    <a href="#desktop-subsystems-createdesktop">Subsystems API</a> ·
    <a href="#official-framework-adapters">Adapters</a>
  </p>

</div>

---

## Overview

`@owdproject/core` (`4.0.0-alpha.0`) is the pure TypeScript & XState v5 engine behind [Open Web Desktop](https://github.com/owdproject/nuxt-desktop).

Completely decoupled from any UI framework, it exposes `createDesktop()`—an isolated desktop kernel encapsulating window management, application lifecycle states (`PID`, `SIGSTOP`, `SIGCONT`, `SIGTERM`, `SIGKILL`), virtual workspaces, CLI command parsing, a 19-event `hookable` lifecycle bus, a pub/sub IPC bus, and a Pointer Events drag/resize engine.

---

## Architecture & Capabilities

* **Zero UI Framework Dependencies** — Pure TypeScript, `xstate` v5, `hookable`, `nanoid`, `getopts`, and `shellwords`. Runs identically in browsers, SSR, and Node.js test suites.
* **Frozen Immutable Snapshots (`Object.freeze`)** — Every window, process, and workspace transition emits a frozen snapshot compatible with React `useSyncExternalStore`, Vue `shallowRef`, Svelte stores, and Angular signals.
* **Deterministic XState v5 Machines** — `windowMachine` and `applicationMachine` prevent invalid state combinations across maximization, snapping, minimization, and process suspension.
* **W3C Pointer Engine & `IframeGuard`** — Native `setPointerCapture` drag and 8-directional resize math with magnetic snap-zone detection (`left-half`, `right-half`, `maximize`, corners) and automatic `<iframe>` pointer-event protection.
* **Cancellable Runtime Hooks** — Intercept and cancel `app:before-launch`, `window:before-open`, `command:before-exec`, or `workspace:before-switch` via `desktop.hooks`.

---

## Quick Start

Install `@owdproject/core`:

```bash
pnpm add @owdproject/core@4.0.0-alpha.0
```

Create an isolated desktop instance with `createDesktop()`:

```ts
import { createDesktop } from '@owdproject/core'

const desktop = createDesktop({
  workspaces: ['ws-main', 'ws-dev'],
  activeWorkspace: 'ws-main',
  workarea: { x: 0, y: 32, width: 1920, height: 1048 },
})

// Spawn a window
const win = desktop.windows.createWindow({
  id: 'terminal-1',
  model: 'terminal',
  config: {
    title: 'Terminal',
    size: { width: 680, height: 440, minWidth: 320, minHeight: 220 },
    position: { x: 120, y: 80 },
    resizable: true,
    maximizable: true,
    minimizable: true,
  },
})

// Snap to left half of workarea
win.setLayout('left-half', desktop.workspaces.workarea)

// Subscribe to immutable desktop snapshots
desktop.subscribe((snapshot) => {
  console.log('Active windows:', snapshot.windows.length)
})
```

---

## Desktop Subsystems (`createDesktop()`)

| Subsystem | Type | Responsibility |
| :--- | :--- | :--- |
| **`desktop.windows`** | `WindowManager` | Window lookup, focus stacking, snap zones, and `tileWindows('horizontal' \| 'vertical' \| 'grid')`. |
| **`desktop.applications`** | `ApplicationManager` | Application manifest registry, `PID` allocation, and Unix signals (`suspend`, `resume`, `terminate`). |
| **`desktop.workspaces`** | `WorkspaceManager` | Virtual workspace switching, overview state, and workarea rectangle geometry. |
| **`desktop.commands`** | `DesktopCommands` | CLI command registry, tokenizer, and `exec()` dispatcher. |
| **`desktop.hooks`** | `Hookable<DesktopRuntimeHooks>` | 19 synchronous/asynchronous lifecycle hooks with `before-*` cancellation support. |
| **`desktop.ipc`** | `CoreIPCBus` | Cross-application pub/sub bus with wildcard (`*`) listener and event history ring buffer. |
| **`desktop.session`** | `{ serialize, restore }` | JSON session serialization and hydration for active windows and workspaces. |

---

## Official Framework Adapters

* **[@owdproject/nuxt](https://npmjs.com/package/@owdproject/nuxt)** — Official Nuxt & Vue 3 reactive composables and `WindowController`.
* **[@owdproject/react](https://npmjs.com/package/@owdproject/react)** — Official React 18/19 concurrent-safe hooks (`useSyncExternalStore`).
* **[@owdproject/svelte](https://npmjs.com/package/@owdproject/svelte)** — Official Svelte 4/5 `Readable` stores and pointer actions.
* **[@owdproject/angular](https://npmjs.com/package/@owdproject/angular)** — Official Angular 17+ `DesktopAdapterService` and reactive streams.
* **[@owdproject/astro](https://npmjs.com/package/@owdproject/astro)** — Official Astro multi-framework Islands and `<owd-desktop-window>` Custom Element.

---

## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2024-present, [Diego Villa (@dxlliv)](https://github.com/dxlliv) and Open Web Desktop contributors.
