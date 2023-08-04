import { describe, expect, it } from 'vitest'

import vue3 from '@vitejs/plugin-vue'

import compiler from '@vue/compiler-sfc'
import { SFCFluentPlugin } from '../../../src/vite'
import { compile } from './util'

describe('Vite SFC', () => {
  it('generates custom block code', async () => {
    // Arrange
    // Act
    const code = await compile({
      plugins: [
        vue3({
          compiler,
        }),
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
        vue3({
          compiler,
        }),
        SFCFluentPlugin({
          blockType: 'i18n',
        }),
      ],
    }, '/fixtures/blockType.vue')

    // Assert
    expect(code).toMatchSnapshot()
  })
})
