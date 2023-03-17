import { join, relative } from 'node:path'
import { stat as fsStat } from 'node:fs/promises'
import { createUnplugin } from 'unplugin'

import MagicString from 'magic-string'
import { createFilter, makeLegalIdentifier } from '@rollup/pluginutils'

import type { ExternalPluginOptions, InsertInfo } from '../types'
import { getSyntaxErrors } from './ftl/parse'

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

export const unplugin = createUnplugin((options: ExternalPluginOptions, meta) => {
  const resolvedOptions = {
    checkSyntax: true,
    virtualModuleName: 'virtual:ftl-for-file',
    getFtlPath: undefined as ((locale: string, vuePath: string) => string) | undefined,
    ...options,
  }

  if ('getFtlPath' in options) {
    resolvedOptions.getFtlPath = options.getFtlPath
  }
  else {
    resolvedOptions.getFtlPath = (locale: string, vuePath: string) => {
      return join(options.ftlDir, locale, `${relative(options.baseDir, vuePath)}.ftl`)
    }
  }

  const getTranslationsForFile = async (id: string) => {
    const dependencies: Dependency[] = []
    for (const locale of options.locales) {
      const ftlPath = normalizePath(resolvedOptions.getFtlPath(locale, id))
      const ftlExists = await fileExists(ftlPath)

      if (ftlExists) {
        dependencies.push({
          locale,
          ftlPath,
          importVariable: `${makeLegalIdentifier(locale)}_ftl`,
        })
      }
    }

    return dependencies
  }

  return {
    name: 'unplugin-fluent-vue-external',
    enforce: meta.framework === 'webpack' ? 'post' : undefined,
    resolveId(id, importer) {
      if (id === resolvedOptions.virtualModuleName)
        return `${id}?importer=${importer}`
    },
    async load(id) {
      if (!id.startsWith(resolvedOptions.virtualModuleName))
        return

      const importer = id.split('?importer=')[1]

      const translations = await getTranslationsForFile(importer)

      for (const { ftlPath } of translations)
        this.addWatchFile(ftlPath)

      let code = ''
      for (const { ftlPath, importVariable } of translations)
        code += `import ${importVariable} from '${ftlPath}';\n`

      code += `export default { ${translations
        .map(({ locale, importVariable }) => `'${locale}': ${importVariable}`)
        .join(', ')} }\n`

      return code
    },
    transformInclude(id: string) {
      return isVue(id) || isFtl(id)
    },
    async transform(source: string, id: string) {
      if (isVue(id)) {
        const magic = new MagicString(source, { filename: id })

        const { insertPos, target } = getInsertInfo(source)

        const translations = await getTranslationsForFile(id)

        if (translations.length === 0)
          return

        for (const { ftlPath } of translations)
          this.addWatchFile(ftlPath)

        for (const dep of translations)
          magic.prepend(`import ${dep.importVariable} from '${dep.ftlPath}';\n`)
        magic.appendLeft(insertPos, `${target}.fluent = ${target}.fluent || {};\n`)
        for (const dep of translations)
          magic.appendLeft(insertPos, `${target}.fluent['${dep.locale}'] = ${dep.importVariable}\n`)

        const __HOT_API__ = meta.framework === 'webpack' ? 'import.meta.webpackHot' : 'import.meta.hot'

        magic.appendLeft(insertPos, `
if (${__HOT_API__}) {
  ${__HOT_API__}.accept([${translations.map(dep => `'${dep.ftlPath}'`).join(', ')}], () => {
    ${translations.map(({ locale, importVariable }) => `${target}.fluent['${locale}'] = ${importVariable}`).join('\n')}

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
        if (options.checkSyntax) {
          const errorsText = getSyntaxErrors(source)
          if (errorsText)
            this.error(errorsText)
        }

        return `
import { FluentResource } from '@fluent/bundle'
export default new FluentResource(${JSON.stringify(source)})
`
      }

      return undefined
    },
  }
})

export const vitePlugin = unplugin.vite
export const rollupPlugin = unplugin.rollup
export const webpackPlugin = unplugin.webpack
