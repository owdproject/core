import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  effectiveInstalledSets,
  sortCatalog,
  loadCatalog,
} from '../../cli/bin/lib/catalog.js'

const appA = { name: '@owdproject/app-a', shortName: 'app-a', kind: 'app', updatedAt: '2026-01-01' }
const appB = { name: '@owdproject/app-b', shortName: 'app-b', kind: 'app', updatedAt: '2026-06-01' }
const modX = { name: '@owdproject/module-x', shortName: 'module-x', kind: 'module', updatedAt: '2026-03-01' }

describe('effectiveInstalledSets', () => {
  it('merges pending add and remove into effective sets', () => {
    const config = { apps: ['@owdproject/app-a'], modules: [], theme: null }
    const pending = new Map([
      ['@owdproject/app-a', false],
      ['@owdproject/app-b', true],
      ['@owdproject/module-x', true],
    ])
    const effective = effectiveInstalledSets(config, pending, null)
    assert.deepEqual(effective.apps, ['@owdproject/app-b'])
    assert.deepEqual(effective.modules, ['@owdproject/module-x'])
  })
})

describe('sortCatalog installed with pending', () => {
  it('puts effectively installed entries first', () => {
    const config = { apps: ['@owdproject/app-a'], modules: [], theme: null }
    const pending = new Map([['@owdproject/app-b', true]])
    const effective = effectiveInstalledSets(config, pending, null)
    const sorted = sortCatalog([appB, appA, modX], 'installed', effective)
    assert.equal(sorted[0].shortName, 'app-b')
    assert.deepEqual(
      sorted.slice(1).map((e) => e.shortName).sort(),
      ['app-a', 'module-x'],
    )
  })

  it('sorts by name A-Z', () => {
    const sorted = sortCatalog([appB, appA, modX], 'name', null)
    assert.deepEqual(sorted.map((e) => e.shortName), ['app-a', 'app-b', 'module-x'])
  })
})

describe('loadCatalog filtering', () => {
  it('filters out entries containing -template in name or shortName', async () => {
    // Create a temporary directory structure for workspaceRoot
    const tempDir = path.join(process.cwd(), 'temp-test-workspace-' + Math.random().toString(36).slice(2))
    const desktopDir = path.join(tempDir, '.desktop')
    fs.mkdirSync(desktopDir, { recursive: true })

    const cacheData = {
      fetchedAt: Date.now(),
      entries: [
        {
          shortName: 'app-about',
          description: 'About application',
          stars: 5,
          htmlUrl: 'https://github.com/owdproject/app-about',
          pushedAt: '2026-06-28T22:00:00Z',
          updatedAt: '2026-06-28T22:00:00Z',
          org: 'owdproject',
          kind: 'app',
        },
        {
          shortName: 'app-template',
          description: 'Template application',
          stars: 1,
          htmlUrl: 'https://github.com/owdproject/app-template',
          pushedAt: '2026-06-28T22:00:00Z',
          updatedAt: '2026-06-28T22:00:00Z',
          org: 'owdproject',
          kind: 'app',
        },
        {
          shortName: 'module-template',
          description: 'Template module',
          stars: 2,
          htmlUrl: 'https://github.com/owdproject/module-template',
          pushedAt: '2026-06-28T22:00:00Z',
          updatedAt: '2026-06-28T22:00:00Z',
          org: 'owdproject',
          kind: 'module',
        },
        {
          shortName: 'module-todo',
          description: 'Todo list module',
          stars: 10,
          htmlUrl: 'https://github.com/owdproject/module-todo',
          pushedAt: '2026-06-28T22:00:00Z',
          updatedAt: '2026-06-28T22:00:00Z',
          org: 'owdproject',
          kind: 'module',
        }
      ]
    }

    fs.writeFileSync(
      path.join(desktopDir, 'catalog-cache.json'),
      JSON.stringify(cacheData, null, 2)
    )

    try {
      const result = await loadCatalog(tempDir, { catalogNewDays: 14 })
      const names = result.entries.map((e) => e.shortName)
      
      assert.ok(names.includes('app-about'), 'Should include app-about')
      assert.ok(names.includes('module-todo'), 'Should include module-todo')
      assert.ok(!names.includes('app-template'), 'Should not include app-template')
      assert.ok(!names.includes('module-template'), 'Should not include module-template')
    } finally {
      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })
})

