import path from 'path'
import webpack from 'webpack'
import { Volume, createFsFromVolume } from 'memfs'

import { VueLoaderPlugin } from 'vue-loader'

import type { UserOptions } from '../../../src'
import { webpackPlugin } from '../../../src'

export async function compile(fixture: string, options: Partial<UserOptions> = {}, hot = false): Promise<webpack.Stats> {
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
          loader: 'vue-loader',
        },
      ],
    },
    plugins: [
      new VueLoaderPlugin(),
      webpackPlugin(options),
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
