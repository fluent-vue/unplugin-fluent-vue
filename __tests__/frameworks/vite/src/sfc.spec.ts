import { describe, expect, it } from 'vitest'

import vue3base from '@vitejs/plugin-vue'
import compiler from '@vue/compiler-sfc'

import { SFCFluentPlugin } from '../../../../src/vite'
import { compile } from './util'

const vue3 = () => vue3base({
  compiler,
})

describe('Vite SFC', () => {
  it('generates custom block code', async () => {
    // Arrange
    // Act
    const code = await compile({
      plugins: [
        vue3(),
        SFCFluentPlugin(),
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
        SFCFluentPlugin({
          blockType: 'custom',
        }),
      ],
    }, '/fixtures/blockType.vue')

    // Assert
    expect(code).toMatchSnapshot()
  })
})
