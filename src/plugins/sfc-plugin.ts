import type { VitePlugin } from 'unplugin'
import type { SFCPluginOptions } from '../types'

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
        const data = source
          // vue-loader pads SFC file sections with newlines - trim those
          .replace(/^(\n|\r\n)+|(\n|\r\n)+$/g, '')
          // normalise newlines
          .replace(/\r\n/g, '\n')

        if (query.locale == null)
          this.error('Custom block does not have locale attribute')

        // I have no idea why webpack processes this file multiple times
        if (source.includes('FluentResource') || source.includes('unplugin-fluent-vue-sfc'))
          return source

        if (resolvedOptions.checkSyntax) {
          const errorsText = getSyntaxErrors(data)
          if (errorsText)
            this.error(errorsText)
        }

        return `
import { FluentResource } from '@fluent/bundle'

export default function (Component) {
  const target = Component.options || Component
  target.fluent = target.fluent || {}
  target.fluent['${query.locale}'] = new FluentResource(${JSON.stringify(data)})
}
`
      }

      return undefined
    },
  }
})

export const vitePlugin: (options?: SFCPluginOptions) => VitePlugin = unplugin.vite
export const rollupPlugin = unplugin.rollup
export const webpackPlugin = unplugin.webpack
