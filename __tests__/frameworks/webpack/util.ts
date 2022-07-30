import path from 'path'
import type { SFCPluginOptions } from '../../../src/webpack'
import { SFCFluentPlugin } from '../../../src/webpack'
import webpack from 'webpack'
import { Volume, createFsFromVolume } from 'memfs'

import { VueLoaderPlugin } from 'vue-loader'

export async function compile(fixture: string, options: Partial<SFCPluginOptions> = {}, hot = false): Promise<webpack.Stats> {
  const compilation = webpack({
    context: path.resolve(__dirname, '../..'),
    entry: `./${fixture}`,
    externals: {
      'vue': 'Vue',
      '@fluent/bundle': 'FluentBundle',
    },
    output: {
      path: path.resolve(__dirname),
      filename: 'bundle.js',
    },
    mode: 'production',
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: require.resolve('vue-loader'),
        },
      ],
    },
    plugins: [
      new VueLoaderPlugin(),
      SFCFluentPlugin(options),
      ...(hot ? [new webpack.HotModuleReplacementPlugin()] : []),
    ],
  })

  compilation.outputFileSystem = createFsFromVolume(new Volume())
  compilation.outputFileSystem.join = path.join.bind(path)

  return await new Promise((resolve, reject) => {
    compilation.run((err, stats) => {
      if (err != null || stats == null)
        return reject(err)
      if (stats.hasErrors())
        return reject(stats.toJson().errors)

      resolve(stats)
    })
  })
}
