import { resolve, sep } from 'path'

import type { InlineConfig } from 'vite'
import { createServer } from 'vite'

const baseDir = resolve(__dirname, '../..')

export async function compile(options: InlineConfig, file: string): Promise<string | undefined> {
  const vite = await createServer({
    root: baseDir,
    ...options,
    plugins: [
      ...options.plugins,
      {
        name: 'externals',
        resolveId(id) {
          if (id === 'vue' || id === '@fluent/bundle')
            return id
        },
        load(id) {
          if (id === 'vue' || id === '@fluent/bundle')
            return 'export default {}'
        },
      },
    ],
  })

  const output = await vite.transformRequest(file)
  const code = output?.code

  // normalize paths
  return code?.replaceAll(baseDir.replaceAll(sep, '/'), '')
}
