import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/webpack.ts',
    './src/vite.ts',
    './src/rollup.ts',
    './src/nuxt.ts',
  ],
  format: ['esm', 'cjs'],
  outDir: 'dist/',
  dts: true,
  splitting: true,
  clean: true,
  sourcemap: true,
})
