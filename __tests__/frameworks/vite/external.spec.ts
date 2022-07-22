import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

import vue3base from '@vitejs/plugin-vue'
import compiler from '@vue/compiler-sfc'
import { createVuePlugin as vue2 } from 'vite-plugin-vue2'

import { vitePlugin } from '../../../src'
import { compile } from './util'

const vue3 = () => vue3base({
  compiler,
})

const baseDir = resolve(__dirname, '../..')

describe.each(['development', 'production'])('external ftl file support mode:%s', (mode) => {
  it('works with vue 3', async () => {
    // Arrange
    // Act
    const code = await compile({
      mode,
      plugins: [
        vue3(),
        vitePlugin({
          external: {
            baseDir: resolve(baseDir, 'fixtures'),
            ftlDir: resolve(baseDir, 'fixtures/ftl'),
            locales: ['en', 'da'],
          },
        }),
      ],
    }, '/fixtures/components/external.vue')

    // Assert
    expect(code).toMatchSnapshot()
  })

  it('works with vue 3 script setup', async () => {
    // Arrange
    // Act
    const code = await compile({
      mode,
      plugins: [
        vue3(),
        vitePlugin({
          external: {
            baseDir: resolve(baseDir, 'fixtures'),
            ftlDir: resolve(baseDir, 'fixtures/ftl'),
            locales: ['en', 'da'],
          },
        }),
      ],
    }, '/fixtures/components/external.setup.vue')

    // Assert
    expect(code).toMatchSnapshot()
  })

  it('works with vue 2', async () => {
    // Arrange
    // Act
    const code = await compile({
      mode,
      plugins: [
        vue2(),
        vitePlugin({
          external: {
            baseDir: resolve(baseDir, 'fixtures'),
            ftlDir: resolve(baseDir, 'fixtures/ftl'),
            locales: ['en', 'da'],
          },
        }),
      ],
    }, '/fixtures/components/external.vue')

    // Assert
    expect(code).toMatchSnapshot()
  })
})
