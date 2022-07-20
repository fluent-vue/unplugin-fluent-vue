import { defineConfig } from 'tsup'

export default defineConfig([{
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outDir: 'dist/',
  dts: true,
  splitting: true,
  clean: true,
  sourcemap: true,
  env: {
    NODE_ENV: 'development',
  },
},
{
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outDir: 'dist/prod',
  splitting: true,
  env: {
    NODE_ENV: 'production',
  },
  sourcemap: true,
  minify: true,
}])
