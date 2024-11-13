import type { VitePlugin } from 'unplugin'
import type { SFCPluginOptions } from '../types'

import MagicString from 'magic-string'
import { createUnplugin } from 'unplugin'
import { isCustomBlock, parseVueRequest } from '../loader-query'
import { getSyntaxErrors } from './ftl/parse'

export const unplugin = createUnplugin((options: SFCPluginOptions, meta) => {
  const resolvedOptions = {
    blockType: 'fluent',
    checkSyntax: true,
    ...options,
  }

  return {
    name: 'unplugin-fluent-vue-sfc',
    enforce: meta.framework === 'webpack' ? 'post' : undefined,
    transformInclude(id: string) {
      const { query } = parseVueRequest(id)
      return isCustomBlock(query, resolvedOptions)
    },
    async transform(source: string, id: string) {
      const { query } = parseVueRequest(id)

      if (isCustomBlock(query, resolvedOptions)) {
        const originalSource = source

        const magic = new MagicString(source, { filename: id })

        source = source.replace(/\r\n/g, '\n').trim()

        if (query.locale == null)
          this.error('Custom block does not have locale attribute')

        // I have no idea why webpack processes this file multiple times
        if (source.includes('FluentResource') || source.includes('unplugin-fluent-vue-sfc'))
          return source

        if (resolvedOptions.checkSyntax) {
          const errorsText = getSyntaxErrors(source)
          if (errorsText)
            this.error(errorsText)
        }

        if (originalSource.length > 0)
          magic.update(0, originalSource.length, JSON.stringify(source))
        else
          magic.append('""')

        magic.prepend(`
import { FluentResource } from '@fluent/bundle'

export default function (Component) {
  const target = Component.options || Component
  target.fluent = target.fluent || {}
  target.fluent['${query.locale}'] = new FluentResource(`)
        magic.append(')\n}\n')

        return {
          code: magic.toString(),
          map: magic.generateMap(),
        }
      }

      return undefined
    },
  }
})

export const vitePlugin = unplugin.vite as (options?: SFCPluginOptions) => VitePlugin
export const rollupPlugin = unplugin.rollup
export const webpackPlugin = unplugin.webpack
