import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index', 'src/machines/index', 'src/layout/index', 'src/managers/index', 'src/events/index', 'src/session/index', 'src/dom/index', 'src/types/index'],
  declaration: true,
  clean: true,
  failOnWarn: false,
})
