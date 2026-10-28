import { createMachine, assign } from 'xstate'

export const applicationMachine = createMachine({
  id: 'application',
  initial: 'idle',
  context: ({ input }: { input?: { id?: string; config?: any } }) => ({
    id: input?.id ?? '',
    config: input?.config,
    windowCount: 0,
  }),
  states: {
    idle: {
      on: {
        LAUNCH: 'initializing',
        RESTORE: 'initializing',
        OPEN_WINDOW: {
          target: 'running.active',
          actions: assign({
            windowCount: ({ context }) => context.windowCount + 1,
          }),
        },
      },
    },
    initializing: {
      on: {
        INITIALIZED: [
          {
            target: 'running.active',
            guard: ({ context }) => context.windowCount > 0,
          },
          {
            target: 'ready',
          },
        ],
        OPEN_WINDOW: {
          actions: assign({
            windowCount: ({ context }) => context.windowCount + 1,
          }),
        },
        INIT_FAILED: 'error',
      },
    },
    ready: {
      on: {
        LAUNCH: 'running.active',
        START_PROCESS: 'running.active',
        OPEN_WINDOW: {
          target: 'running.active',
          actions: assign({
            windowCount: ({ context }) => context.windowCount + 1,
          }),
        },
        CLOSE_APP: 'terminating',
      },
    },
    running: {
      initial: 'active',
      states: {
        active: {
          on: {
            MINIMIZE_ALL: 'suspended',
            SUSPEND: 'suspended',
            SIGSTOP: 'suspended',
            CLOSE_WINDOW: [
              {
                target: '#application.terminating',
                guard: ({ context }) => context.windowCount - 1 <= 0,
                actions: assign({
                  windowCount: () => 0,
                }),
              },
              {
                actions: assign({
                  windowCount: ({ context }) => Math.max(0, context.windowCount - 1),
                }),
              },
            ],
            OPEN_WINDOW: {
              actions: assign({
                windowCount: ({ context }) => context.windowCount + 1,
              }),
            },
          },
        },
        suspended: {
          on: {
            RESTORE_WINDOW: 'active',
            RESUME: 'active',
            SIGCONT: 'active',
            LAUNCH: 'active',
            OPEN_WINDOW: {
              target: 'active',
              actions: assign({
                windowCount: ({ context }) => context.windowCount + 1,
              }),
            },
            CLOSE_WINDOW: [
              {
                target: '#application.terminating',
                guard: ({ context }) => context.windowCount - 1 <= 0,
                actions: assign({
                  windowCount: () => 0,
                }),
              },
              {
                actions: assign({
                  windowCount: ({ context }) => Math.max(0, context.windowCount - 1),
                }),
              },
            ],
          },
        },
      },
      on: {
        CLOSE_APP: 'terminating',
        SIGTERM: 'terminating',
        SIGKILL: 'terminating',
      },
    },
    terminating: {
      entry: assign({
        windowCount: () => 0,
      }),
      on: {
        TERMINATED: 'ready',
      },
    },
    error: {
      on: {
        RESET: 'ready',
        LAUNCH: 'running.active',
        OPEN_WINDOW: {
          target: 'running.active',
          actions: assign({
            windowCount: ({ context }) => context.windowCount + 1,
          }),
        },
      },
    },
  },
})

export type ApplicationMachine = typeof applicationMachine
