import type { SFCPluginOptions } from 'src/types'

import { FluentResource } from '@fluent/bundle'
import MagicString from 'magic-string'

type InjectFtlFn = (template: TemplateStringsArray, locale?: string, source?: string) => MagicString

export function getInjectFtl(options: SFCPluginOptions): InjectFtlFn {
  return (template, locale, source) => {
    if (source == null) {
      source = locale
      locale = undefined
    }

    if (source == null)
      throw new Error('Missing source')

    let magic = new MagicString(source)
    const importString = options.parseFtl === true ? '' : '\nimport { FluentResource } from \'@fluent/bundle\'\n'
    const localeString = locale == null ? '' : locale

    if (options.parseFtl === true) {
      const resource = new FluentResource(source)
      magic.overwrite(0, source.length, JSON.stringify(resource))
    }
    else {
      // Escape string
      magic.replace(/"/g, '\\"')
      magic.replace(/\n/g, '\\n')
      magic = magic.snip(1, -1)
      magic.prepend('new FluentResource("')
      magic.append('")')
    }

    magic.prepend(importString + template[0] + localeString + template[1])
    if (template[2] != null)
      magic.append(template[2])

    return magic
  }
}
