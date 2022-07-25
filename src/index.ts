import { join, relative } from 'path'
import { stat as fsStat } from 'fs/promises'
import type { UnpluginContextMeta, VitePlugin } from 'unplugin'
import { createUnplugin } from 'unplugin'

import { parse } from '@vue/compiler-sfc'

import MagicString from 'magic-string'
import { createFilter, makeLegalIdentifier } from '@rollup/pluginutils'

import createDebug from 'debug'

import { getRaw, raiseError } from './utils'

const debug = createDebug('unplugin-fluent-vue')

export interface UserOptions {
  blockType?: string
  external?: {
    baseDir: string
    ftlDir: string
    locales: string[]
  }
}

export interface VueQuery {
  vue?: boolean
  type?: 'script' | 'template' | 'style' | 'custom' | 'fluent'
  blockType?: string
  index?: number
  locale?: string
}

function isCustomBlock(query: VueQuery, options: UserOptions): boolean {
  return (
    'vue' in query
    && (query.type === 'custom' // for vite (@vite-plugin-vue)
      || query.type === options.blockType // for webpack (vue-loader)
      || query.blockType === options.blockType) // for webpack (vue-loader)
  )
}

interface InsertInfo {
  insertPos: number
  target: string
}

function getInsertInfo(source: string): InsertInfo {
  let target = null

  // vite-plugin-vue2
  if (source.includes('__component__'))
    target = '__component__'

  // rollup-plugin-vue
  if (source.includes('export default script'))
    target = 'script'

  // @vitejs/plugin-vue
  if (source.includes('_sfc_main'))
    target = '_sfc_main'

  // vue-loader
  if (source.includes('__exports__'))
    target = '__exports__'

  const insertPos = source.indexOf('export default')

  if (insertPos === -1 || target === null)
    throw new Error('Could not parse vue component. This is the issue with unplugin-fluent-vue.\nPlease report this issue to the unplugin-fluent-vue repository.')

  return { insertPos, target }
}

export function parseVueRequest(id: string) {
  const [filename, rawQuery] = id.split('?', 2)
  const params = new URLSearchParams(rawQuery)
  const ret: VueQuery = {}

  ret.vue = params.has('vue')

  if (params.has('type'))
    ret.type = params.get('type') as VueQuery['type']

  if (params.has('blockType'))
    ret.blockType = params.get('blockType')

  if (params.has('index'))
    ret.index = Number(params.get('index'))

  if (params.has('locale'))
    ret.locale = params.get('locale')

  return {
    filename,
    query: ret,
  }
}

async function fileExists(filename: string): Promise<boolean> {
  try {
    const stat = await fsStat(filename, { throwIfNoEntry: false } as any)
    return !!stat
  }
  catch {
    return false
  }
}

async function getCode(
  source: string,
  filename: string,
  sourceMap: boolean,
  query: VueQuery,
  framework: UnpluginContextMeta['framework'] = 'vite',
): Promise<string> {
  const { index } = query
  if (!Number.isInteger(index))
    raiseError(`unexpected index: ${index}`)

  if (framework === 'webpack') {
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
  else {
    return source
  }
}

function normalizePath(path: string) {
  return path.replace(/\\/g, '/')
}

const isVue = createFilter(['**/*.vue'])
const isFtl = createFilter(['**/*.ftl'])

interface Dependency {
  locale: string
  ftlPath: string
  importVariable: string
}

export const unplugin = createUnplugin((options: UserOptions, meta) => {
  const resolvedOptions: Required<UserOptions> = {
    blockType: 'fluent',
    external: null,
    ...options,
  }

  return {
    name: 'unplugin-fluent-vue',
    enforce: 'post',
    transformInclude(id: string) {
      const { query } = parseVueRequest(id)

      return isVue(id) || isFtl(id) || isCustomBlock(query, resolvedOptions)
    },
    async transform(source: string, id: string) {
      const { filename, query } = parseVueRequest(id)

      if (isCustomBlock(query, resolvedOptions)) {
        const code = await getCode(source, filename, false, query, meta.framework)

        // vue-loader pads SFC file sections with newlines - trim those
        const data = code.replace(/^(\n|\r\n)+|(\n|\r\n)+$/g, '')

        if (query.locale == null)
          this.error('Custom block does not have locale attribute')

        return `
import { FluentResource } from '@fluent/bundle'

export default function (Component) {
  const target = Component.options || Component
  target.fluent = target.fluent || {}
  target.fluent['${query.locale}'] = new FluentResource(\`${data}\`)

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
  }
}
`
      }

      if (isVue(id) && resolvedOptions.external != null) {
        const magic = new MagicString(source, { filename: id })

        const { insertPos, target } = getInsertInfo(source)

        const external = resolvedOptions.external

        const relativePath = relative(external.baseDir, id)

        const dependencies: Dependency[] = []
        for (const locale of external.locales) {
          const ftlPath = normalizePath(join(external.ftlDir, locale, `${relativePath}.ftl`))
          const ftlExists = await fileExists(ftlPath)

          if (ftlExists) {
            this.addWatchFile(ftlPath)

            const importVariable = `${makeLegalIdentifier(locale)}_ftl`

            dependencies.push({
              locale,
              ftlPath,
              importVariable,
            })
            magic.prepend(`import ${importVariable} from '${ftlPath}';\n`)
          }
        }

        magic.appendLeft(insertPos, `${target}.fluent = ${target}.fluent || {};\n`)
        for (const dep of dependencies)
          magic.appendLeft(insertPos, `${target}.fluent['${dep.locale}'] = ${dep.importVariable}\n`)
        magic.appendLeft(insertPos, `
if (module.hot) {
  module.hot.accept([${dependencies.map(dep => `'${dep.ftlPath}'`).join(', ')}], () => {
    ${dependencies.map(({ locale, importVariable }) => `${target}.fluent['${locale}'] = ${importVariable}`).join('\n')}

    delete ${target}._fluent
    if (typeof __VUE_HMR_RUNTIME__ !== 'undefined') {
      // Vue 3
      __VUE_HMR_RUNTIME__.reload(${target}.__hmrId, ${target})
    } else {
      // Vue 2
      // There is no proper api to access HMR for component from custom block
      // so use this magic
      delete ${target}._Ctor
    }
  })
}
`)

        return {
          code: magic.toString(),
          map: magic.generateMap({ hires: true }),
        }
      }

      if (isFtl(id)) {
        return `
import { FluentResource } from '@fluent/bundle'
export default new FluentResource(${JSON.stringify(source)})
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
