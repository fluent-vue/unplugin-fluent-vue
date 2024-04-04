import { addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import { ExternalFluentPlugin, SFCFluentPlugin, type SFCPluginOptions } from './vite'
import type { ExternalPluginOptionsFolder, ExternalPluginOptionsFunction } from './types'
import { directiveTransform } from './directive-transform'

interface NuxtFluentOptions {
  sfc?: SFCPluginOptions
  external?: Omit<ExternalPluginOptionsFolder, 'baseDir'> | ExternalPluginOptionsFunction
  /**
   * @default 't' v-t directive name for the directive transform
   */
  directiveName?: string
}

export default defineNuxtModule<NuxtFluentOptions>({
  meta: {
    name: 'fluent-vue',
  },
  setup(options, nuxt) {
    if (!options.sfc && !options.external) {
      console.error(`[fluent-vue/nuxt] You need to enable at least one of the fluent-vue plugins`)
      return
    }

    nuxt.options.vue.compilerOptions.directiveTransforms ??= {}
    nuxt.options.vue.compilerOptions.directiveTransforms[options.directiveName ?? 't'] = directiveTransform

    if (options.sfc)
      addVitePlugin(SFCFluentPlugin(options.sfc))

    if (options.external) {
      const externalOptions = {
        ...options.external,
        baseDir: nuxt.options.srcDir,
      }
      addVitePlugin(ExternalFluentPlugin(externalOptions))
    }
  },
})
