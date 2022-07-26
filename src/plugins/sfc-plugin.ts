import type { VitePlugin } from 'unplugin'
import { createUnplugin } from 'unplugin'

import type { SFCPluginOptions } from '../types'
import { isCustomBlock, parseVueRequest } from '../loader-query'

export const unplugin = createUnplugin((options: SFCPluginOptions) => {
  const resolvedOptions = {
    blockType: 'fluent',
    ...options,
  }

  return {
    name: 'unplugin-fluent-vue-sfc',
    enforce: 'post',
    transformInclude(id: string) {
      const { query } = parseVueRequest(id)
      return isCustomBlock(query, resolvedOptions)
    },
    async transform(source: string, id: string) {
      const { query } = parseVueRequest(id)

      if (isCustomBlock(query, resolvedOptions)) {
        // vue-loader pads SFC file sections with newlines - trim those
        const data = source.replace(/^(\n|\r\n)+|(\n|\r\n)+$/g, '')

        if (query.locale == null)
          this.error('Custom block does not have locale attribute')

        // I have no idea why webpack processes this file multiple times
        if (source.includes('FluentResource') || source.includes('unplugin-fluent-vue-sfc'))
          return source

        return `
import { FluentResource } from '@fluent/bundle'

export default function (Component) {
  const target = Component.options || Component
  target.fluent = target.fluent || {}
  target.fluent['${query.locale}'] = new FluentResource(\`${data}\`)
}
`
      }

      return undefined
    },
  }
})

export const vitePlugin: VitePlugin = unplugin.vite
export const rollupPlugin = unplugin.rollup
export const webpackPlugin = unplugin.webpack
export const esbuildPlugin = unplugin.esbuild
