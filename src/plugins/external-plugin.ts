import { dirname, join, relative } from 'node:path'
import { stat as fsStat } from 'node:fs/promises'
import { createUnplugin } from 'unplugin'

import MagicString from 'magic-string'
import { createFilter, makeLegalIdentifier } from '@rollup/pluginutils'

import type { ExternalPluginOptions } from '../types'
import { isCustomBlock, parseVueRequest } from '../loader-query'
import { getSyntaxErrors } from './ftl/parse'

const isVue = createFilter(['**/*.vue'])
const isFtl = createFilter(['**/*.ftl'])

interface Dependency {
  locale: string
  ftlPath: string
  relativeFtlPath: string
  importVariable: string
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

export const unplugin = createUnplugin((options: ExternalPluginOptions) => {
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
      let relativeFtlPath = normalizePath(relative(dirname(id), ftlPath))
      if (!relativeFtlPath.startsWith('.'))
        relativeFtlPath = `./${relativeFtlPath}`

      if (ftlExists) {
        dependencies.push({
          locale,
          ftlPath,
          relativeFtlPath,
          importVariable: `${makeLegalIdentifier(locale)}_ftl`,
        })
      }
    }

    return dependencies
  }

  const isFluentCustomBlock = (id: string) => {
    const request = parseVueRequest(id)
    return isCustomBlock(request.query, { blockType: 'fluent' })
  }

  return {
    name: 'unplugin-fluent-vue-external',
    enforce: 'pre',
    resolveId(id, importer) {
      if (id === resolvedOptions.virtualModuleName)
        return `${id}?importer=${importer}`
    },
    loadInclude(id: string) {
      return id.startsWith(resolvedOptions.virtualModuleName)
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
      return isVue(id) || isFtl(id) || isFluentCustomBlock(id)
    },
    async transform(source: string, id: string) {
      if (isVue(id)) {
        const magic = new MagicString(source, { filename: id })

        const translations = await getTranslationsForFile(id)

        if (translations.length === 0)
          return

        for (const { relativeFtlPath, locale } of translations)
          magic.append(`<fluent locale="${locale}" src="${relativeFtlPath}"></fluent>\n`)

        return {
          code: magic.toString(),
          map: { mappings: '' },
        }
      }

      if (isFtl(id)) {
        if (options.checkSyntax) {
          const errorsText = getSyntaxErrors(source)
          if (errorsText)
            this.error(errorsText)
        }

        const magic = new MagicString(source, { filename: id })

        if (source.length > 0)
          magic.update(0, source.length, JSON.stringify(source))
        else
          magic.append('""')
        magic.prepend(`
import { FluentResource } from '@fluent/bundle'
export default /*#__PURE__*/ new FluentResource(`)
        magic.append(')\n')

        return {
          code: magic.toString(),
          map: magic.generateMap(),
        }
      }

      const query = parseVueRequest(id).query
      if (isFluentCustomBlock(id)) {
        if (options.checkSyntax) {
          const errorsText = getSyntaxErrors(source)
          if (errorsText)
            this.error(errorsText)
        }

        const magic = new MagicString(source, { filename: id })
        if (source.length > 0)
          magic.update(0, source.length, JSON.stringify(source))
        else
          magic.append('""')
        magic.prepend(`
import { FluentResource } from '@fluent/bundle'

export default function (Component) {
  const target = Component.options || Component
  target.fluent = target.fluent || {}
  target.fluent['${query.locale}'] = new FluentResource(`)
        magic.append(')\n}')

        return {
          code: magic.toString(),
          map: magic.generateMap(),
        }
      }

      return undefined
    },
  }
})

export const vitePlugin = unplugin.vite
export const rollupPlugin = unplugin.rollup
export const webpackPlugin = unplugin.webpack
