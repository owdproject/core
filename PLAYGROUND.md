# App and theme module playground

Checklist for `@owdproject/app-*`, `@owdproject/theme-*`, and `@owdproject/module-*` packages.

## Layout

```
package/
  src/
    module.ts          # Nuxt module (defineNuxtModule / defineDesktopModule / defineDesktopTheme)
    runtime/
      plugin.ts        # apps: defineDesktopApp + name: desktop-<slug>-register
      components/      # optional Vue UI
  playground/
    desktop.config.ts  # defineDesktopConfig({ theme, apps, modules, ... })
    nuxt.config.ts     # ssr: false, modules: ['@owdproject/core']
    package.json
  dist/module.mjs      # after dev:prepare / prepack
```

## Apps (`@owdproject/app-*`)

- `src/runtime/plugin.ts` calls `defineDesktopApp` from `@owdproject/core/kit/defineDesktopApp`
- Plugin `name`: `desktop-<slug>-register` (required for `dependsOn` ordering)
- `src/module.ts` `meta.name`: `desktop-app-<slug>`
- Tailwind utilities in Vue: `registerTailwindPath` from `@owdproject/kit-tailwind/kit/registerTailwindPath`
- `"@owdproject/kit-tailwind": "workspace:*"` in app **`dependencies`** (build-time; not replaced by the playground theme)
- Do **not** add `@owdproject/kit-primevue` to app `dependencies` — PrimeVue auto-import comes from the PV theme at runtime
- `exports["."].development: "./src/module.ts"` in `package.json` (monorepo dev without re-stubbing after every edit)
- Playground lists the app in `desktop.config.ts` `apps: ['@owdproject/app-<slug>']`
- Omit `windows.*.position` in `app.config.ts` to center on open; set explicit `size.width` / `size.height` (not only `minHeight`)

### Theme UI stack vs app Tailwind

| Concern | Package | Who declares it |
|---------|---------|-----------------|
| Tailwind content globs (`registerTailwindPath`) | `kit-tailwind` | **App** (and theme) `module.ts` + app `dependencies` |
| PrimeVue auto-import (`InputText`, `Button`, …) | `kit-primevue` | **PV theme** via `installModule('@owdproject/kit-primevue')` — not all themes |
| Nuxt UI components | `kit-nuxt-ui` | **`theme-nuxt`** — no PrimeVue |

PrimeVue markup in an app requires a PV theme at runtime. `@owdproject/theme-nuxt` does not install `kit-primevue`.

## Themes (`@owdproject/theme-*`)

- `defineDesktopTheme` from `@owdproject/core`
- **PrimeVue themes:** `installModule('@owdproject/kit-primevue')` then `registerThemeTailwindPath(nuxt, import.meta.url)` from `@owdproject/kit-tailwind/kit/registerTailwindPath`
- **Nuxt UI themes:** install `@owdproject/kit-nuxt-ui` (optional) — no PrimeVue
- `meta.name`: `desktop-theme-<slug>`

## Extension modules (`@owdproject/module-*`)

- `defineDesktopModule` with `meta.configKey` (e.g. `fs`, `terminal`)
- Module augmentation in `types/desktop.d.ts`
- Headless modules skip Tailwind registration

## Scripts (publishable packages)

| Script | Purpose |
|--------|---------|
| `dev:prepare` | `nuxt-module-build build --stub` + playground `nuxt prepare` |
| `dev` | Local playground dev server |
| `dev:generate` | Static GH Pages build (`NUXT_APP_BASE_URL=/<slug>/`) |
| `prepack` | Full `nuxt-module-build build` before npm publish |
| `validate` | `desktop validate .` |

Do **not** add a `prepare` script on publishable packages.

Lint, ESLint, and Vitest are **optional** — not required for publishable apps/themes/modules or for CI below.

## Playground auto-launch (apps)

Optional `playground/app/plugins/launch-<slug>.client.ts`:

- `dependsOn: ['desktop-app-<slug>-register']`
- Call `autoStartPlaygroundApps(nuxtApp, [{ id, entry, windowModel }])` from `@owdproject/core`
- Do **not** guard with `if (!import.meta.dev) return` — static generate and GitHub Pages need the same path

## Validate

From package root:

```bash
pnpm run dev:prepare
desktop validate .
```

From monorepo client root:

```bash
pnpm run validate:modules
```

See [`MIGRATION_3.4.md`](./MIGRATION_3.4.md) for import path changes (kit-primevue, module-fs).

## CI and GitHub Pages (standalone repos)

Use **Node 22**. For `@owdproject/app-*` / `@owdproject/theme-*` published as their own GitHub repo, prefer workflows that:

1. Checkout `owdproject/client` (workspace deps) and overlay this package under `client/apps/…`, `client/themes/…`, or `client/packages/…`
2. Checkout sibling packages the playground needs (e.g. `kit-tailwind`, `kit-primevue`, `theme-nova`, `module-fs`)
3. `pnpm install` in `client/`
4. In the package dir: `pnpm run dev:prepare` → `pnpm run validate` → `pnpm run dev:generate` with `NUXT_APP_BASE_URL=/<repo-slug>/`

**Required for CI:** `dev:prepare`, `validate`, `dev:generate` (smoke build).

**Not required:** separate lint or test jobs, `eslint`, `vitest`, or `nypm` install in the app repo alone (breaks `workspace:*`).

Minimal `ci.yml`: one job `validate-and-build` with the steps above. `pages.yml`: same build job + `deploy-pages`.

Themes/modules with a self-contained playground (no client overlay) may use a single-repo checkout when they do not depend on `workspace:*` packages.

## Desktop control panel (TUI)

Run `pnpm desktop` from the client monorepo root.

- Toggle apps/modules in the catalog (tabs `1`/`2`), pick a theme in tab `3`, then press `w` to review installs.
- Each **new** package opens an install wizard: choose **npm**, **GitHub HTTPS**, or **GitHub SSH** (when SSH auth is detected).
- Catalog columns: `[+]` add, `[-]` remove, `[*]` on desktop; `NPM` / `GIT` / `LOC` source slots; yellow publisher = untrusted.
- Sort: `o` cycle, `O` open sort picker (Updated, Name, Stars, Installed). Pending toggles affect Installed sort.
- Settings (`g`): GitHub username (fork clones), trusted orgs list, SSH test (`t`).
- CLI: `desktop add <pkg> --npm`, `--dev`, `--from <user>`, `--protocol ssh`.
