interface ExternalPluginOptionsBase {
  locales: string[]
  checkSyntax?: boolean
  virtualModuleName?: string
}

export interface ExternalPluginOptionsFolder extends ExternalPluginOptionsBase {
  baseDir: string
  ftlDir: string
}

export interface ExternalPluginOptionsFunction extends ExternalPluginOptionsBase {
  getFtlPath: (locale: string, vuePath: string) => string
}

export type ExternalPluginOptions = ExternalPluginOptionsFolder | ExternalPluginOptionsFunction

export interface SFCPluginOptions {
  blockType?: string
  checkSyntax?: boolean
}
