import { describe, expect, it } from 'vitest'

import vue3base from '@vitejs/plugin-vue'
import compiler from '@vue/compiler-sfc'
import { createVuePlugin as vue2 } from 'vite-plugin-vue2'

import { vitePlugin } from '../../../src'
import { compile } from './util'

const vue3 = () => vue3base({
  compiler,
})

describe('vite plugin', () => {
  it('generates custom block code', async () => {
    // Arrange
    // Act
    const code = await compile({
      plugins: [
        vue3(),
        vitePlugin(),
      ],
    }, '/fixtures/test.vue')

    // Assert
    expect(code).toMatchSnapshot()
  })

  it('works with vue 2', async () => {
    // Arrange
    // Act
    const code = await compile({
      plugins: [
        vue2(),
        vitePlugin(),
      ],
    }, '/fixtures/test.vue')

    // Assert
    expect(code).toMatchSnapshot()
  })

  it('supports custom blockType', async () => {
    // Arrange
    // Act
    const code = await compile({
      plugins: [
        vue3(),
        vitePlugin({
          blockType: 'custom',
        }),
      ],
    }, '/fixtures/blockType.vue')

    // Assert
    expect(code).toMatchSnapshot()
  })
})
