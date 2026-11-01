# @owdproject/core — agent entry point

This guidance applies to this engine repository only. It is not loaded transitively when another repository imports the package. Adapters and extensions need their own entry point linking to the applicable contract.

- Read [the behavioral contract](docs/behavioral-contract.md) before changing engine behavior.
- Keep framework components, reactive stores, Nuxt configuration and package discovery in their owning adapters. Core owns framework-independent state, lifecycle and geometry.
- Preserve public package exports and existing user changes. Confirm behavior in source before documenting it; distinguish current guarantees from proposed changes.
- Do not add the deprecated unscoped `nuxt-desktop` dependency/import. `@owdproject/nuxt-desktop` is the allowed Nuxt distribution; neither distribution belongs in the engine dependency graph.
- Use engine/TypeScript/XState documentation tools when relevant. Nuxt/Vue/React tooling is for the corresponding adapter repository.
- Verify changes with the existing package build where appropriate. Do not publish to public npm for local verification.
