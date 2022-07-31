import { resolve, sep } from 'path'

import type { InlineConfig, ModuleNode } from 'vite'
import { createServer } from 'vite'

import { viteExternalsPlugin } from 'vite-plugin-externals'

const baseDir = resolve(__dirname, '../..')

export async function compile(options: InlineConfig, file: string): Promise<string | undefined> {
  const vite = await createServer({
    root: baseDir,
    ...options,
    plugins: [
      ...options.plugins,
      viteExternalsPlugin({
        'vue': 'Vue',
        '@fluent/bundle': 'FluentBundle',
      }),
    ],
  })

  await vite.transformRequest(file)

  const module = await vite.moduleGraph.getModuleByUrl(file)

  const getAllModules = (module: ModuleNode): ModuleNode[] => [module].concat([...module.importedModules.values()].flatMap(getAllModules))

  const modules = await Promise.all(getAllModules(module)
    .map(async module => ({
      transform: await vite.transformRequest(module.url),
      module,
    })))

  const code = modules
    .filter(module => module.transform)
    .filter(module => !module.module.url.includes('node_modules'))
    .map(module => `=== ${module.module.url} ===\n${module.transform.code}`).join('\n\n')

  // normalize paths
  return code?.replaceAll(baseDir.replaceAll(sep, '/'), '')
}
