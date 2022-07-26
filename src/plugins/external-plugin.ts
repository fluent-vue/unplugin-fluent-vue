import { join, relative } from 'path'
import { stat as fsStat } from 'fs/promises'
import type { VitePlugin } from 'unplugin'
import { createUnplugin } from 'unplugin'

import MagicString from 'magic-string'
import { createFilter, makeLegalIdentifier } from '@rollup/pluginutils'

import type { ExternalPluginOptions, InsertInfo } from '../types'

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

async function fileExists(filename: string): Promise<boolean> {
  try {
    const stat = await fsStat(filename, { throwIfNoEntry: false } as any)
    return !!stat
  }
  catch {
    return false
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

export const unplugin = createUnplugin((options: ExternalPluginOptions) => {
  return {
    name: 'unplugin-fluent-vue-external',
    enforce: 'post',
    transformInclude(id: string) {
      return isVue(id) || isFtl(id)
    },
    async transform(source: string, id: string) {
      if (isVue(id)) {
        const magic = new MagicString(source, { filename: id })

        const { insertPos, target } = getInsertInfo(source)

        const relativePath = relative(options.baseDir, id)

        const dependencies: Dependency[] = []
        for (const locale of options.locales) {
          const ftlPath = normalizePath(join(options.ftlDir, locale, `${relativePath}.ftl`))
          const ftlExists = await fileExists(ftlPath)

          if (ftlExists) {
            this.addWatchFile(ftlPath)

            dependencies.push({
              locale,
              ftlPath,
              importVariable: `${makeLegalIdentifier(locale)}_ftl`,
            })
          }
        }

        for (const dep of dependencies)
          magic.prepend(`import ${dep.importVariable} from '${dep.ftlPath}';\n`)
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
