import type { VitePlugin } from 'unplugin'
import type { SFCPluginOptions } from '../types'

import { createUnplugin } from 'unplugin'

import { isCustomBlock, parseVueRequest } from '../loader-query'
import { getInjectFtl } from './ftl/inject'
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
      if (!isCustomBlock(query, resolvedOptions)) {
        return undefined
      }

      const locale = query.locale
      if (locale == null) {
        this.error('Custom block does not have locale attribute')
        return
      }

      // I have no idea why webpack processes this file multiple times
      if (source.includes('FluentResource') || source.includes('unplugin-fluent-vue-sfc') || source.includes('target.fluent'))
        return undefined

      if (resolvedOptions.checkSyntax) {
        const errorsText = getSyntaxErrors(source.replace(/\r\n/g, '\n').trim())
        if (errorsText)
          this.error(errorsText)
      }

      const injectFtl = getInjectFtl(resolvedOptions)

      const result = injectFtl`
export default function (Component) {
  const target = Component.options || Component
  target.fluent = target.fluent || {}
  target.fluent['${locale}'] = ${source}
}
`

      return {
        code: result.toString(),
        map: result.generateMap(),
      }
    },
  }
})

export const vitePlugin = unplugin.vite as (options?: SFCPluginOptions) => VitePlugin
export const rollupPlugin = unplugin.rollup
export const webpackPlugin = unplugin.webpack
