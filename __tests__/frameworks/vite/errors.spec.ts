import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

import vue3base from '@vitejs/plugin-vue'
import compiler from '@vue/compiler-sfc'

import { ExternalFluentPlugin, SFCFluentPlugin } from '../../../src/vite'
import { compile } from './util'

const vue3 = () => vue3base({
  compiler,
})

const baseDir = resolve(__dirname, '../..')

describe('Error checking', () => {
  it('checks for syntax errors in external ftl files', async () => {
    // Arrange
    // Act
    const code = compile({
      plugins: [
        vue3(),
        ExternalFluentPlugin({
          baseDir: resolve(baseDir, 'fixtures'),
          ftlDir: resolve(baseDir, 'fixtures/ftl'),
          locales: ['en', 'da'],
          checkSyntax: true,
        }),
      ],
    }, '/fixtures/components/errors.vue')

    // Assert
    await expect(code).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Fluent parse errors:
          E0003: Expected token: \\"}\\" (2:31)
          E0010: Expected one of the variants to be marked as default (*) (9:3)"
    `)
  })

  it('checks for syntax errors in custom blocks', async () => {
    // Arrange
    // Act
    const code = compile({
      plugins: [
        vue3(),
        SFCFluentPlugin({
          checkSyntax: true,
        }),
      ],
    }, '/fixtures/errors.vue')

    // Assert
    await expect(code).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Fluent parse errors:
          E0003: Expected token: \\"}\\" (2:31)
          E0010: Expected one of the variants to be marked as default (*) (9:3)"
    `)
  })
})
