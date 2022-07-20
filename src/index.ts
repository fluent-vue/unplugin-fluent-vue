import type { UnpluginContextMeta } from 'unplugin'
import { createUnplugin } from 'unplugin'

import { parse } from '@vue/compiler-sfc'

import createDebug from 'debug'

import { getRaw, raiseError } from './utils'

const debug = createDebug('unplugin-fluent-vue')

export interface UserOptions {
  blockType: string
}

export interface VueQuery {
  vue?: boolean
  src?: boolean
  global?: boolean
  type?: 'script' | 'template' | 'style' | 'custom' | 'i18n'
  blockType?: string
  index?: number
  locale?: string
  raw?: boolean
  issuerPath?: string
}

function isCustomBlock(query: VueQuery, options: UserOptions): boolean {
  return (
    'vue' in query
    && (query.type === 'custom' // for vite (@vite-plugin-vue)
      || query.type === options.blockType // for webpack (vue-loader)
      || query.blockType === options.blockType) // for webpack (vue-loader)
  )
}

export function parseVueRequest(id: string) {
  const [filename, rawQuery] = id.split('?', 2)
  const params = new URLSearchParams(rawQuery)
  const ret: VueQuery = {}

  ret.vue = params.has('vue')
  ret.global = params.has('global')
  ret.src = params.has('src')
  if (params.has('type'))
    ret.type = params.get('type') as VueQuery['type']

  if (params.has('blockType'))
    ret.blockType = params.get('blockType')

  if (params.has('index'))
    ret.index = Number(params.get('index'))

  if (params.has('locale'))
    ret.locale = params.get('locale')

  if (params.has('issuerPath'))
    ret.issuerPath = params.get('issuerPath')

  return {
    filename,
    query: ret,
  }
}

async function getCode(
  source: string,
  filename: string,
  sourceMap: boolean,
  query: VueQuery,
  framework: UnpluginContextMeta['framework'] = 'vite',
): Promise<string> {
  const { index, issuerPath } = query
  if (!Number.isInteger(index))
    raiseError(`unexpected index: ${index}`)

  if (framework === 'webpack') {
    if (issuerPath) {
      // via `src=xxx` of SFC
      debug(`getCode (webpack) ${index} via issuerPath`, issuerPath)
      return await getRaw(filename)
    }
    else {
      const result = parse(await getRaw(filename), {
        sourceMap,
        filename,
      })
      const block = result.descriptor.customBlocks[index!]
      if (block) {
        const code = block.src ? await getRaw(block.src) : block.content
        debug(`getCode (webpack) ${index} from SFC`, code)
        return code
      }
      else {
        return source
      }
    }
  }
  else {
    return source
  }
}

export const unplugin = createUnplugin((options: Partial<UserOptions>, meta) => {
  const resolvedOptions: UserOptions = {
    ...options,
    blockType: 'fluent',
  }

  return {
    name: 'unplugin-fluent-vue',
    enforce: 'post',
    /*
    transformInclude (id: string) {
      const query = parseVueQuery(id)

      console.log('include', id, query, query.vue && query.blockType == options.blockType)

      return query.vue && query.blockType == options.blockType
    },
    */
    async transform(source: string, id: string) {
      const { filename, query } = parseVueRequest(id)

      if (isCustomBlock(query, resolvedOptions)) {
        const code = await getCode(source, filename, false, query, meta.framework)

        // vue-loader pads SFC file sections with newlines - trim those
        const data = code.replace(/^(\n|\r\n)+|(\n|\r\n)+$/g, '')

        const hotCode = meta.watchMode
          ? `
if (module.hot) {
  delete target._fluent
  if (typeof __VUE_HMR_RUNTIME__ !== 'undefined') {
    // Vue 3
    const id = target.__hmrId
    const api = __VUE_HMR_RUNTIME__
    api.reload(id, target)
  } else {
    // Vue 2
    // There is no proper api to access HMR for component from custom block
    // so use this magic
    delete target._Ctor
  }
}`
          : ''

        if (query.locale == null)
          this.error('Custom block does not have locale attribute')

        return `
import { FluentResource } from '@fluent/bundle'

export default function (Component) {
  const target = Component.options || Component
  target.fluent = target.fluent || {}
  target.fluent['${query.locale}'] = new FluentResource(\`${data}\`)
  ${hotCode}
}\n`
      }

      return undefined
    },
    /*
    resolveId (id: string) {
      const query = parseVueQuery(id)

      const fluentBlock = query.vue && query.blockType == options.blockType

      return fluentBlock ? id : null
    },
    load (id: string) {
      console.log(id)

      throw new Error('load')

      return 'export default {}'
    },
     */
  }
})

export const vitePlugin = unplugin.vite
export const rollupPlugin = unplugin.rollup
export const webpackPlugin = unplugin.webpack
export const esbuildPlugin = unplugin.esbuild
