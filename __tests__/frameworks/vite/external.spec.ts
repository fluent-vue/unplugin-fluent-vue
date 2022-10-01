import { relative, resolve } from 'path'
import { describe, expect, it } from 'vitest'

import vue3base from '@vitejs/plugin-vue'
import compiler from '@vue/compiler-sfc'

import { ExternalFluentPlugin } from '../../../src/vite'
import { compile } from './util'

const vue3 = () => vue3base({
  compiler,
})

const baseDir = resolve(__dirname, '../..')

describe('Vite external', () => {
  it('works', async () => {
    // Arrange
    // Act
    const code = await compile({
      plugins: [
        vue3(),
        ExternalFluentPlugin({
          baseDir: resolve(baseDir, 'fixtures'),
          ftlDir: resolve(baseDir, 'fixtures/ftl'),
          locales: ['en', 'da'],
        }),
      ],
    }, '/fixtures/components/external.vue')

    // Assert
    expect(code).toContain('external.vue.ftl')
    expect(code).toMatchSnapshot()
  })

  it('getFtlPath', async () => {
    // Arrange
    // Act
    const code = await compile({
      plugins: [
        vue3(),
        ExternalFluentPlugin({
          getFtlPath: (locale, vuePath) => {
            return `${baseDir}/fixtures/ftl/${locale}/${relative(resolve(baseDir, 'fixtures'), vuePath)}.ftl`
          },
          locales: ['en', 'da'],
        }),
      ],
    }, '/fixtures/components/external.vue')

    // Assert
    expect(code).toContain('external.vue.ftl')
    expect(code).toMatchSnapshot()
  })

  it('works with script setup', async () => {
    // Arrange
    // Act
    const code = await compile({
      plugins: [
        vue3(),
        ExternalFluentPlugin({
          baseDir: resolve(baseDir, 'fixtures'),
          ftlDir: resolve(baseDir, 'fixtures/ftl'),
          locales: ['en', 'da'],
        }),
      ],
    }, '/fixtures/components/external.setup.vue')

    // Assert
    expect(code).toContain('external.setup.vue.ftl')
    expect(code).toMatchSnapshot()
  })
})
