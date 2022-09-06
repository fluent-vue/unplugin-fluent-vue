import type { Junk } from '@fluent/syntax'
import { columnOffset, lineOffset, parse } from '@fluent/syntax'

export function getSyntaxErrors(source: string): string | undefined {
  const parsed = parse(source, { withSpans: true })
  const junks = parsed.body.filter(x => x.type === 'Junk') as Junk[]
  const errors = junks.map(x => x.annotations).flat()
  if (errors.length > 0) {
    const errorsText = errors.map((x) => {
      const line = lineOffset(source, x.span.start) + 1
      const column = columnOffset(source, x.span.start) + 1
      return `    ${x.code}: ${x.message} (${line}:${column})`
    }).join('\n')

    return `Fluent parse errors:\n${errorsText}`
  }

  return undefined
}
