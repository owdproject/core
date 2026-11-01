# Engine behavioral contract

This is the framework-independent contract for `@owdproject/core`. It describes current source and requirements for consumers, rather than promising identical behavior in every adapter.

## Ownership and current behavior

`createDesktop()` creates an isolated instance containing windows, applications, workspaces, commands, hooks, IPC, keybindings, sessions and a service registry. The host owns its lifetime and connects rendering and input. See [src/Desktop.ts:40](../src/Desktop.ts#L40).

Consumers read cached snapshots and subscribe for updates; subscriptions return an unsubscribe function and immediately deliver the current snapshot. Snapshot containers are frozen; their window/application members are live instances, not deeply immutable object graphs. Read per-instance snapshots for state and use instance/manager methods to mutate it. See [src/Desktop.ts:103](../src/Desktop.ts#L103), [src/managers/ApplicationManager.ts:111](../src/managers/ApplicationManager.ts#L111).

Application registration is keyed by `config.id`; registering an existing id returns the existing instance. Launch resolves entries/commands or a first window and awaits the before-launch hook, honoring cancellation. See [src/managers/ApplicationManager.ts:411](../src/managers/ApplicationManager.ts#L411), [src/managers/ApplicationManager.ts:177](../src/managers/ApplicationManager.ts#L177).

For singleton applications, window openings through `ApplicationInstance.openWindow` reuse and focus the existing tracked window, including concurrent launches or openings whose before-open hooks resolve at different times. The first permitted opening to create a window keeps its model, metadata and initial state; later permitted openings restore and focus that same window. A canceled before-open request returns no window and does not restore or focus a concurrently created window. Concurrent requests may each run their before-open hook, while only the actual creation emits `window:opened`; launches retain their individual launch callbacks. Non-singleton applications may open independent windows concurrently. This guarantee applies to the application API, not direct `WindowManager.createWindow` calls. See [ApplicationManager implementation](../src/managers/ApplicationManager.ts) and [regression tests](../tests/ApplicationManager.test.ts).

Closing an individual application window honors its before-close hook. Bulk close directly closes tracked windows. Termination performs bulk close and calls `onClose`; cancellation applies to ordinary termination, while `SIGKILL` bypasses that veto. Do not assume these paths have identical hook semantics. See [src/managers/ApplicationManager.ts:269](../src/managers/ApplicationManager.ts#L269), [src/managers/ApplicationManager.ts:286](../src/managers/ApplicationManager.ts#L286), [src/managers/ApplicationManager.ts:336](../src/managers/ApplicationManager.ts#L336).

The pointer API accepts DOM Pointer Events and returns cancellation functions. Calling it requires a browser interaction target; the framework adapter or host owns event wiring and cleanup. See [src/dom/pointer/DesktopPointerSession.ts:42](../src/dom/pointer/DesktopPointerSession.ts#L42).

## Consumer responsibilities

| Consumer | Owns | Integration boundary |
| --- | --- | --- |
| App | Identity, entries, commands, window models, business logic and resource cleanup | Register an application config with the host's supported application API; use that host's lifecycle and window actions. |
| Theme/shell | Rendering, accessible controls, focus affordances, viewport/workarea and visual design | Render snapshots and dispatch supported actions. Core geometry does not prescribe a taskbar, dock, launcher or visual tokens. |
| Service module | Explicit service API, configuration, readiness, errors and teardown | Agree on service names, capability/version requirements and host lifecycle. |
| Kit | Reusable integration or UI tooling | Declare the target adapter and dependencies; do not silently assume another theme supplies them. |

Core's `desktop.services.provide/inject/has` stores values by name; injection can return undefined. It is a registry, not a version negotiator, permission boundary or dependency installer. Optional capabilities such as filesystems, persistence, authentication and network access must be checked by consumers and supplied by the host. See [src/Desktop.ts:149](../src/Desktop.ts#L149).

Portable headless logic may depend on this engine. UI components, shell contracts and framework module registration belong to their adapter. An iframe app additionally needs a documented host bridge, allowed message origins, protocol/version and capability expectations; embedding alone does not confer desktop integration.

## Compatibility and verification

Document the supported engine and adapter versions, required versus optional services, registration timing and resource cleanup for each integration. Test the behavior through the actual consuming adapter; common core machines do not establish complete Nuxt/React runtime parity.

A universal cross-framework extension loader, mandatory visual schema and automatic capability negotiation are not guarantees of this contract. New guarantees require an implemented API and consumer verification before being documented as current behavior. Public exports and build entry points are listed in [package.json](../package.json).
