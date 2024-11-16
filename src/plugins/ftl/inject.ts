import { FluentResource } from '@fluent/bundle'
import MagicString, { type SourceMap } from 'magic-string'
import { getSyntaxErrors } from './parse'

type InjectFtlFn = (template: TemplateStringsArray, locale?: string, source?: string) => { code?: { code: string, map: SourceMap }, error?: string }

function normalize(str: string) {
  return str.replace(/\r\n/g, '\n').trim()
}

export function getInjectFtl(options: { checkSyntax: boolean, parseFtl: boolean }): InjectFtlFn {
  return (template, locale, source) => {
    if (source == null) {
      source = locale
      locale = undefined
    }

    if (source == null)
      throw new Error('Missing source')

    if (options.checkSyntax) {
      const errorsText = getSyntaxErrors(source.replace(/\r\n/g, '\n').trim())

      if (errorsText) {
        return {
          error: errorsText,
        }
      }
    }

    const magic = new MagicString(source)
    const importString = options.parseFtl === true ? '' : '\nimport { FluentResource } from \'@fluent/bundle\'\n'
    const localeString = locale == null ? '' : locale

    if (source.length === 0) {
      magic.append('undefined')
    }
    else if (options.parseFtl === true) {
      const resource = new FluentResource(normalize(source))
      magic.overwrite(0, source.length, JSON.stringify(resource))
    }
    else {
      magic.overwrite(0, source.length, `new FluentResource(${JSON.stringify(normalize(source))})`)
    }

    magic.prepend(importString + template[0] + localeString + template[1])
    if (template[2] != null)
      magic.append(template[2])

    return {
      code: {
        code: magic.toString(),
        map: magic.generateMap(),
      },
    }
  }
}
