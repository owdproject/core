import { createMachine, assign } from 'xstate'

export const windowMachine = createMachine({
  id: 'window',
  initial: 'normal',
  context: ({ input }: { input?: { config?: any } }) => ({
    wasMaximized: false,
    config: input?.config,
  }),
  states: {
    normal: {
      entry: assign({ wasMaximized: false }),
      initial: 'focused',
      states: {
        focused: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                DRAG_START: 'dragging',
                RESIZE_START: 'resizing',
              },
            },
            dragging: {
              on: {
                DRAG_END: 'idle',
                SNAP_DROP: 'idle',
              },
            },
            resizing: {
              on: {
                RESIZE_END: 'idle',
              },
            },
          },
          on: {
            BLUR: 'unfocused',
            MAXIMIZE: '#window.maximized.focused',
            MINIMIZE: '#window.minimized',
          },
        },
        unfocused: {
          on: {
            FOCUS: 'focused',
            MAXIMIZE: '#window.maximized.unfocused',
            MINIMIZE: '#window.minimized',
          },
        },
      },
      on: {
        DESTROY: 'closed',
      },
    },
    maximized: {
      entry: assign({ wasMaximized: true }),
      initial: 'focused',
      states: {
        focused: {
          on: {
            BLUR: 'unfocused',
            RESTORE: '#window.normal.focused',
            MINIMIZE: '#window.minimized',
          },
        },
        unfocused: {
          on: {
            FOCUS: 'focused',
            RESTORE: '#window.normal.unfocused',
            MINIMIZE: '#window.minimized',
          },
        },
      },
      on: {
        DESTROY: 'closed',
      },
    },
    minimized: {
      on: {
        RESTORE: [
          {
            target: 'maximized.focused',
            guard: ({ context }) => context.wasMaximized,
          },
          {
            target: 'normal.focused',
          },
        ],
        DESTROY: 'closed',
      },
    },
    closed: {
      type: 'final',
    },
  },
})

export type WindowMachine = typeof windowMachine
