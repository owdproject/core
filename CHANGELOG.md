## v3.5.0


### 🚀 Enhancements

- **window:** Separate windowTitle override from application title ([c73d46c](https://github.com/owdproject/core/commit/c73d46c))
- Center windows horizontally by default and add comments ([3c071bf](https://github.com/owdproject/core/commit/3c071bf))
- **core:** Add autoStartPlaygroundApps utility and update theme obligations ([92eaacc](https://github.com/owdproject/core/commit/92eaacc))
- Add hasDesktopModule utility ([ddb3cbf](https://github.com/owdproject/core/commit/ddb3cbf))

### 🩹 Fixes

- **core:** Drop persisted store id migration and decouple shell init ([f4c82d6](https://github.com/owdproject/core/commit/f4c82d6))
- **core:** Center playground windows using measured DOM bounds ([fdd254f](https://github.com/owdproject/core/commit/fdd254f))
- **core:** Resolve async configKey using getMeta ([a9fcebd](https://github.com/owdproject/core/commit/a9fcebd))

### 💅 Refactors

- **core:** Center windows pre-open using workArea and config size ([b5551af](https://github.com/owdproject/core/commit/b5551af))

### 📖 Documentation

- Clarify kit-tailwind vs kit-primevue for apps and themes ([55174fb](https://github.com/owdproject/core/commit/55174fb))
- Document setupDesktopDialogProvider and theme ConfirmDialog hosts ([f3b37fa](https://github.com/owdproject/core/commit/f3b37fa))
- Document CI checkout pattern and playground launch conventions ([df8802c](https://github.com/owdproject/core/commit/df8802c))
- Expand PLAYGROUND validate table and app alignment checklist ([36363fc](https://github.com/owdproject/core/commit/36363fc))

### 🏡 Chore

- **core:** Dismantle nx configuration and clean up ([8962ff3](https://github.com/owdproject/core/commit/8962ff3))

## 3.4.1 (2026-06-09)

### 🚀 Features

- Pinia store ids use `desktop/*` and `desktop/application/*` instead of legacy `owd/desktop/*` and `owd/application/*`.

### 📚 Documentation

- Document Pinia store id changes in `MIGRATION_3.4.md` and `DESKTOP_KERNEL.md`.

## 3.4.0 (2026-06-10)

### ⚠️ Breaking Changes

- Core no longer installs PrimeVue or Tailwind. Use `@owdproject/kit-primevue` in themes; register Tailwind content via `registerTailwindPath` / `registerThemeTailwindPath` from the kit.
- Headless explorer and ZenFS live in `@owdproject/module-fs`; optional PV explorer UI in `@owdproject/kit-primevue`.
- Nuxt module `configKey` is `desktop` (was `owd`). App plugins should use `desktop-<slug>-register` (legacy `owd-<slug>-register` is rejected by validate).

### 🚀 Features

- `validateModule` accepts `defineDesktopModule` / `defineDesktopTheme`; infrastructure playbook for `@owdproject/kit-primevue`.
- Nx install executors resolve `desktop.config.ts` with `owd.config.ts` fallback.

### 📚 Documentation

- Add `MIGRATION_3.4.md` (import paths, Tailwind contract, module naming).
- Ship `DESKTOP_KERNEL.md` and migration guides in the npm package.

## 3.3.2 (2026-06-01)

### 🚀 Features

- Add `defineDesktopModule`, `defineDesktopTheme`, `setDesktopExtensionConfig`, `installDesktopPackage` (core bootstrap), and `mergeDesktopExtensionConfig` for extension/theme authoring.
- Add runtime composables: `useDesktopConfig`, `useDesktopExtension`, `hasDesktopModule`, `hasDesktopApp`, `hasDesktopExtension`.
- Extension packages augment `DesktopConfig` via `types/desktop.d.ts` (`terminal`, `fs`, …) instead of hard-coding keys in core.

### 🩹 Fixes

- Merge the full `desktop.config.ts` export into `runtimeConfig.public.desktop` (including `theme`, `apps`, `modules`, and extension namespaces).
- Remove misleading “unknown desktop key” warnings for valid extension keys (`fs`, `terminal`, custom app namespaces); only warn keys that look like Nuxt options (`ssr`, `vite`, …).
- `app-terminal` no longer overwrites `desktop.config` `terminal` with module defaults only; UI reads `public.desktop.terminal`.

### 📚 Documentation

- Update `desktop-config` setup doc and `DESKTOP_KERNEL.md` for 3.3.2 merge and API (supersedes 3.3.0 `splitDesktopUserConfig` / allowlist description).
- Add migration guide for themes, apps, and modules (`docs/content/6.setup/5.migrate-packages-3.3.2.md`, `MIGRATION_3.3.2.md`).

### 🔧 Internal

- Remove `splitDesktopUserConfig` (was not a public export).

## 3.3.0 (2026-05-31)

### ⚠️ Breaking Changes

- Rename kernel Vue components from `Core*` to `Desktop*` (e.g. `CoreDesktop` → `DesktopCore`, `CoreWindow` → `DesktopWindow`). Themes must update their templates.
- Remove explorer from kernel: `DesktopExplorer*` components, `useDesktopExplorerStore`, and `explorer` slice in `useDesktopStore` moved to `@owdproject/kit-fs` (`useExplorerStore`, `KitFsExplorer*`).
- `desktop.config.ts` is no longer spread onto `_nuxt.options`; only `runtimeConfig.public.desktop` / `appConfig.desktop` receive shell keys.

### 🚀 Features

- Add `splitDesktopUserConfig` with allowlist warnings for misconfigured keys.
- Shell config merge uses `defu` (UnJS) instead of custom `deepMerge` / `mergeDesktopShell`.
- Add window manager contract tests and [`DESKTOP_KERNEL.md`](DESKTOP_KERNEL.md).

## 3.2.0 (2026-05-22)

### 🚀 Features

- Workspace edge drop helpers moved to `@owdproject/kit-theme` (`useWorkspaceEdgeDrop`).
- Desktop config and module playground validation aligned with Nuxt 4 module authoring.

## 3.1.4 (2025-05-22)

### 🚀 Features

- Allow apps to have a menu ([4bfea74](https://github.com/owdproject/client/commit/4bfea74))
- Add methods to better handle window changes ([54d1346](https://github.com/owdproject/client/commit/54d1346))
- Check if owd.config.ts is available and valid ([4920302](https://github.com/owdproject/client/commit/4920302))
- Add fit-parent to CoreWindow.vue ([59e068c](https://github.com/owdproject/client/commit/59e068c))
- Add focus() to WindowController and set methods as public (deprecate actions) ([710f7be](https://github.com/owdproject/client/commit/710f7be))
- Add owd global command ([f98c74c](https://github.com/owdproject/client/commit/f98c74c))
- Add useClipboardFs.ts composable ([cf934f4](https://github.com/owdproject/client/commit/cf934f4))
- Add window utils in ApplicationController.ts ([ffc97d0](https://github.com/owdproject/client/commit/ffc97d0))
- Export most used functions from core ([6635af7](https://github.com/owdproject/client/commit/6635af7))
- Merge owd.config.ts with nuxt.config.ts in module.ts ([069243c](https://github.com/owdproject/client/commit/069243c))
- Implement basic owd.config.ts ([d052552](https://github.com/owdproject/client/commit/d052552))
- Rewrite project ([cbbd45d](https://github.com/owdproject/client/commit/cbbd45d))

### 🩹 Fixes

- Add key on CoreApplicationWindowsRender v-for ([d2e8e3c](https://github.com/owdproject/client/commit/d2e8e3c))
- Check if entries property is set before normalizing in utilApp.ts ([6092c33](https://github.com/owdproject/client/commit/6092c33))
- Add missing min-width ([aa0c1b5](https://github.com/owdproject/client/commit/aa0c1b5))
- Minor improvements ([7f79208](https://github.com/owdproject/client/commit/7f79208))
- Fix imports ([44740cd](https://github.com/owdproject/client/commit/44740cd))
- Set window starting positionZ to 0 ([b99352e](https://github.com/owdproject/client/commit/b99352e))
