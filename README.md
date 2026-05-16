# unplugin-fluent-vue

> [!IMPORTANT]
> **This repository has moved.** `unplugin-fluent-vue` is now developed as part of the [fluent-vue monorepo](https://github.com/fluent-vue/fluent-vue) at [`packages/unplugin-fluent-vue`](https://github.com/fluent-vue/fluent-vue/tree/main/packages/unplugin-fluent-vue).
>
> Please file new issues and pull requests there. This repository is archived and will no longer receive updates — the package on npm continues to be published from the new location under the same name.

[fluent-vue](https://github.com/fluent-vue/fluent-vue) plugin for Vite, Webpack and Rollup (thanks to [unplugin](https://github.com/unjs/unplugin)).

It adds support for defining Fluent messages in Vue SFCs and external ftl files.

## Installation

```bash
npm install unplugin-fluent-vue --save-dev
```

## Usage

### Vite

```ts
// vite.config.js
import {
  ExternalFluentPlugin,
  SFCFluentPlugin,
} from 'unplugin-fluent-vue/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    // Choose one of the following:
    SFCFluentPlugin({ // define messages in SFCs
      blockType: 'fluent', // default 'fluent' - name of the block in SFCs
      checkSyntax: true, // default true - whether to check syntax of the messages
      parseFtl: false, // default false - whether to parse ftl files during build
    }),
    ExternalFluentPlugin({ // define messages in external ftl files
      baseDir: path.resolve('src'), // required - base directory for Vue files
      ftlDir: path.resolve('src/locales'), // required - directory with ftl files
      locales: ['en', 'da'], // required - list of locales
      checkSyntax: true, // default true - whether to check syntax of the messages
      parseFtl: false, // default false - whether to parse ftl files during build
    }),
  ],
})
```

Docs: https://fluent-vue.demivan.me/integrations/unplugin.html
