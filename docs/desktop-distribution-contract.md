<!-- drift-guard: status=plan -->
# Desktop distribution contract

Status: **plan**. This document describes the intended framework-agnostic shape of
every `@owdproject/<framework>-desktop` distribution. It is not yet enforced for all
distributions: `react-desktop` is still an early scaffold, and the shared skeleton
now exists locally at `desktop-template/` but is not yet published as
`owdproject/desktop-template` nor integrated into the CLI. Remove the `status=plan`
marker once the distributions conform and the guards run in CI.

This contract is intentionally independent of any adapter. Engine behavior lives in
[`behavioral-contract.md`](./behavioral-contract.md); framework discovery and
configuration APIs live in the owning adapter (for example `@owdproject/nuxt`,
`@owdproject/react`).

## 1. Two pipelines, never confused

| Pipeline | Input | Output | Owner |
|---|---|---|---|
| **Generated starter** — the project an end user gets | the starter blueprint + the host's structural files + generated manifests | the distribution's `template/` | `@owdproject/cli` (`generateTemplate`) |
| **Desktop distribution** — the `*-desktop` repository itself | the shared `desktop-template` skeleton + a framework layer | `nuxt-desktop`, `react-desktop`, … | the distribution repository |

Both are *hosts*: they compose extensions around the engine, they are not extensions.

### Provenance of a generated starter (`template/`)

The generator copies the blueprint first and then whitelists a few files from the
host's development desktop. For `@owdproject/nuxt-desktop` this maps to:

| Starter file | Source |
|---|---|
| `pnpm-workspace.yaml`, `AGENTS.md`, `README.md`, `.gitignore`, `LICENSE`, `.owd/settings.json`, `presets/*`, `scripts/prepare-stubs.mjs`, `tsconfig.json`, `.gitkeep` | blueprint (verbatim) |
| `desktop/nuxt.config.ts`, `desktop/desktop.config.ts`, `desktop/app/*`, `desktop/i18n/*` | blueprint |
| `desktop/tsconfig.json`, `desktop/tsconfig.app.json`, `desktop/tsconfig.spec.json`, `desktop/.npmrc` | distribution's development `desktop/` (whitelist) |
| `tsconfig.base.json`, `.editorconfig`, `.npmrc`, `.prettierrc`, `.prettierignore` (and `nx.json` when present) | repository root |
| root `package.json` | generated from the blueprint's `root-package.json` + npm versions |
| `desktop/package.json` | generated from the CLI's `STARTER_DESKTOP_DEPS` list |

**Current pitfall.** The blueprint ships a `desktop/` tree and the development
distribution also has a `desktop/`. Only the blueprint's `desktop.config.ts`,
framework config and `app/` ever reach the starter; the development host contributes
just `tsconfig*.json` and `.npmrc`. The development host is therefore *not* "the
starter plus extras" — the two can drift silently. This contract removes the
overlap by making `desktop/` a single templated shape (see §3) so the development
host and the starter are two filled instances of one source.

## 2. Distribution layout

A desktop distribution collects extensions from convention directories and composes
them into a ready-to-use workspace:

```
<framework>-desktop/
├── apps/                  # kind: app   → @owdproject/<framework>-app-*
├── modules/               # kind: module → @owdproject/<framework>-module-*
│                          # (monorepos keep these under packages/*)
├── themes/                # kind: theme → @owdproject/<framework>-theme-*
├── plugins/               # optional workspace slot
├── presets/               # demo/preset data for playgrounds
├── desktop/               # the host: framework config + desktop.config.ts + app entry
├── template/              # generated starter (produced by the CLI, do not hand-edit)
├── pnpm-workspace.yaml
├── .owd/settings.json
└── scripts/               # contract guards and repo tooling
```

`DESKTOP_EXTENSION_DIRS` defaults to `{ apps, modules, themes }` and the monorepo
additionally exposes `packages` as a module slot (`packages/nuxt/src/kit/authoring.ts:30`,
in the monolithic checkout snapshot `archive/2026-nov/client/`).

`*=template` packages/repos are scaffolds, not extensions.

## 3. The host (`desktop/`)

The host is the only framework-bound node of the layout. Its contents are the
*target* shape: today only the Nuxt distribution has them, while the React scaffold
still wires everything in `src/App.tsx` with no `desktop.config.ts`
(`react-desktop/template/src/App.tsx`). It contains:

- the framework config (`nuxt.config.ts`, `vite.config.ts`, …), which registers the
  adapter;
- the declarative composition file;
- the minimal application entry that renders the active theme.

The declarative composition file is `desktop.config.ts` for the Nuxt adapter. Its
name is defined by the adapter, not universally by core; the Nuxt adapter also still
loads the legacy filename `owd.config.ts` with a deprecation warning
(`packages/nuxt/src/kit/authoring.ts` `LEGACY_DESKTOP_CONFIG_FILENAME`, in the
monolithic checkout snapshot `archive/2026-nov/client/`). Primary fields:

| Field | Meaning |
|---|---|
| `theme` | the theme package that owns the visual shell |
| `modules` | extra adapter modules (fs, persistence, …) |
| `apps` | desktop applications to load |

The Nuxt `DesktopConfig` type also accepts `coreVersion` and arbitrary extra keys
(`packages/nuxt/src/types/index.ts:80-88`, same snapshot).

`modules` is a list of package names or local paths — **not** a directory-discovery
setting. Discovery and loading are owned by the adapter; core only describes the
declarative surface.

## 4. Naming

There are two tiers. **Official** packages are maintained in the `owdproject`
GitHub org and use the `@owdproject/` scope. **Community / third-party** packages
use the unscoped `owd-` prefix: the `owd-` prefix is the public signal that a
package targets Open Web Desktop. Both follow the same framework-first shape
`<prefix><framework>-<kind>-<name>`.

| Artifact | Official (`@owdproject/…`) | Community (`owd-…`) | Is an extension? |
|---|---|---|---|
| Engine | `@owdproject/core` | — | no |
| Framework binding | `@owdproject/<framework>` | — | no |
| Desktop distribution | `@owdproject/<framework>-desktop` | `owd-<framework>-desktop` | no |
| Starter scaffold | `@owdproject/<framework>-template` / `template/` | `owd-<framework>-template` | no |
| App | `@owdproject/<framework>-app-*` | `owd-<framework>-app-*` | yes |
| Module | `@owdproject/<framework>-module-*` | `owd-<framework>-module-*` | yes |
| Theme | `@owdproject/<framework>-theme-*` | `owd-<framework>-theme-*` | yes |
| Kit | `@owdproject/<framework>-kit-*` | `owd-<framework>-kit-*` | yes |

A package whose source is not in the `owdproject` org **must** use the community
form (for example the win95, win11 and gnome themes, whose source is in the
`dxlliv` org, become `owd-nuxt-theme-win95`, `owd-nuxt-theme-win11`,
`owd-nuxt-theme-gnome`, `owd-react-theme-win95`, …). This keeps the scope honest:
`@owdproject/` means "maintained in the OWD org", `owd-` means "for OWD".

The deprecated **unscoped `nuxt-desktop`** package must never be imported or
declared as a dependency.

### Publishing policy

- **Only sources that live under the `owdproject` GitHub org may be published to
  npm.** Anything whose source repository is elsewhere uses the community `owd-`
  name, is never published, and never appears as an npm dependency of a starter,
  theme, or distribution — consume it from its local, workspace or git source.
- A community package never ships a `publishConfig`; it ships with
  `"private": true` if it is a workspace member.
- The React95 kit is the one intended exception: its repository moves into the
  `owdproject` org, so it stays `@owdproject/react-kit-react95` and is publishable.
- Publishing (or deprecating/unpublishing) is a separate, explicitly authorized
  step; it is not part of local verification.

## 5. Ownership map — where each thing lives

This is the schema that decides every "does this go in core?" question.

| Concern | Owner |
|---|---|
| Engine state, lifecycle, geometry, pointer math | `core` |
| Contract (target): distribution shape, composition-file surface, naming, workspace rules | `core` (this document) |
| Distribution skeleton (collector dirs, host scaffold, workspace, presets) | `desktop-template` |
| Framework config, adapter registration, entry point | the distribution (`*-desktop`) |
| Config loading + extension discovery/validation | the adapter (`@owdproject/<framework>`) |
| Extension authoring contract for a framework | the adapter's docs |
| Starter generation, package add/remove, template resolver | `@owdproject/cli` |
| Framework starter blueprint (framework-specific starter files) | the distribution it serves |
| Framework-agnostic parts of the starter | `desktop-template` |
| Contract guards: playground isolation, legacy-desktop ban | `desktop-template` |
| Documentation governance (doc/code drift guard) | each repository / shared tooling |
| Framework build stubs, playground sync (Nuxt `nuxt-module-build`) | the framework distribution |
| Cross-repo ecosystem maintenance | tooling, not core |

Explicit non-goals for core: no framework components, no reactive stores, no
framework configuration, no package discovery, no starter blueprint.

## 6. Contract enforcement

These guards encode rules that apply to **every** distribution and extension, and
ship with the contract skeleton (`owdproject/desktop-template`) rather than inside one
framework repository:

- `check-playground-isolation` — published `@owdproject/*` packages must not pull
  demo apps; `playground/` must be private and excluded from `files`.
- `check-legacy-desktop` — block the deprecated unscoped `<framework>-desktop`
  package while allowing `@owdproject/<framework>-desktop`.

Adding a new framework distribution must reuse these guards, not re-implement them.

**Not a contract guard:** `check-doc-symbols` (doc/code drift) is repository
governance, not a distribution rule. It is not shipped in the skeleton because it
depends on a repository's own symbol corpus and self-check; each repository
instantiates its own variant and owns its `doc-symbols.allow.json`.

## 7. Decisions

1. **`desktop-template` location** — **decided**: a dedicated repository,
   `owdproject/desktop-template`, holding the framework-agnostic skeleton. A local
   skeleton now exists at `desktop-template/` in the workspace, pending publication
   and integration into the CLI.
2. **`DesktopExtensionMeta`** — **decided**: core describes the *contract*; the
   adapter owns the operational *type and validation* and the discovery. No minimal
   type is promoted to core.
3. **`nuxt-desktop` scope** — today it is both a distribution and the ecosystem
   monorepo (git submodules `packages/core`, `packages/cli`, `themes/nuxt-theme` —
   `.gitmodules:1-10` — plus ordinary directories `scripts/`, `dev-blog/`). Decide
   whether those are scorporated before deriving it from `desktop-template`.
4. **Starter blueprint home** — move the framework starter blueprint into its
   distribution repository, with the framework-agnostic portion supplied by
   `desktop-template`.
5. **Naming** — `desktop-template` (`owdproject/desktop-template`) is the
   framework-agnostic skeleton. The `angular` family name is still to be aligned when
   that distribution is built.
