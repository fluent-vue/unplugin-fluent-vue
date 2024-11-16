import type { SFCPluginOptions } from 'src/types'

import { FluentResource } from '@fluent/bundle'
import MagicString from 'magic-string'

type InjectFtlFn = (template: TemplateStringsArray, locale?: string, source?: string) => MagicString

function normalize(str: string) {
  return str.replace(/\r\n/g, '\n').trim()
}

export function getInjectFtl(options: SFCPluginOptions): InjectFtlFn {
  return (template, locale, source) => {
    if (source == null) {
      source = locale
      locale = undefined
    }

    if (source == null)
      throw new Error('Missing source')

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

    return magic
  }
}
